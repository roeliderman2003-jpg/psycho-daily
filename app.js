'use strict';
// פרק ביום — תרגול יומי לפסיכומטרי הדו-תחומי (מדצמבר 2026).
// הפרקים ב-chapters.js (נבנה מ-content/src ע"י build.js). ההתקדמות נשמרת במכשיר (localStorage), עם גיבוי ידני בהגדרות.

const LS = 'pd1';
const S = (() => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } })();
S.res = S.res || {};        // chapId -> [attempt]  attempt = {at, ans[], t[], dur}
S.off = S.off || [];        // מבחנים רשמיים: {at, label, dom, n, ans[], key, dur}
S.fix = S.fix || {};        // "chapId:n" -> true כשהטעות תוקנה בתרגול טעויות
S.examDate = S.examDate || '2026-12-04';
S.wr = S.wr || [];         // מטלות כתיבה: {id, at, text, dur, chk[], gc, gl}
function save() { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { toast('השמירה במכשיר נכשלה'); } }

const CH = (window.CHAPTERS || []);
const byId = Object.fromEntries(CH.map(c => [c.id, c]));
const DOM = { verbal: 'מילולי', quant: 'כמותי' };
const TYPE_HE = { analogy: 'אנלוגיות', inference: 'הבנה והסקה', reading: 'הבנת הנקרא', problem: 'שאלות ובעיות', chart: 'הסקה מתרשים' };
const TOPIC_HE = {
  analogy: 'אנלוגיות', reading: 'הבנת הנקרא', passage: 'הבנת הנקרא', inference: 'הבנה והסקה', problem: 'שאלות ובעיות',
  logic: 'שאלות היגיון', short_text: 'טקסט קצר וטיעון', meaning: 'משמעות משפט', sentence: 'השלמת משפט',
  algebra: 'אלגברה', percent: 'אחוזים ויחסים', word: 'בעיות מילוליות', averages: 'ממוצעים', integers: 'מספרים שלמים',
  powers: 'חזקות ושורשים', geometry: 'גאומטריה', solids: 'גופים ונפחים', coordinates: 'מערכת צירים', probability: 'הסתברות וקומבינטוריקה',
  sequences: 'סדרות', defined_ops: 'פעולות מוגדרות', functions: 'פונקציות', chart: 'תרשימים',
};
// סדר הימים: מילולי, כמותי, מילולי, כמותי...
const ORDER = (() => {
  const v = CH.filter(c => c.domain === 'verbal').map(c => c.id).sort(), q = CH.filter(c => c.domain === 'quant').map(c => c.id).sort();
  const out = []; for (let i = 0; i < Math.max(v.length, q.length); i++) { if (v[i]) out.push(v[i]); if (q[i]) out.push(q[i]); }
  return out;
})();
// מבחנים רשמיים באתר מאל״ו (לא מועתקים לכאן — נפתחים מהאתר שלהם)
const NITE_PAGE = 'https://www.nite.org.il/two-domain-psychometric-entrance-test/preparation-1/#practice-tests';
const NITE_PDFS = [
  ['חורף 2025', 'https://www.nite.org.il/wp-content/uploads/2026/01/psychometric_winter_2025_acc.pdf'],
  ['סתיו 2025', 'https://www.nite.org.il/wp-content/uploads/2025/10/psychometric_autumn_2025_acc.pdf'],
  ['קיץ 2025', 'https://www.nite.org.il/wp-content/uploads/2025/08/psychometric_summer_2025_acc.pdf'],
  ['אביב 2024', 'https://www.nite.org.il/wp-content/uploads/2024/05/psychometric_spring_2024_acc.pdf'],
  ['אביב 2022', 'https://www.nite.org.il/wp-content/uploads/2022/05/psychometric_spring_2022_acc.pdf'],
];

let view = 'home', arg = null, tick = null;
const $app = document.getElementById('app');
// תשובה בלי אותיות עבריות (מספר, ביטוי, אחוז) מוצגת משמאל לימין, כדי ש-33⅓% לא יתהפך
const ot = o => /[א-ת]/.test(String(o).replace(/<[^>]+>/g, '')) ? o : `<span class="ltr">${o}</span>`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const mmss = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const fmtDate = t => new Date(t).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
function toast(m) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = m; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
function go(v, a) { view = v; arg = a ?? null; render(); scrollTo(0, 0); }

// ===== חישובים =====
const first = id => (S.res[id] || [])[0];
const correctOf = (c, a) => c.questions.reduce((k, q, i) => k + (a.ans[i] === q.answer ? 1 : 0), 0);
// הערכה גסה: אחוז תשובות נכונות → ציון כללי 200-800. מאל״ו לא מפרסם טבלה; זו הערכה לפי ניסיון מקובל (כ-64% ≈ 620, כ-80% ≈ 700).
const EST = [[0, 300], [0.25, 420], [0.4, 500], [0.5, 550], [0.6, 600], [0.7, 650], [0.8, 700], [0.9, 745], [1, 790]];
function est(p) { for (let i = 1; i < EST.length; i++) if (p <= EST[i][0]) { const [a, x] = EST[i - 1], [b, y] = EST[i]; return Math.round((x + (y - x) * (p - a) / (b - a)) / 5) * 5; } return 790; }
function done() { return ORDER.filter(id => first(id)); }
function todayId() { return ORDER.find(id => !first(id)) || null; }
function daysLeft() { const d = new Date(S.examDate + 'T08:00:00'); return Math.ceil((d - new Date()) / 864e5); }
function streak() {
  const days = new Set(); Object.values(S.res).forEach(a => a.forEach(x => days.add(dayKey(x.at)))); S.off.forEach(x => days.add(dayKey(x.at))); S.wr.forEach(x => days.add(dayKey(x.at)));
  let n = 0, t = Date.now(); if (!days.has(dayKey(t))) t -= 864e5;
  while (days.has(dayKey(t))) { n++; t -= 864e5; } return n;
}
// כל השאלות שנענו בניסיון הראשון: לפילוח
function answered() {
  const out = [];
  for (const id of done()) { const c = byId[id], a = first(id); c.questions.forEach((q, i) => out.push({ c, q, i, a: a.ans[i], t: a.t[i] || 0, ok: a.ans[i] === q.answer })); }
  return out;
}
function overall() {
  const A = answered(); const by = d => A.filter(x => x.c.domain === d);
  const v = by('verbal'), q = by('quant');
  const pv = v.length ? v.filter(x => x.ok).length / v.length : null, pq = q.length ? q.filter(x => x.ok).length / q.length : null;
  const p = pv != null && pq != null ? (pv + pq) / 2 : (pv ?? pq);
  return { pv, pq, p, n: A.length };
}

// ===== מסכים =====
function navBar() {
  const it = [['home', '🏠', 'היום'], ['all', '📚', 'פרקים'], ['stats', '📊', 'חוזקות'], ['fix', '🔁', 'טעויות'], ['write', '✍️', 'כתיבה'], ['off', '📄', 'רשמי']];
  return `<nav class="nav">${it.map(([v, ic, l]) => `<button class="${view === v ? 'on' : ''}" onclick="go('${v}')"><span class="ic">${ic}</span>${l}</button>`).join('')}</nav>`;
}
function render() {
  clearInterval(tick); tick = null;
  if (S.cur && view !== 'exam' && view !== 'offx' && view !== 'wx') { // פרק באמצע (רענון / חזרה לאפליקציה)
    view = { off: 'offx', wr: 'wx' }[S.cur.kind] || 'exam';
  }
  const f = { home, all, stats, fix, off, exam, result, review, offx, offres, settings, practice, write, wx, wres }[view] || home;
  $app.innerHTML = f();
  if (view === 'exam' || view === 'offx' || view === 'wx') startTick();
}

function chapRow(id) {
  const c = byId[id], a = first(id), n = c.questions.length;
  const right = a ? `<b>${correctOf(c, a)}/${n}</b> <span class="mut sm">${fmtDate(a.at)}</span>` : '<span class="mut sm">עוד לא נעשה</span>';
  return `<div class="it" onclick="${a ? `go('result',{id:'${id}',k:0})` : `startChap('${id}')`}"><span class="tag ${c.domain[0]}">${DOM[c.domain]}</span><div class="grow"><b>${esc(c.title)}</b><div class="mut sm">${n} שאלות · ${c.minutes} דקות</div></div><div>${right}</div></div>`;
}

function home() {
  const id = todayId(), dl = daysLeft(), o = overall(), st = streak();
  const doneToday = done().some(x => dayKey(first(x).at) === dayKey(Date.now()));
  let h = `<main><div class="card hero"><div class="mut sm">הפסיכומטרי הדו-תחומי · ${new Date(S.examDate).toLocaleDateString('he-IL')}</div>
    <div style="font-size:30px;font-weight:800;margin:4px 0">${dl > 0 ? `עוד ${dl} ימים` : dl === 0 ? 'הבחינה היום 💪' : 'הבחינה עברה'}</div>
    <div class="mut sm">מילולי 23 שאלות · כמותי 20 שאלות · 20 דקות לפרק</div></div>`;
  h += `<div class="kpis"><div class="kpi"><b>${done().length}</b><span>פרקים נעשו</span></div><div class="kpi"><b>${st}🔥</b><span>ימים ברצף</span></div><div class="kpi"><b>${o.p != null ? est(o.p) : '—'}</b><span>ציון משוער*</span></div></div>`;
  if (S.cur) h += `<button class="btn blue big" onclick="go('${{ off: 'offx', wr: 'wx' }[S.cur.kind] || 'exam'}')">⏱️ להמשיך את הפרק שבאמצע</button>`;
  if (id) {
    const c = byId[id];
    h += `<h2>${doneToday ? 'רוצה עוד אחד היום?' : 'פרק היום'}</h2><div class="card"><div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><span class="tag ${c.domain[0]}">${DOM[c.domain]}</span><b style="font-size:18px">${esc(c.title)}</b></div>
      <p class="mut sm" style="margin:4px 0 12px">${c.questions.length} שאלות · ${c.minutes} דקות · ${typesLine(c)}. אפשר לעבור בין השאלות ולשנות תשובה עד שהזמן נגמר, בדיוק כמו בבחינה.</p>
      <button class="btn big" onclick="startChap('${id}')">▶️ להתחיל (${c.minutes} דקות)</button></div>`;
  } else h += `<div class="card"><b>סיימת את כל הפרקים שיש כרגע 🎉</b><p class="mut sm">אפשר לעשות פרק רשמי מאתר מאל״ו בלשונית «רשמי», או לתרגל את הטעויות.</p></div>`;
  const last = done().slice(-3).reverse();
  h += writeCard();
  if (last.length) h += `<h2>אחרונים</h2><div class="card list">${last.map(chapRow).join('')}</div>`;
  h += `<p class="mut sm">* ציון משוער: הערכה גסה מאחוז התשובות הנכונות בכל הפרקים (מילולי וכמותי במשקל שווה). לא ציון רשמי. נקודת הפתיחה שלך: 620.</p>
    <button class="btn ghost" onclick="go('settings')">⚙️ הגדרות וגיבוי</button></main>` + navBar();
  return h;
}
function typesLine(c) { const t = []; c.questions.forEach(q => { if (!t.includes(q.type)) t.push(q.type); }); return t.map(x => TYPE_HE[x]).join(', '); }

function all() {
  return `<main><h1>📚 כל הפרקים</h1><p class="mut sm">הסדר הוא סדר הימים: מילולי וכמותי לסירוגין. אפשר לבחור כל פרק.</p><div class="card list">${ORDER.map(chapRow).join('')}</div></main>` + navBar();
}

// ===== פרק בזמן =====
function startChap(id) {
  const c = byId[id]; if (!c) return;
  if (S.cur && !confirm('יש פרק אחר באמצע. לוותר עליו ולהתחיל את זה?')) return;
  const n = c.questions.length;
  S.cur = { kind: 'chap', id, endAt: Date.now() + c.minutes * 60e3, start: Date.now(), ans: Array(n).fill(0), t: Array(n).fill(0), flag: Array(n).fill(0), i: 0, last: Date.now() };
  save(); go('exam');
}
function startTick() {
  const upd = () => {
    const X = S.cur; if (!X) return;
    const now = Date.now(), left = (X.endAt - now) / 1000;
    if (view === 'exam' && document.visibilityState === 'visible') X.t[X.i] = (X.t[X.i] || 0) + Math.min(5, (now - X.last) / 1000);
    X.last = now;
    const el = document.getElementById('tm'); if (el) { el.textContent = mmss(left); el.classList.toggle('warn', left < 120); }
    if (left <= 0) { toast('⏰ הזמן נגמר — הפרק הוגש'); X.kind === 'off' ? offDone() : X.kind === 'wr' ? wDone() : submit(true); return; }
    if (Math.round(now / 1000) % 5 === 0) save();
  };
  upd(); tick = setInterval(upd, 1000);
}
function stimHtml(c, q, openAll) {
  if (!q.stim) return '';
  const s = c.stims[q.stim]; if (!s) return '';
  if (s.kind === 'passage') {
    const ps = s.paras.map((p, i) => `<p><b class="pn">(${i + 1})</b>${p}</p>`).join('');
    return `<div class="stim ${openAll ? 'open' : ''}" id="stim"><div class="st"><span>📖 ${esc(s.title || 'קטע קריאה')}</span>${openAll ? '' : `<button class="icb" onclick="document.getElementById('stim').classList.toggle('open')">הגדלה</button>`}</div><div class="body">${ps}</div></div>`;
  }
  return `<div class="stim open"><div class="st"><span>📊 ${s.intro || ''}</span></div><div class="body">${s.html || ''}</div></div>`;
}
function qHtml(c, q) {
  const an = q.type === 'analogy';
  return `${q.fig ? `<div class="fig">${q.fig}</div>` : ''}<div class="stem ${an ? 'an' : ''}">${q.stem}</div>`;
}
function exam() {
  const X = S.cur, c = byId[X.id], q = c.questions[X.i], n = c.questions.length, left = (X.endAt - Date.now()) / 1000;
  const grid = c.questions.map((_, i) => `<button class="${X.ans[i] ? 'ans' : ''} ${i === X.i ? 'cur' : ''} ${X.flag[i] ? 'flag' : ''}" onclick="jump(${i})">${i + 1}</button>`).join('');
  const opts = q.options.map((o, k) => `<button class="opt ${X.ans[X.i] === k + 1 ? 'sel' : ''}" onclick="pick(${k + 1})"><span class="num">${k + 1}</span><span>${ot(o)}</span></button>`).join('');
  const nAns = X.ans.filter(Boolean).length;
  return `<div class="xtop"><span class="timer ${left < 120 ? 'warn' : ''}" id="tm">${mmss(left)}</span><span class="ttl">${esc(c.title)} · ${nAns}/${n} נענו</span>
    ${c.domain === 'quant' ? `<button class="icb" onclick="formulas()">נוסחאות</button>` : ''}<button class="icb ${X.flag[X.i] ? 'on' : ''}" onclick="flag()">🚩</button></div>
    <main><div class="grid">${grid}</div>${stimHtml(c, q)}<div class="qn">שאלה ${X.i + 1} מתוך ${n} · ${TYPE_HE[q.type]}</div>${qHtml(c, q)}<div class="opts">${opts}</div>
    <div class="xnav"><button class="btn ghost" ${X.i === 0 ? 'disabled' : ''} onclick="jump(${X.i - 1})">→ הקודמת</button>${X.i < n - 1 ? `<button class="btn blue" onclick="jump(${X.i + 1})">הבאה ←</button>` : `<button class="btn" onclick="submit()">הגשה ✓</button>`}</div>
    <button class="btn ghost" style="margin-top:22px" onclick="submit()">סיום והגשת הפרק</button>
    <p class="mut sm" style="text-align:center;margin-top:14px">טיפ מהבחינה: אין ניקוד שלילי — לא משאירים שאלה ריקה. נתקעת? מסמנים 🚩 ועוברים.</p>
    <p style="text-align:center"><button class="icb" onclick="quit()">לצאת בלי להגיש</button></p></main>`;
}
function quit() { if (!confirm('לצאת מהפרק? התשובות לא יישמרו, ואפשר להתחיל אותו מחדש.')) return; delete S.cur; save(); go('home'); }
function pick(k) { const X = S.cur; X.ans[X.i] = X.ans[X.i] === k ? 0 : k; save(); render(); }
function jump(i) { const X = S.cur, n = byId[X.id].questions.length; if (i < 0 || i >= n) return; X.i = i; save(); render(); scrollTo(0, 0); }
function flag() { const X = S.cur; X.flag[X.i] = X.flag[X.i] ? 0 : 1; save(); render(); }
function submit(auto) {
  const X = S.cur; if (!X) return; const c = byId[X.id];
  if (!auto) {
    const empty = X.ans.filter(a => !a).length, left = Math.round((X.endAt - Date.now()) / 60000);
    if (!confirm(empty ? `נשארו ${empty} שאלות בלי תשובה${left > 0 ? ` ועוד כ-${left} דקות` : ''}. להגיש בכל זאת?` : left > 0 ? `נשארו עוד כ-${left} דקות לבדיקה. להגיש?` : 'להגיש?')) return;
  }
  const at = { at: Date.now(), ans: X.ans.slice(), t: X.t.map(x => Math.round(x)), dur: Math.round((Math.min(Date.now(), X.endAt) - X.start) / 1000) };
  (S.res[X.id] = S.res[X.id] || []).push(at);
  const k = S.res[X.id].length - 1; delete S.cur; save(); go('result', { id: c.id, k });
}

function formulas() {
  const m = document.createElement('div'); m.className = 'modal'; m.onclick = e => { if (e.target === m) m.remove(); };
  m.innerHTML = `<div class="sheet fml"><h3>דף נוסחאות</h3>
  <b>אחוזים:</b> x% מ-A = A·x/100 · עלייה ב-p%: ×(1+p/100) · ירידה ב-p%: ×(1−p/100)<br>
  <b>ממוצע:</b> סכום ÷ מספר האיברים · סכום = ממוצע × מספר<br>
  <b>דרך, מהירות, זמן:</b> דרך = מהירות × זמן · באותו כיוון: הפרש מהירויות · זה לקראת זה: סכום מהירויות<br>
  <b>הספק:</b> עבודה = הספק × זמן · יחד: מחברים הספקים (1/a + 1/b)<br>
  <b>חזקות:</b> <span class="ltr">aᵐ·aⁿ = aᵐ⁺ⁿ · aᵐ/aⁿ = aᵐ⁻ⁿ · (aᵐ)ⁿ = aᵐⁿ · a⁰ = 1 · a⁻ⁿ = 1/aⁿ · a^(1/n) = ⁿ√a</span><br>
  <b>כפל מקוצר:</b> <span class="ltr">(a±b)² = a² ± 2ab + b² · a² − b² = (a+b)(a−b)</span><br>
  <b>קומבינטוריקה:</b> סידור n עצמים: n! · בחירה עם חשיבות לסדר: n·(n−1)·…·(n−k+1) · בלי חשיבות לסדר: מחלקים ב-k!<br>
  <b>הסתברות:</b> מקרים רצויים ÷ כל המקרים · שני מאורעות בלתי תלויים: מכפילים<br>
  <b>משולש:</b> סכום זוויות 180° · שטח = בסיס × גובה ÷ 2 · פיתגורס <span class="ltr">a² + b² = c²</span> · 30-60-90: צלעות <span class="ltr">1 : √3 : 2</span> · 45-45-90: <span class="ltr">1 : 1 : √2</span> · צלע במשולש קטנה מסכום שתי האחרות<br>
  <b>מצולע:</b> סכום זוויות פנימיות <span class="ltr">180°·(n−2)</span><br>
  <b>מרובעים:</b> מלבן a·b · טרפז (a+b)·h÷2 · מקבילית בסיס × גובה · מעוין: מכפלת אלכסונים ÷ 2<br>
  <b>מעגל:</b> היקף <span class="ltr">2πr</span> · שטח <span class="ltr">πr²</span> · גזרה בזווית α: חלק α/360 · זווית היקפית = חצי מהמרכזית על אותה קשת<br>
  <b>גופים:</b> תיבה a·b·c · קובייה a³ (אלכסון a√3) · גליל <span class="ltr">πr²h</span> · חרוט ופירמידה: שליש מבסיס × גובה · כדור <span class="ltr">4πr³/3</span><br>
  <b>ישר:</b> שיפוע <span class="ltr">m = (y₂−y₁)/(x₂−x₁)</span> · <span class="ltr">y = mx + b</span> · ישרים מקבילים: אותו שיפוע<br>
  <button class="btn blue" style="margin-top:14px" onclick="this.closest('.modal').remove()">סגירה</button></div>`;
  document.body.appendChild(m);
}

// ===== תוצאה ומעבר על תשובות =====
function breakdown(items, keyf, label) {
  const g = {}; items.forEach(x => { const k = keyf(x); if (!k) return; (g[k] = g[k] || { n: 0, ok: 0, t: 0 }); g[k].n++; g[k].ok += x.ok ? 1 : 0; g[k].t += x.t; });
  return Object.entries(g).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).map(([k, v]) => {
    const p = pct(v.ok, v.n); return `<div style="margin:10px 0"><div style="display:flex;justify-content:space-between;font-size:14px;gap:8px"><span>${esc(label(k))}</span><span><b>${v.ok}/${v.n}</b> <span class="mut sm">· ${Math.round(v.t / v.n)} שנ׳ לשאלה</span></span></div><div class="bar ${p < 50 ? 'low' : p < 75 ? 'mid' : ''}"><i style="width:${p}%"></i></div></div>`;
  }).join('');
}
function result() {
  const c = byId[arg.id], a = S.res[arg.id][arg.k], n = c.questions.length, r = correctOf(c, a), empty = a.ans.filter(x => !x).length;
  const items = c.questions.map((q, i) => ({ q, i, ok: a.ans[i] === q.answer, t: a.t[i] || 0 }));
  const grid = items.map(x => `<button class="${x.ok ? 'ok' : a.ans[x.i] ? 'bad' : 'skip'}" onclick="go('review',{id:'${c.id}',k:${arg.k},i:${x.i},only:0})">${x.i + 1}</button>`).join('');
  const slow = items.filter(x => x.t > 0).sort((a, b) => b.t - a.t).slice(0, 3);
  const avg = Math.round(a.dur / n);
  return `<main><div style="display:flex;gap:8px;align-items:center"><span class="tag ${c.domain[0]}">${DOM[c.domain]}</span><b>${esc(c.title)}</b>${arg.k ? '<span class="tag">ניסיון חוזר</span>' : ''}</div>
    <div class="big-score">${r}/${n}</div><div style="text-align:center" class="mut">${pct(r, n)}% נכון · ${mmss(a.dur)} דקות · ${avg} שנ׳ לשאלה בממוצע${empty ? ` · ${empty} בלי תשובה` : ''}</div>
    <div style="text-align:center;margin:8px 0 4px"><span class="tag">ציון משוער לפרק כזה: ${est(r / n)}*</span></div>
    <div class="grid">${grid}</div>
    <div class="row"><button class="btn" onclick="go('review',{id:'${c.id}',k:${arg.k},i:${items.findIndex(x => !x.ok) < 0 ? 0 : items.findIndex(x => !x.ok)},only:1})">🔍 לעבור על הטעויות (${n - r})</button></div>
    <button class="btn ghost" onclick="go('review',{id:'${c.id}',k:${arg.k},i:0,only:0})">לעבור על כל השאלות עם הפתרונות</button>
    <h2>לפי סוג שאלה</h2><div class="card">${breakdown(items, x => x.q.type, k => TYPE_HE[k])}</div>
    <h2>לפי נושא</h2><div class="card">${breakdown(items, x => x.q.topic, k => TOPIC_HE[k] || k)}</div>
    ${slow.length ? `<h2>איפה הלך הזמן</h2><div class="card">${slow.map(x => `<div class="it" style="display:flex;justify-content:space-between;padding:6px 0;cursor:pointer" onclick="go('review',{id:'${c.id}',k:${arg.k},i:${x.i},only:0})"><span>שאלה ${x.i + 1} · ${esc(x.q.skill || TYPE_HE[x.q.type])}</span><span>${mmss(x.t)} ${x.ok ? '✅' : '❌'}</span></div>`).join('')}<p class="mut sm">בבחינה יש כ-52 שניות לשאלה במילולי וכ-60 שניות בכמותי. שאלה שלקחה יותר מ-2 דקות כדאי לדלג עליה ולחזור בסוף.</p></div>` : ''}
    <div class="row" style="margin-top:18px"><button class="btn ghost" onclick="startChap('${c.id}')">לעשות שוב</button><button class="btn blue" onclick="go('home')">לדף הבית</button></div>
    <p class="mut sm">* הערכה גסה בלבד.</p></main>` + navBar();
}
function explainHtml(q, mine) {
  let h = `<div class="exp"><h4>✍️ הפתרון</h4>${q.explain}</div>`;
  if (q.fast) h += `<div class="exp"><h4>⚡ הדרך המהירה בבחינה</h4>${q.fast}</div>`;
  if (mine && mine !== q.answer && q.traps && q.traps[mine - 1]) h += `<div class="exp"><h4>🪤 למה ${mine} לא נכונה</h4>${q.traps[mine - 1]}</div>`;
  return h;
}
function optsReview(q, mine) {
  return q.options.map((o, k) => {
    const cls = k + 1 === q.answer ? 'ok' : k + 1 === mine ? 'bad' : '';
    const why = k + 1 !== q.answer && q.traps && q.traps[k] && k + 1 !== mine ? `<span class="why">${q.traps[k]}</span>` : '';
    return `<div class="opt ${cls}"><span class="num">${k + 1}</span><span>${ot(o)}${k + 1 === mine ? ' <b>← בחרת</b>' : ''}${why}</span></div>`;
  }).join('');
}
function review() {
  const c = byId[arg.id], a = S.res[arg.id][arg.k], qs = c.questions;
  const idx = qs.map((_, i) => i).filter(i => !arg.only || a.ans[i] !== qs[i].answer);
  if (!idx.length) return `<main><p>אין טעויות בפרק הזה 🎉</p><button class="btn" onclick="go('result',{id:'${c.id}',k:${arg.k}})">חזרה</button></main>`;
  let p = idx.indexOf(arg.i); if (p < 0) p = 0; const i = idx[p], q = qs[i], mine = a.ans[i];
  const grid = qs.map((x, j) => `<button class="${a.ans[j] === x.answer ? 'ok' : a.ans[j] ? 'bad' : 'skip'} ${j === i ? 'cur' : ''}" onclick="go('review',{id:'${c.id}',k:${arg.k},i:${j},only:0})">${j + 1}</button>`).join('');
  const nav = d => idx[p + d] != null ? `go('review',{id:'${c.id}',k:${arg.k},i:${idx[p + d]},only:${arg.only}})` : '';
  return `<div class="xtop"><button class="icb" onclick="go('result',{id:'${c.id}',k:${arg.k}})">→ לתוצאה</button><span class="ttl">${esc(c.title)} · ${arg.only ? `טעות ${p + 1} מתוך ${idx.length}` : 'מעבר על השאלות'}</span></div>
  <main><div class="grid">${grid}</div>${stimHtml(c, q, false)}
  <div class="qn">שאלה ${i + 1} · ${TYPE_HE[q.type]}${q.topic && TOPIC_HE[q.topic] !== TYPE_HE[q.type] ? ' · ' + esc(TOPIC_HE[q.topic] || q.topic) : ''}${q.skill ? ' · ' + esc(q.skill) : ''} · ${'●'.repeat(q.level || 1)}${'○'.repeat(3 - (q.level || 1))} · ${mmss(a.t[i] || 0)}</div>
  ${qHtml(c, q)}<div class="opts">${optsReview(q, mine)}</div>${!mine ? '<p class="mut"><b>לא ענית על השאלה הזו.</b> בבחינה תמיד מנחשים — אין ניקוד שלילי.</p>' : ''}${explainHtml(q, mine)}
  <div class="xnav"><button class="btn ghost" ${nav(-1) ? '' : 'disabled'} onclick="${nav(-1)}">→ הקודמת</button><button class="btn blue" ${nav(1) ? '' : 'disabled'} onclick="${nav(1)}">הבאה ←</button></div></main>`;
}

// ===== חוזקות וחולשות =====
function stats() {
  const A = answered(), o = overall();
  if (!A.length && !S.off.length) return `<main><h1>📊 חוזקות וחולשות</h1><div class="card"><p>אחרי הפרק הראשון יופיע כאן פילוח לפי סוג שאלה, נושא ומיומנות, וכמה זמן לוקחת לך כל שאלה.</p></div></main>` + navBar();
  const hist = done().map(id => { const c = byId[id], a = first(id); return { p: correctOf(c, a) / c.questions.length, d: c.domain[0], l: c.title }; })
    .concat(S.off.filter(x => x.key).map(x => ({ p: offCorrect(x) / x.n, d: 'o', l: x.label, at: x.at })));
  const skills = {}; A.forEach(x => { const k = x.q.skill; if (!k) return; (skills[k] = skills[k] || { n: 0, ok: 0, d: x.c.domain }); skills[k].n++; skills[k].ok += x.ok; });
  const weak = Object.entries(skills).filter(([, v]) => v.ok < v.n).sort((a, b) => (a[1].ok / a[1].n) - (b[1].ok / b[1].n) || b[1].n - a[1].n).slice(0, 8);
  const need = o.p != null && o.p < 0.8 ? `כדי להגיע ל-700 צריך בערך 80% נכון. עכשיו: ${Math.round(o.p * 100)}%.` : o.p != null ? 'את/ה בטווח של 700+. ממשיכים לשמור על הקצב.' : '';
  const dv = A.filter(x => x.c.domain === 'verbal'), dq = A.filter(x => x.c.domain === 'quant');
  return `<main><h1>📊 חוזקות וחולשות</h1>
  <div class="kpis"><div class="kpi"><b>${o.pv != null ? Math.round(o.pv * 100) + '%' : '—'}</b><span>מילולי</span></div><div class="kpi"><b>${o.pq != null ? Math.round(o.pq * 100) + '%' : '—'}</b><span>כמותי</span></div><div class="kpi"><b>${o.p != null ? est(o.p) : '—'}</b><span>ציון משוער*</span></div></div>
  <p class="mut sm">${need} מבוסס על הניסיון הראשון בכל פרק (${A.length} שאלות).</p>
  <h2>ההתקדמות</h2><div class="card"><div class="hist">${hist.map(x => `<i class="${x.d}" style="height:${Math.max(4, x.p * 100)}%" title="${esc(x.l)}: ${Math.round(x.p * 100)}%"></i>`).join('')}</div>
  <div class="legend"><span style="--c:var(--o)">מילולי</span><span style="--c:var(--b)">כמותי</span><span style="--c:#9b7bff">רשמי</span></div></div>
  ${weak.length ? `<h2>🎯 המיומנויות שהכי כדאי לחזק</h2><div class="card">${weak.map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line)"><span><span class="tag ${v.d[0]}">${DOM[v.d]}</span> ${esc(k)}</span><b>${v.ok}/${v.n}</b></div>`).join('')}<button class="btn blue" style="margin-top:12px" onclick="go('fix')">לתרגל את הטעויות</button></div>` : ''}
  ${dv.length ? `<h2>מילולי לפי סוג שאלה</h2><div class="card">${breakdown(dv, x => x.q.type, k => TYPE_HE[k])}</div><h2>מילולי לפי נושא</h2><div class="card">${breakdown(dv, x => x.q.topic, k => TOPIC_HE[k] || k)}</div>` : ''}
  ${dq.length ? `<h2>כמותי לפי סוג שאלה</h2><div class="card">${breakdown(dq, x => x.q.type, k => TYPE_HE[k])}</div><h2>כמותי לפי נושא</h2><div class="card">${breakdown(dq, x => x.q.topic, k => TOPIC_HE[k] || k)}</div>` : ''}
  <h2>לפי רמת קושי</h2><div class="card">${breakdown(A, x => String(x.q.level || 1), k => ['', 'קלות', 'בינוניות', 'קשות'][k])}</div>
  <p class="mut sm">* הערכה גסה בלבד.</p></main>` + navBar();
}

// ===== תרגול טעויות (בלי זמן, משוב מיידי) =====
function mistakes() {
  const out = [];
  for (const id of done()) { const c = byId[id], a = first(id); c.questions.forEach((q, i) => { if (a.ans[i] !== q.answer && !S.fix[`${id}:${i}`]) out.push({ id, i }); }); }
  return out;
}
function fix() {
  const M = mistakes(), fixed = Object.keys(S.fix).length;
  const byT = {}; M.forEach(m => { const q = byId[m.id].questions[m.i]; const k = `${byId[m.id].domain}|${q.type}`; byT[k] = (byT[k] || 0) + 1; });
  return `<main><h1>🔁 תרגול טעויות</h1><p class="mut">כל שאלה שטעית בה (או לא ענית) בפרק נשמרת כאן. פותרים שוב בלי זמן, ומקבלים מיד את הפתרון. שאלה שנפתרה נכון יוצאת מהרשימה.</p>
  <div class="kpis"><div class="kpi"><b>${M.length}</b><span>מחכות לתיקון</span></div><div class="kpi"><b>${fixed}</b><span>תוקנו</span></div><div class="kpi"><b>${done().length}</b><span>פרקים</span></div></div>
  ${M.length ? `<button class="btn big" onclick="go('practice',{n:0})">להתחיל (${M.length})</button>
  <div class="card">${Object.entries(byT).map(([k, n]) => { const [d, t] = k.split('|'); return `<div style="display:flex;justify-content:space-between;padding:6px 0"><span><span class="tag ${d[0]}">${DOM[d]}</span> ${TYPE_HE[t]}</span><b>${n}</b></div>`; }).join('')}</div>` : '<div class="card"><p>אין טעויות שמחכות 👏</p></div>'}
  </main>` + navBar();
}
let P = null; // מצב השאלה הנוכחית בתרגול טעויות
function practice() {
  const M = mistakes(); if (!M.length) return fix();
  const m = M[Math.min(arg.n || 0, M.length - 1)], c = byId[m.id], q = c.questions[m.i];
  if (!P || P.key !== `${m.id}:${m.i}`) P = { key: `${m.id}:${m.i}`, pick: 0 };
  const ans = P.pick;
  const opts = ans ? optsReview(q, ans) : q.options.map((o, k) => `<button class="opt" onclick="ppick(${k + 1})"><span class="num">${k + 1}</span><span>${ot(o)}</span></button>`).join('');
  return `<div class="xtop"><button class="icb" onclick="P=null;go('fix')">→ יציאה</button><span class="ttl">תרגול טעויות · נשארו ${M.length}</span></div>
  <main><div class="qn"><span class="tag ${c.domain[0]}">${DOM[c.domain]}</span> ${esc(c.title)} · שאלה ${m.i + 1} · ${TYPE_HE[q.type]}</div>${stimHtml(c, q, false)}${qHtml(c, q)}<div class="opts">${opts}</div>
  ${ans ? `<p style="font-weight:800;font-size:18px;color:${ans === q.answer ? 'var(--gd)' : 'var(--rd)'}">${ans === q.answer ? '✅ נכון! השאלה יוצאת מהרשימה.' : '❌ עוד לא. השאלה נשארת לפעם הבאה.'}</p>${explainHtml(q, ans)}
  <button class="btn blue big" style="margin-top:16px" onclick="P=null;go('practice',{n:${ans === q.answer ? 0 : (arg.n || 0) + 1}})">לשאלה הבאה</button>` : ''}</main>`;
}
function ppick(k) { const [id, i] = P.key.split(':'); P.pick = k; if (byId[id].questions[+i].answer === k) { S.fix[P.key] = true; save(); } render(); }

// ===== מבחנים רשמיים: PDF מאתר מאל״ו + טיימר + דף תשובות =====
const offCorrect = x => x.ans.reduce((k, a, i) => k + (x.key[i] && a === +x.key[i] ? 1 : 0), 0);
function off() {
  const rows = S.off.slice().reverse().map((x, j) => { const i = S.off.length - 1 - j; return `<div class="it" onclick="go('offres',{i:${i}})"><span class="tag ${x.dom[0]}">${DOM[x.dom]}</span><div class="grow"><b>${esc(x.label)}</b><div class="mut sm">${fmtDate(x.at)} · ${mmss(x.dur)}</div></div><div>${x.key ? `<b>${offCorrect(x)}/${x.n}</b>` : '<span class="mut sm">חסר מפתח</span>'}</div></div>`; }).join('');
  return `<main><h1>📄 פרקים רשמיים</h1>
  <div class="card"><p>מאל״ו מפרסמים באתר שלהם בחינות שהיו. פותחים את קובץ ה-PDF, בוחרים פרק מילולי או כמותי, ופותרים כאן עם טיימר ודף תשובות. בסוף מקלידים את מפתח התשובות שבסוף הקובץ, ומקבלים ציון.</p>
  <p class="mut sm">בבחינות עד נובמבר 2026 יש גם פרקי אנגלית. מדלגים עליהם, הם לא בבחינה שלך. את השאלות עצמן לא מעתיקים לכאן (זכויות יוצרים), ולכן אין פתרון מפורט לפרק רשמי.</p>
  <a class="btn ghost" style="text-decoration:none;margin-bottom:10px" href="${NITE_PAGE}" target="_blank" rel="noopener">כל הבחינות באתר מאל״ו ↗</a>
  ${NITE_PDFS.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener" style="display:inline-block;margin:4px 0 4px 10px;color:var(--b);font-weight:700">${l} ↗</a>`).join('')}</div>
  <h2>להתחיל פרק רשמי</h2><div class="card">
  <select class="txt" id="ol">${NITE_PDFS.map(([l]) => `<option>${l}</option>`).join('')}<option>בחינה אחרת</option></select>
  <input class="txt" id="oc" placeholder="איזה פרק? למשל: פרק 2" value="">
  <div class="seg" id="od"><button class="on" data-d="verbal" onclick="segPick(this)">מילולי · 23 שאלות</button><button data-d="quant" onclick="segPick(this)">כמותי · 20 שאלות</button></div>
  <button class="btn big" onclick="offStart()">▶️ להתחיל (20 דקות)</button></div>
  ${rows ? `<h2>פרקים רשמיים שנעשו</h2><div class="card list">${rows}</div>` : ''}</main>` + navBar();
}
function segPick(b) { b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }
function offStart() {
  const dom = document.querySelector('#od .on').dataset.d, n = dom === 'verbal' ? 23 : 20;
  const label = `${document.getElementById('ol').value}${document.getElementById('oc').value.trim() ? ' · ' + document.getElementById('oc').value.trim() : ''}`;
  if (S.cur && !confirm('יש פרק אחר באמצע. לוותר עליו?')) return;
  S.cur = { kind: 'off', label, dom, n, endAt: Date.now() + 20 * 60e3, start: Date.now(), ans: Array(n).fill(0), last: Date.now() };
  save(); go('offx');
}
function offx() {
  const X = S.cur, left = (X.endAt - Date.now()) / 1000;
  const rows = X.ans.map((a, i) => `<div class="bub"><b>${i + 1}</b>${[1, 2, 3, 4].map(k => `<button class="${a === k ? 'on' : ''}" onclick="obub(${i},${k})">${k}</button>`).join('')}</div>`).join('');
  return `<div class="xtop"><span class="timer ${left < 120 ? 'warn' : ''}" id="tm">${mmss(left)}</span><span class="ttl">${esc(X.label)} · ${DOM[X.dom]} · ${X.ans.filter(Boolean).length}/${X.n}</span>${X.dom === 'quant' ? `<button class="icb" onclick="formulas()">נוסחאות</button>` : ''}</div>
  <main><p class="mut sm">פתח/י את ה-PDF בחלון אחר וסמן/י כאן את התשובות.</p>${rows}<button class="btn" style="margin-top:18px" onclick="offDone(1)">סיום והגשה</button></main>`;
}
function obub(i, k) { const X = S.cur; X.ans[i] = X.ans[i] === k ? 0 : k; save(); const y = scrollY; render(); scrollTo(0, y); }
function offDone(ask) {
  const X = S.cur; if (!X) return;
  if (ask && !confirm('להגיש את דף התשובות?')) return;
  S.off.push({ at: Date.now(), label: X.label, dom: X.dom, n: X.n, ans: X.ans.slice(), key: '', dur: Math.round((Math.min(Date.now(), X.endAt) - X.start) / 1000) });
  delete S.cur; save(); go('offres', { i: S.off.length - 1 });
}
function offres() {
  const x = S.off[arg.i];
  const keyIn = `<div class="card"><b>מפתח התשובות</b><p class="mut sm">בסוף קובץ ה-PDF יש טבלת «תשובות נכונות». הקלד/י את ${x.n} התשובות של הפרק ברצף, בלי רווחים (למשל 3142…).</p>
    <input class="txt key" id="ok" inputmode="numeric" maxlength="${x.n}" value="${esc(x.key)}" placeholder="${'·'.repeat(x.n)}"><button class="btn blue" onclick="okey(${arg.i})">לבדוק</button></div>`;
  if (!x.key) return `<main><h1>${esc(x.label)}</h1><p class="mut">${DOM[x.dom]} · ${mmss(x.dur)} · ענית על ${x.ans.filter(Boolean).length}/${x.n}</p>${keyIn}</main>` + navBar();
  const r = offCorrect(x);
  const rows = x.ans.map((a, i) => `<div class="bub"><b>${i + 1}</b>${[1, 2, 3, 4].map(k => `<button class="${a === k ? (+x.key[i] === k ? 'ok' : 'bad') : ''} ${+x.key[i] === k && a !== k ? 'key' : ''}">${k}</button>`).join('')}</div>`).join('');
  return `<main><h1>${esc(x.label)}</h1><div class="big-score">${r}/${x.n}</div><div style="text-align:center" class="mut">${pct(r, x.n)}% · ${mmss(x.dur)} · ציון משוער לפרק כזה: ${est(r / x.n)}*</div>
  <p class="mut sm" style="margin-top:14px">ירוק = נכון · אדום = הטעות שלך · מסגרת ירוקה = התשובה הנכונה. את ההסברים לפרק רשמי מחפשים בספר הפתרונות באתר מאל״ו.</p>${rows}
  <details style="margin-top:14px"><summary class="mut">לתקן את המפתח</summary>${keyIn}</details>
  <button class="btn ghost" style="margin-top:14px" onclick="if(confirm('למחוק את הפרק הזה?')){S.off.splice(${arg.i},1);save();go('off')}">מחיקה</button></main>` + navBar();
}
function okey(i) {
  const v = (document.getElementById('ok').value || '').replace(/[^1-4]/g, '');
  if (v.length !== S.off[i].n) return toast(`צריך בדיוק ${S.off[i].n} ספרות בין 1 ל-4 (הוקלדו ${v.length})`);
  S.off[i].key = v; save(); render();
}

// ===== הגדרות וגיבוי =====
function settings() {
  return `<main><h1>⚙️ הגדרות</h1><div class="card"><b>תאריך הבחינה</b>
  <div class="seg">${[['2026-12-04', 'ו׳ 4.12'], ['2026-12-06', 'א׳ 6.12']].map(([d, l]) => `<button class="${S.examDate === d ? 'on' : ''}" onclick="S.examDate='${d}';save();render()">${l}</button>`).join('')}</div>
  <input class="txt" type="date" value="${S.examDate}" onchange="S.examDate=this.value;save();render()"></div>
  <div class="card"><b>גיבוי והעברה למכשיר אחר</b><p class="mut sm">ההתקדמות נשמרת בדפדפן של המכשיר הזה. כדי להעביר לטלפון אחר או למחשב: מעתיקים את הקוד ומדביקים אותו שם.</p>
  <button class="btn blue" onclick="exp()">העתקת קוד גיבוי</button><textarea class="txt" id="imp" rows="3" placeholder="להדביק כאן קוד גיבוי" style="margin-top:12px"></textarea><button class="btn ghost" onclick="imp()">טעינת גיבוי</button></div>
  <div class="card"><b>על האפליקציה</b><p class="mut sm">${CH.length} פרקים מקוריים במבנה הבחינה הדו-תחומית של מאל״ו מדצמבר 2026: מילולי 23 שאלות (אנלוגיות, הבנה והסקה, הבנת הנקרא) וכמותי 20 שאלות (שאלות ובעיות, הסקה מתרשים), 20 דקות לפרק. השאלות נכתבו במיוחד, לא מבחינות של מאל״ו. מוצר אישי, לא קשור למאל״ו.</p></div>
  <button class="btn ghost" onclick="go('home')">חזרה</button></main>` + navBar();
}
function exp() {
  const code = btoa(unescape(encodeURIComponent(JSON.stringify({ res: S.res, off: S.off, fix: S.fix, wr: S.wr, examDate: S.examDate }))));
  (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => toast('הקוד הועתק ✓'), () => { document.getElementById('imp').value = code; toast('הקוד מופיע בתיבה — להעתיק ידנית'); });
}
function imp() {
  try { const d = JSON.parse(decodeURIComponent(escape(atob(document.getElementById('imp').value.trim())))); if (!d.res) throw 0; if (!confirm('לטעון את הגיבוי? זה מחליף את ההתקדמות במכשיר הזה.')) return; Object.assign(S, d); save(); toast('נטען ✓'); go('home'); }
  catch (e) { toast('הקוד לא תקין'); }
}

// ===== מטלת כתיבה: 30 דקות, לפחות 25 שורות, נשפטת בתוכן ובלשון =====
const WR = (window.WRITING || []);
const wById = Object.fromEntries(WR.map(w => [w.id, w]));
const WORDS_PER_LINE = 10; // בדף התשובות של הבחינה בערך 10 מילים בשורה
const wWords = t => (String(t || '').trim().match(/\S+/g) || []).length;
const WCHK = [
  ['c', 'פתחתי בעמדה ברורה שעונה בדיוק על מה שנשאל'],
  ['c', 'הבאתי לפחות שני טיעונים שונים, כל אחד בפסקה משלו'],
  ['c', 'כל טיעון מוסבר ומגובה בדוגמה או בראיה'],
  ['c', 'הצגתי את העמדה הנגדית והתמודדתי איתה'],
  ['c', 'הסיום מסכם ומחזק את העמדה, ולא רק חוזר עליה'],
  ['l', 'משלב עיוני אחיד, בלי סלנג ובלי פנייה אישית לקורא'],
  ['l', 'מילות קישור מגוונות שמראות את הקשר בין הרעיונות (אולם, לפיכך, יתרה מזאת)'],
  ['l', 'חלוקה ברורה לפסקאות, ומשפטים שלמים שלא ארוכים מדי'],
  ['l', 'קראתי שוב בסוף ותיקנתי כתיב, התאמה ופיסוק'],
];
function nextWrite() { const done = new Set(S.wr.map(x => x.id)); return WR.find(w => !done.has(w.id)) || WR[0]; }
function writeCard() {
  if (!WR.length) return '';
  const last = S.wr[S.wr.length - 1], ago = last ? Math.floor((Date.now() - last.at) / 864e5) : null;
  const due = ago == null || ago >= 3;
  return `<h2>✍️ מטלת כתיבה</h2><div class="card"><p class="mut sm" style="margin-top:0">חלק מהציון המילולי. מומלץ פעמיים בשבוע. ${last ? `האחרונה: ${ago === 0 ? 'היום' : ago === 1 ? 'אתמול' : `לפני ${ago} ימים`}.` : 'עוד לא כתבת אף מטלה.'}</p>
    <button class="btn ${due ? '' : 'ghost'}" onclick="go('write')">${due ? 'לכתוב מטלה (30 דקות)' : 'למטלות הכתיבה'}</button></div>`;
}
function write() {
  const rows = S.wr.slice().reverse().map((x, j) => { const i = S.wr.length - 1 - j, w = wById[x.id]; return `<div class="it" onclick="go('wres',{i:${i}})"><div class="grow"><b>${esc(w ? w.title : x.id)}</b><div class="mut sm">${fmtDate(x.at)} · ${wWords(x.text)} מילים · ${mmss(x.dur)}</div></div><div class="sm">${x.gc ? `תוכן ${x.gc} · לשון ${x.gl}` : x.chk ? `בדיקה עצמית ${x.chk.filter(Boolean).length}/${WCHK.length}` : ''}</div></div>`; }).join('');
  const n = nextWrite();
  return `<main><h1>✍️ מטלת כתיבה</h1>
  <div class="card"><p style="margin-top:0">בבחינה: <b>30 דקות</b>, חיבור של <b>לפחות 25 שורות</b> בסגנון עיוני. שני מעריכים נותנים ציון בשני ממדים: <b>תוכן</b> (איכות הטיעונים וחשיבה ביקורתית) ו<b>לשון</b> (בהירות, משלב אחיד ודיוק). זה לא משנה איזו עמדה בוחרים, רק כמה טוב מנמקים אותה.</p>
  <p class="mut sm">המבנה שעובד: פתיחה עם עמדה → 2-3 טיעונים, כל אחד בפסקה עם דוגמה → העמדה הנגדית ותשובה לה → סיכום. 3-4 דקות לתכנון, 22 לכתיבה, 4 לקריאה חוזרת.</p></div>
  ${n ? `<button class="btn big" onclick="wStart('${n.id}')">▶️ מטלה הבאה: ${esc(n.title)}</button>` : ''}
  <h2>כל הנושאים</h2><div class="card list">${WR.map(w => { const d = S.wr.filter(x => x.id === w.id).length; return `<div class="it" onclick="wStart('${w.id}')"><div class="grow"><b>${esc(w.title)}</b></div><span class="mut sm">${d ? `✓ נכתבה${d > 1 ? ` ${d} פעמים` : ''}` : ''}</span></div>`; }).join('')}</div>
  ${rows ? `<h2>מה שכתבת</h2><div class="card list">${rows}</div>` : ''}</main>` + navBar();
}
function wStart(id) {
  if (S.cur && !confirm('יש פרק אחר באמצע. לוותר עליו?')) return;
  S.cur = { kind: 'wr', id, endAt: Date.now() + 30 * 60e3, start: Date.now(), text: '', last: Date.now() };
  save(); go('wx');
}
function wPrompt(w) {
  return `<div class="stim open"><div class="st"><span>📝 ${esc(w.title)}</span></div><div class="body">${w.background.map(p => `<p>${esc(p)}</p>`).join('')}<p><b>${esc(w.task)}</b></p></div></div>`;
}
function wCount(t) { const n = wWords(t), l = Math.ceil(n / WORDS_PER_LINE); return `${n} מילים · כ-${l} שורות ${l >= 25 ? '✅' : `(עוד כ-${25 - l} שורות למינימום)`}`; }
function wx() {
  const X = S.cur, w = wById[X.id], left = (X.endAt - Date.now()) / 1000;
  return `<div class="xtop"><span class="timer ${left < 300 ? 'warn' : ''}" id="tm">${mmss(left)}</span><span class="ttl">מטלת כתיבה</span><button class="icb" onclick="wDone(1)">הגשה</button></div>
  <main>${wPrompt(w)}
  <textarea id="wt" class="txt" style="min-height:52vh;line-height:1.8;font-size:16px;resize:vertical" placeholder="כותבים כאן. הטקסט נשמר כל הזמן, גם אם סוגרים את הדף." oninput="S.cur.text=this.value;document.getElementById('wc').textContent=wCount(this.value);save()">${esc(X.text)}</textarea>
  <div class="mut sm" id="wc">${wCount(X.text)}</div>
  <button class="btn" style="margin-top:14px" onclick="wDone(1)">סיום והגשה</button>
  <p style="text-align:center"><button class="icb" onclick="quit()">לצאת בלי לשמור</button></p></main>`;
}
function wDone(ask) {
  const X = S.cur; if (!X) return;
  const el = document.getElementById('wt'); if (el) X.text = el.value;
  if (ask && !confirm(Math.ceil(wWords(X.text) / WORDS_PER_LINE) < 25 ? 'החיבור קצר מ-25 שורות, ובבחינה זה פוגע בציון. להגיש בכל זאת?' : 'להגיש את החיבור?')) return;
  S.wr.push({ id: X.id, at: Date.now(), text: X.text, dur: Math.round((Math.min(Date.now(), X.endAt) - X.start) / 1000), chk: WCHK.map(() => 0) });
  delete S.cur; save(); go('wres', { i: S.wr.length - 1 });
}
function wScore(chk, d) { const idx = WCHK.map((c, i) => c[0] === d ? i : -1).filter(i => i >= 0); const k = idx.filter(i => chk[i]).length; return Math.max(1, Math.round(1 + 5 * k / idx.length)); }
function feedbackPrompt(x, w) {
  return `אתה מעריך מנוסה של מטלת הכתיבה בבחינה הפסיכומטרית של מאל״ו. הערך את החיבור שלמטה לפי שני הממדים הרשמיים, כל אחד בסולם 1-6:
- תוכן: עושר ואיכות הטיעונים, עמדה ברורה, דוגמאות, התמודדות עם עמדה נגדית, חשיבה ביקורתית וארגון.
- לשון: בהירות הניסוח, משלב עיוני אחיד, מילות קישור, תקינות לשונית (כתיב, התאמה, תחביר, פיסוק).
החיבור נכתב ב-30 דקות בבחינה, ולכן לא מצופה ממנו להיות מאמר מושלם. הדרישה: לפחות 25 שורות.

תחזיר בעברית:
1. ציון תוכן וציון לשון, עם נימוק קצר לכל אחד.
2. שלושה דברים טובים בחיבור.
3. שלושת השיפורים הכי חשובים, ולכל אחד דוגמה מתוך החיבור וניסוח מתוקן.
4. רשימת שגיאות הלשון עם התיקון.
5. מה לעשות אחרת במטלה הבאה, במשפט אחד.

הנושא: ${w.title}
${w.background.join(' ')}
${w.task}

החיבור (${wWords(x.text)} מילים, נכתב ב-${mmss(x.dur)} דקות):
${x.text}`;
}
function wres() {
  const x = S.wr[arg.i], w = wById[x.id]; if (!w) return write();
  const sc = wScore(x.chk, 'c'), sl = wScore(x.chk, 'l');
  const chk = WCHK.map(([d, t], i) => `<label style="display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--line)"><input type="checkbox" style="width:20px;height:20px;flex:none;margin-top:2px" ${x.chk[i] ? 'checked' : ''} onchange="S.wr[${arg.i}].chk[${i}]=this.checked?1:0;save();render()"><span><span class="tag">${d === 'c' ? 'תוכן' : 'לשון'}</span> ${t}</span></label>`).join('');
  const sel = (k, v) => `<select class="txt" style="width:auto;display:inline-block;margin:0 6px" onchange="S.wr[${arg.i}].${k}=+this.value||0;save()"><option value="0">—</option>${[1, 2, 3, 4, 5, 6].map(n => `<option ${v === n ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  const lines = Math.ceil(wWords(x.text) / WORDS_PER_LINE);
  return `<main><h1>✍️ ${esc(w.title)}</h1><p class="mut">${wWords(x.text)} מילים · כ-${lines} שורות ${lines >= 25 ? '✅' : '⚠️ פחות מ-25'} · ${mmss(x.dur)}</p>
  <h2>1. לקבל משוב וציון</h2><div class="card"><p style="margin-top:0">מעתיקים, מדביקים ב-ChatGPT או ב-Claude, ומקבלים ציון תוכן ולשון לפי הקריטריונים של מאל״ו, יחד עם תיקונים.</p>
  <button class="btn blue" onclick="wCopy(${arg.i})">📋 העתקת החיבור עם הנחיות המשוב</button>
  <p class="sm" style="margin-bottom:0">הציון שקיבלת: תוכן ${sel('gc', x.gc)} לשון ${sel('gl', x.gl)}</p></div>
  <h2>2. בדיקה עצמית</h2><div class="card">${chk}<p style="margin-bottom:0"><b>הערכה עצמית: תוכן ${sc}/6 · לשון ${sl}/6</b></p></div>
  <h2>3. חיבור לדוגמה</h2><div class="card"><details><summary style="font-weight:700;color:var(--b);cursor:pointer">להציג את החיבור לדוגמה</summary>${w.model.map(p => `<p>${esc(p)}</p>`).join('')}
  <div class="exp"><h4>למה הוא חזק</h4>${w.notes.map(n => `• ${esc(n)}`).join('<br>')}</div></details></div>
  <div class="card"><details><summary class="mut" style="cursor:pointer">רעיונות לטיעונים בנושא</summary><p><b>בעד:</b> ${w.ideas.for.map(esc).join(' · ')}</p><p><b>נגד:</b> ${w.ideas.against.map(esc).join(' · ')}</p></details></div>
  <div class="card"><details><summary class="mut" style="cursor:pointer">מה שכתבת</summary><p style="white-space:pre-wrap">${esc(x.text)}</p></details></div>
  <button class="btn ghost" onclick="go('write')">חזרה למטלות</button></main>` + navBar();
}
function wCopy(i) {
  const x = S.wr[i], t = feedbackPrompt(x, wById[x.id]);
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('הועתק ✓ עכשיו להדביק ב-ChatGPT או ב-Claude'), () => {
    const m = document.createElement('div'); m.className = 'modal'; m.onclick = e => { if (e.target === m) m.remove(); };
    m.innerHTML = `<div class="sheet"><h3>להעתיק ידנית</h3><textarea class="txt" rows="12">${esc(t)}</textarea><button class="btn blue" onclick="this.closest('.modal').remove()">סגירה</button></div>`;
    document.body.appendChild(m); m.querySelector('textarea').select();
  });
}

document.addEventListener('visibilitychange', () => { if (S.cur) { S.cur.last = Date.now(); save(); } });
render();
