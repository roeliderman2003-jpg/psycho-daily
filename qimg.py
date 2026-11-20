# חיתוך תמונה לכל שאלה ולכל קטע (קריאה / תרשים) מקובצי מאל״ו, לתיקייה מקומית (לא ב-git).
# הקבצים של מאל״ו ב-content/pdfs (מחוץ ל-git). הרצה: python qimg.py [exam_id ...], ואז node seal.js
import pymupdf as fitz, json, re, glob, os, sys, io
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
EX = os.path.join(ROOT, 'content', 'exams')
PDF = os.path.join(ROOT, 'content', 'pdfs')
OUT = os.path.join(ROOT, 'content', 'qimg')
TOP, BOT, X0, X1, ZOOM = 72, 786, 42, 556, 2.5
UNIT = ('reading', 'chart')
OPT = (')1(', ')2(', ')3(', ')4(', '(1)', '(2)', '(3)', '(4)')


def colmarks(d, c, fp):
    """המיקום של כל מספר שאלה לפי הצורה ולא לפי הטקסט: קטע מודגש בעמודת המספרים (x 505-527).
    בחלק מהקבצים הספרות מקודדות בגופן שלא נקרא (למשל «4.» יוצא כשורות ריקות), ולכן חיפוש טקסט מפספס אותן.
    מתעלמים מדף הנוסחאות ומכל מה שלפני הכותרת של הסוג הראשון בפרק (דף הוראות)."""
    H = headers(d, c); secs = c.get('sections') or []
    first = H.get(secs[0]['from']) if secs else None
    out = []
    for p in range(c['page'], c['endPage'] + 1):
        if p == fp: continue
        ys = []
        for b in d[p - 1].get_text('dict')['blocks']:
            for l in b.get('lines', []):
                for s in l['spans']:
                    x0, y0, x1, y1 = s['bbox']
                    if 'Bold' in s['font'] and 505 <= x0 <= 522 and 519 <= x1 <= 527 and TOP - 20 <= y0 < BOT and 8 < y1 - y0 < 22:
                        if not any(abs(y0 - y) < 4 for y in ys): ys.append(y0)
        out += [(p, y) for y in sorted(ys) if not first or (p, y) > first]
    return out


def marks(d, c, fp=None):
    """y (top) של כל מספר שאלה בפרק. קודם לפי הצורה (colmarks), ובודקים שהיא מסכימה עם כל מספר שנקרא כטקסט."""
    T = text_marks(d, c)
    C = colmarks(d, c, fp)
    if len(C) == c['questions'] and all(C[n - 1][0] == T[n][0] and abs(C[n - 1][1] - T[n][1]) < 4 for n in T):
        return {n: C[n - 1] for n in range(1, c['questions'] + 1)}
    return T


def text_marks(d, c):
    """y (top) של כל מספר שאלה שנקרא כטקסט («.N» בעמודת המספרים, ואחריו בעמוד תשובה «(1)»)."""
    found, nxt = {}, 1
    for p in range(c['page'], c['endPage'] + 1):
        ws = d[p - 1].get_text('words')
        opts = [w[1] for w in ws if w[4] in (')1(', '(1)')]
        cand = sorted([w for w in ws if (re.fullmatch(r'\.(\d+)', w[4]) or re.fullmatch(r'(\d+)\.', w[4])) and 490 < w[0] < 530 and any(y > w[1] for y in opts)], key=lambda w: w[1])
        for w in cand:
            n = int(re.search(r'\d+', w[4]).group())
            if nxt <= n <= c['questions'] and n - nxt <= 4:
                found[n] = (p, w[1]); nxt = n + 1
    return found


def headers(d, c):
    """כותרת של כל סוג שאלות בפרק, למשל «(שאלות 7-17)» → {from: (page, y)}"""
    out = {}
    for s in c.get('sections') or []:
        pat = re.compile(r'(^|\D)%d-%d(\D|$)' % (s['to'], s['from']))
        for p in range(c['page'], c['endPage'] + 1):
            hit = [w for w in d[p - 1].get_text('words') if pat.search(w[4]) and w[1] < BOT]
            if hit: out[s['from']] = (p, min(w[1] for w in hit)); break
    return out


def rule_below(pg, y):
    """הקו האופקי הרחב (x 71-524) שמאל״ו מציירים בסוף כל שאלה. מתחתיו יכולות לבוא הוראות לסוג הבא,
    שהטקסט שלהן לפעמים לא נקרא (ולכן headers() לא מוצא אותן). 9999 = אין קו."""
    ys = []
    for dr in pg.get_drawings():
        for it in dr['items']:
            if it[0] == 'l' and abs(it[1].y - it[2].y) < 1 and abs(it[1].x - it[2].x) > 400: ys.append(it[1].y)
            elif it[0] == 're' and it[1].width > 400 and it[1].height < 3: ys.append(it[1].y0)
    ys = [v for v in ys if y + 10 < v < BOT]
    return min(ys) if ys else 9999


def content_bottom(pg, y_from):
    ys = [w[3] for w in pg.get_text('words') if y_from <= w[1] < BOT]
    for dr in pg.get_drawings():
        r = dr['rect']
        if y_from <= r.y0 < BOT and r.height < 700: ys.append(min(r.y1, BOT))
    for im in pg.get_image_info():
        r = fitz.Rect(im['bbox'])
        if y_from <= r.y0 < BOT: ys.append(min(r.y1, BOT))
    return max(ys) if ys else y_from


def content_top(pg):
    ys = [w[1] for w in pg.get_text('words') if TOP <= w[1] < BOT]
    return min(ys) if ys else TOP


def shot(d, segs, rule=False):
    """segs: [(page, y0, y1)] → תמונה אחת אפורה, חתוכה לגבולות התוכן (בלי שוליים ריקים),
    כדי שבאפליקציה הטקסט יוצג גדול ככל האפשר. rule: למחוק את קו ההפרדה שמתחת לשאלה."""
    ims = []
    for p, y0, y1 in segs:
        if y1 - y0 < 8: continue
        pix = d[p - 1].get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), clip=fitz.Rect(X0, max(0, y0 - 6), X1, y1 + 6), colorspace=fitz.csGRAY)
        im = Image.open(io.BytesIO(pix.tobytes('png'))).convert('L')
        if rule:  # קו אופקי ארוך בתחתית = קו ההפרדה בין שאלות
            px = im.load(); W, H = im.size
            for y in range(max(0, H - int(40 * ZOOM)), H):
                if sum(1 for x in range(0, W, 3) if px[x, y] < 140) > W / 3 * 0.55:
                    for x in range(W): px[x, y] = 255
        ims.append(im)
    if not ims: return None
    w = max(i.width for i in ims); h = sum(i.height for i in ims) + 16 * (len(ims) - 1)
    out = Image.new('L', (w, h), 255); y = 0
    for i in ims: out.paste(i, (0, y)); y += i.height + 16
    # גבולות התוכן: פיקסלים כהים בלבד (סימן המים של מאל״ו אפור בהיר ולא נספר)
    bb = out.point(lambda v: 255 if v < 170 else 0).getbbox()
    if bb:
        pad = int(6 * ZOOM)
        out = out.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(w, bb[2] + pad), min(h, bb[3] + pad)))
    out = out.quantize(colors=16, dither=Image.Dither.NONE)
    b = io.BytesIO(); out.save(b, 'PNG', optimize=True); return b.getvalue()


def run(eid):
    e = json.load(open(f'{EX}/{eid}.json', encoding='utf-8'))
    d = fitz.open(f'{PDF}/{eid}.pdf'); os.makedirs(f'{OUT}/{eid}', exist_ok=True)
    meta = {}; miss = []; bad = []
    for ci, c in enumerate(e['chapters']):
        M = marks(d, c, e.get('formulasPage')); qp = c['qpages']; H = headers(d, c)
        miss += [f'{ci}-{n}' for n in range(1, c['questions'] + 1) if n not in M]
        # העמוד של כל שאלה לפי המיקום שנמצא (בעבר שאלה שלא נמצאה קיבלה את העמוד של השכנה)
        c['qpages'] = qp = [M[n][0] if n in M else qp[n - 1] for n in range(1, c['questions'] + 1)]
        secs = c.get('sections') or []
        sec_of = lambda n: next((s for s in secs if s['from'] <= n <= s['to']), None)
        for n in range(1, c['questions'] + 1):
            s = sec_of(n)
            if n in M:
                p, y = M[n]
                nx = M.get(n + 1)
                cut = min([h[1] for h in H.values() if h[0] == p and h[1] > y + 5] or [9999])  # כותרת של סוג חדש באותו עמוד
                cut = min(cut, rule_below(d[p - 1], y) + 4)  # או הקו שבסוף השאלה (ה-+4 כדי ש-shot ימחק אותו)
                if nx and nx[0] == p: segs = [(p, y, min(nx[1], cut) - 2)]
                elif cut < 9999: segs = [(p, y, cut - 2)]
                else:
                    segs = [(p, y, content_bottom(d[p - 1], y))]
                    # השאלה ממשיכה לעמוד הבא (בלי קטע חדש באמצע)
                    if nx and nx[0] == p + 1 and s and sec_of(n + 1) is s:
                        t = content_top(d[p])
                        if nx[1] - t > 20: segs.append((p + 1, t, nx[1] - 2))
            else:  # המספר לא זוהה: כל העמוד
                p = qp[n - 1]; segs = [(p, content_top(d[p - 1]), content_bottom(d[p - 1], TOP))]
            # בדיקה: בתמונה של שאלה צריכות להיות כל 4 התשובות (כשהטקסט שלהן נקרא), ורק פעם אחת כל אחת
            seen = [re.sub(r'\D', '', w[4]) for p_, a, b in segs for w in d[p_ - 1].get_text('words') if w[4] in OPT and a - 2 <= w[1] <= b]
            if any(w[4] in OPT for p_, a, b in segs for w in d[p_ - 1].get_text('words') if a - 2 <= w[1] <= b) and sorted(seen) != ['1', '2', '3', '4']:
                bad.append(f'{ci}-{n}:{"".join(seen)}')
            open(f'{OUT}/{eid}/{ci}-{n}.png', 'wb').write(shot(d, segs, rule=True))
        # קטע קריאה / תרשים: מהעמוד שבו הוא מתחיל עד לפני השאלה הראשונה שלו
        for s in secs:
            if s['type'] not in UNIT: continue
            f = s['from']; pf, yf = M.get(f, (qp[f - 1], None))
            prev = M.get(f - 1)
            hd = H.get(f)
            start = hd[0] if hd else min(qp[f - 1], qp[f - 2] + 1 if f > 1 else c['page'])
            segs = []
            for p in range(start, pf + 1):
                pg = d[p - 1]
                y0 = hd[1] if hd and p == hd[0] else content_top(pg)
                y1 = (yf - 2) if (p == pf and yf) else content_bottom(pg, y0)
                if p == pf and not yf: y1 = content_bottom(pg, y0)
                if y1 - y0 > 20: segs.append((p, y0, y1))
            if not segs: segs = [(pf, content_top(d[pf - 1]), content_bottom(d[pf - 1], TOP))]
            open(f'{OUT}/{eid}/{ci}-s{f}.png', 'wb').write(shot(d, segs))
            meta[f'{ci}-s{f}'] = [list(x) for x in segs]
    # דף הנוסחאות של הבחינה: עד הכותרת של חלק השאלות, אם היא באותו עמוד
    fp = e.get('formulasPage')
    if fp:
        pg = d[fp - 1]; y0 = content_top(pg)
        hs = [h[1] for c in e['chapters'] for h in headers(d, c).values() if h[0] == fp]
        open(f'{OUT}/{eid}/f.png', 'wb').write(shot(d, [(fp, y0, (min(hs) - 4) if hs else content_bottom(pg, y0))]))
    # מעדכנים את qpages במפה (רק השדה הזה), כדי שגם «פתיחה בקובץ» תגיע לעמוד הנכון
    with open(f'{EX}/{eid}.json', 'w', encoding='utf-8', newline='\n') as fo:
        fo.write(json.dumps(e, ensure_ascii=False, indent=2) + '\n')
    if miss:
        raise SystemExit(f'{eid}: לא נמצא המספר של {miss}. השאלות האלה היו מוצגות כעמוד שלם. לבדוק ידנית לפני seal')
    if bad:
        print(f'{eid}: בדיקת תשובות בתמונה (פרק-שאלה:התשובות שנמצאו): {bad}')
    return meta


if __name__ == '__main__':
    ids = sys.argv[1:] or [os.path.basename(f)[:-5] for f in sorted(glob.glob(EX + '/*.json'))]
    for eid in ids:
        m = run(eid)
        print(eid, 'ok', sum(1 for _ in os.listdir(f'{OUT}/{eid}')), 'files')
