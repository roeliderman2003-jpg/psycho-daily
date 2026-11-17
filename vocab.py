# מאגר המילים: כל זוגות המילים מהאנלוגיות של 20 הבחינות הרשמיות של מאל״ו, עם פירוש לכל מילה שכדאי ללמוד.
# קלט:  content/pdfs/<id>.pdf (קובצי מאל״ו), content/exams/*.json (המפות), content/solutions/<id>.json (המפתח),
#        content/words/meanings.json (הפירושים שכתבנו: w, l רמה 0-2, m פירוש, x דוגמה, alt מובן נוסף).
# פלט:  content/words/analogies.json (כל השאלות), content/words/words.json (המילים ללימוד, לפי סדר עדיפות).
# הכל מחוץ ל-git. seal.js מצפין את words.json לתוך sol.js.
# הרצה: python vocab.py   ואז   node seal.js
# הטקסט באנלוגיות יוצא תקין מ-pymupdf (בשונה משאר הבחינה). את סדר המילים בשורה קובעים לפי x מימין לשמאל.
import json, os, re, sys, collections, unicodedata
import pymupdf

ROOT = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(ROOT, *a)
NQ = re.compile('[֑-ׇ]')
SEASON = {'winter': 4, 'autumn': 3, 'summer': 2, 'spring': 1}
order = lambda i: int(i.split('_')[1]) * 10 + SEASON.get(i.split('_')[0], 0)


def clean(s):
    s = unicodedata.normalize('NFD', s)                     # אותיות עם דגש מוכן (פּ, וּ) → אות + סימן, כדי שהניקוד יירד
    s = re.sub(r'\s+([֑-ׇ])', r'\1', s)          # ניקוד שנפרד ברווח
    s = re.sub(r'(^|\s)([֑-ׇ]+)(\S)', r'\1\3', s)
    s = NQ.sub('', s).replace('״', '"').replace('׳', "'")
    s = re.sub(r'^\d\(\s*\)\s*', '', s.strip())
    s = re.sub(r'^"\s*(.*?)\s*"\s*(!?)$', r'\1\2', s.strip())  # " בחפץ לב " → בחפץ לב
    s = re.sub(r"\s+([!?])", lambda mt: mt.group(1), s)
    s = re.sub(r'\s+', ' ', s).strip()
    # אות שנשארה לבד או אות לא סופית בסוף מילה: המילה נחתכה בחילוץ (רכ וּ ס → רכוס, לאל תּר → לאלתר)
    t = s.split(' ')
    i = 0
    while i < len(t) - 1:
        if re.fullmatch('[א-ת]+', t[i]) and re.fullmatch('[א-ת]+', t[i + 1]) and (len(t[i]) == 1 or len(t[i + 1]) == 1 or t[i][-1] in 'כמנפצ'):
            t[i:i + 2] = [t[i] + t[i + 1]]
        else:
            i += 1
    return ' '.join(t)


MIN_LEVEL = 2  # רועי 17/11: «תשאיר רק 269 הקשות». 1 מוסיף גם את המילים שכדאי לוודא (עוד 548)
# שורות שהחילוץ שבר (נבדק מול התמונה של השאלה)
FIX = {('winter_2024', 0, 5): ['פעלתן', 'לפעול']}


def lines_of(page):
    rows = {}
    for x0, y0, x1, y1, w, *_ in page.get_text('words'):
        rows.setdefault(round((y0 + y1) / 6), []).append((x1, w))
    return [' '.join(w for _, w in sorted(rows[k], key=lambda t: -t[0])) for k in sorted(rows)]


def extract():
    items = []
    for f in sorted(os.listdir(P('content', 'exams'))):
        e = json.load(open(P('content', 'exams', f), encoding='utf-8'))
        doc = pymupdf.open(P('content', 'pdfs', e['id'] + '.pdf'))
        sol = json.load(open(P('content', 'solutions', e['id'] + '.json'), encoding='utf-8'))
        for ci, ch in enumerate(e['chapters']):
            if ch['domain'] != 'verbal':
                continue
            an = next(s for s in ch['sections'] if s['type'] == 'analogy')
            L = []
            for p in range(ch['page'] - 1, ch['endPage']):
                L += lines_of(doc[p])
                if sum(':' in x for x in L) > 40:
                    break
            L = L[next(i for i, x in enumerate(L) if x.startswith('שימו לב')) + 1:]
            pairs = []
            for x in L:
                x = re.sub(r'^\.\d+\s*|^\)\d\(\s*|\s*-$', '', x.strip())
                x = re.sub(r'^\)\s*', '', x)
                x = re.sub(r'\d\($', '', x)
                if x.count(':') == 1:
                    pairs.append([clean(t) for t in x.split(':')])
            n = an['to'] - an['from'] + 1
            if len(pairs) < n * 5:
                sys.exit(f"{e['id']} פרק {ci + 1}: נמצאו {len(pairs)} זוגות, צריך {n * 5}")
            key = sol['chapters'][ci]['key']
            for q in range(n):
                g = pairs[q * 5:q * 5 + 5]
                g[0] = FIX.get((e['id'], ci, an['from'] + q), g[0])
                items.append({'exam': e['id'], 'title': e['title'], 'ch': ci, 'q': an['from'] + q,
                              'stem': g[0], 'opts': g[1:], 'key': int(key[an['from'] + q - 1])})
    return items


def main():
    os.makedirs(P('content', 'words'), exist_ok=True)
    items = extract()
    json.dump(items, open(P('content', 'words', 'analogies.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    occ = collections.OrderedDict()
    for it in items:
        st, right = ' : '.join(it['stem']), ' : '.join(it['opts'][it['key'] - 1])
        for pi, pr in enumerate([it['stem']] + it['opts']):
            for w in pr:
                occ.setdefault(w, []).append({'e': it['exam'], 't': it['title'], 'q': it['q'], 's': st, 'a': right, 'p': pi})
    mf = P('content', 'words', 'meanings.json')
    M = {m['w']: m for m in json.load(open(mf, encoding='utf-8'))} if os.path.exists(mf) else {}
    miss = [w for w in occ if w not in M]
    if miss:
        print(f'⚠️ {len(miss)} מילים בלי פירוש, למשל: {miss[:10]}')
    out = []
    for w, oc in occ.items():
        m = M.get(w)
        if not m or m.get('l', 0) < MIN_LEVEL or not m.get('m'):
            continue
        exams = sorted({o['e'] for o in oc}, key=order, reverse=True)
        oc = sorted(oc, key=lambda o: -order(o['e']))
        seen, uo = set(), []
        for o in oc:  # שאלה אחת פעם אחת
            k = (o['e'], o['q'])
            if k not in seen:
                seen.add(k); uo.append({k2: o[k2] for k2 in ('t', 's', 'a', 'p')})
        r = {'w': w, 'l': m['l'], 'm': m['m'], 'n': len(exams)}
        for k in ('x', 'alt'):
            if m.get(k):
                r[k] = m[k]
        r['o'] = uo[:4]
        r['_last'] = order(exams[0])
        out.append(r)
    out.sort(key=lambda r: (-r['n'], -r['l'], -r['_last']))
    for r in out:
        del r['_last']
    json.dump(out, open(P('content', 'words', 'words.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    c = collections.Counter(r['l'] for r in out)
    print(f"אנלוגיות: {len(items)} שאלות, {len(occ)} מילים שונות")
    print(f"ללימוד: {len(out)} (קשות {c[2]}, לוודא {c[1]}), מהן ב-2 בחינות ומעלה: {sum(r['n'] > 1 for r in out)}")


if __name__ == '__main__':
    main()
