'use strict';
// פרק ביום — תרגול לפסיכומטרי רק מחומרים רשמיים של מאל״ו.
// כל שאלה, נושא חיבור והסבר נפתחים מהקבצים של מאל״ו באתר שלהם. האפליקציה לא מכילה שאלות.
// היא מוסיפה: טיימר בזמן של הבחינה, דף תשובות, בדיקה מול מפתח התשובות (שמקלידים מהקובץ), מעקב ופילוח לפי סוג שאלה.
// מפת הבחינות (עמודים, פרקים וטווחי סוגי שאלות) ב-chapters.js, נבנית מ-content/exams ע"י build.js.

const LS = 'pd2';
const S = (() => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } })();
S.res = S.res || {};    // מפתח פרק -> [ניסיונות] ניסיון = {at, ans[], dur}
S.keys = S.keys || {};  // מפתח פרק -> מחרוזת התשובות הנכונות שהוקלדה מהקובץ
S.fix = S.fix || {};    // "מפתח:מספר שאלה" -> true כשטעות נפתרה נכון בניסיון חוזר
S.wr = S.wr || [];      // מטלות כתיבה: {src, at, text, dur, gc, gl}
S.read = S.read || {};  // קובצי הדרכה של מאל״ו שסומנו כנקראו
S.examDate = S.examDate || '2026-12-04';
function save() { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { toast('השמירה במכשיר נכשלה'); } }

const EX = (window.EXAMS || []);
const DOM = { verbal: 'מילולי', quant: 'כמותי' };
const TYPE_HE = { analogy: 'אנלוגיות', inference: 'הבנה והסקה', reading: 'הבנת הנקרא', problem: 'שאלות ובעיות', chart: 'הסקה מתרשים' };
// כל הפרקים של כל הבחינות, מהבחינה החדשה לישנה. סדר הימים: מילולי, כמותי, מילולי, כמותי באותה בחינה.
const CH = [];
EX.forEach(e => {
  const v = e.chapters.filter(c => c.domain === 'verbal'), q = e.chapters.filter(c => c.domain === 'quant');
  for (let i = 0; i < Math.max(v.length, q.length); i++) [v[i], q[i]].forEach(c => { if (c) CH.push({ e, c, key: `${e.id}:${e.chapters.indexOf(c)}` }); });
});
const chByKey = Object.fromEntries(CH.map(x => [x.key, x]));
const pdf = (e, page) => e.url + (page ? `#page=${page}` : '');
const typeOf = (c, n) => { const s = (c.sections || []).find(s => n >= s.from && n <= s.to); return s ? s.type : null; };

// חומרים רשמיים נוספים של מאל״ו
const NITE_PREP = 'https://www.nite.org.il/two-domain-psychometric-entrance-test/preparation-1/';
const NITE_TIPS = 'https://www.nite.org.il/two-domain-psychometric-entrance-test/tips/';
const NITE_FORMAT = 'https://www.nite.org.il/two-domain-psychometric-entrance-test/format/';
const NITE_SCORES = 'https://www.nite.org.il/two-domain-psychometric-entrance-test/scores/';
const PSYCHORESHET = 'https://practice.nite.org.il/psycho_he_short';
const U = 'https://www.nite.org.il/wp-content/uploads/';
const GUIDES = [
  ['verbal', 'אנלוגיות: דוגמאות והסברים', U + '2020/07/VE-Analogies_acc.pdf', 'analogy'],
  ['verbal', 'הבנה והסקה: דוגמאות והסברים', U + '2020/07/VE-Inference_acc.pdf', 'inference'],
  ['verbal', 'הבנת הנקרא: דוגמאות והסברים', U + '2020/07/VE-Text-Comprehension_acc.pdf', 'reading'],
  ['verbal', 'חשיבה מילולית: המדריך המלא', U + '2020/07/Verbal-Reasoning-HE_acc.pdf', null],
  ['quant', 'שאלות ובעיות: דוגמאות והסברים', U + '2020/07/QU_Questions-Problems_acc-1.pdf', 'problem'],
  ['quant', 'הסקה מתרשים: דוגמאות והסברים', U + '2020/07/QU-Graph-Comprehension_acc.pdf', 'chart'],
  ['quant', 'חשיבה כמותית: המדריך המלא', U + '2020/12/quantitive-hebrew-acc.pdf', null],
  ['writing', 'מטלת הכתיבה: הסבר ודוגמאות', U + '2020/07/Writing-Task_acc.pdf', null],
];
// מטלות כתיבה רשמיות עם חיבורים לדוגמה שמאל״ו העריכו (קוד = שנה וחודש של המועד)
const WT = ['2020/07/1210', '2020/07/1212', '2020/07/1302', '2020/07/1304|-1', '2020/07/1307', '2020/07/1310', '2020/07/1312', '2020/07/1402', '2020/07/1404', '2020/07/1407|-2', '2020/07/1410', '2020/07/1412', '2020/07/1502', '2020/07/1504', '2020/07/1507', '2020/07/1509', '2020/07/1512', '2020/07/1602|-1', '2020/07/1604|-1', '2020/07/1607', '2020/08/1609', '2020/08/1612', '2020/08/1702', '2020/11/1704', '2020/11/1707', '2020/11/1709']
  .map(s => { const [p, suf] = s.split('|'), code = p.slice(-4); return { id: 'w' + code, title: `מטלת כתיבה — ${+code.slice(2)}/20${code.slice(0, 2)}`, url: `${U}${p}-Writing-Task_acc${suf || ''}.pdf` }; });
const WT_ALL = EX.filter(e => e.writing && e.writing.page).map(e => ({ id: 'x' + e.id, title: `מטלת הכתיבה — ${e.title}`, url: pdf(e, e.writing.page), ex: e.examplesPages ? pdf(e, e.examplesPages[0]) : null, exLabel: e.examplesPages ? `עמודים ${e.examplesPages[0]} עד ${e.examplesPages[1]}` : '' }))
  .concat(WT.map(w => ({ ...w, ex: w.url, exLabel: 'באותו קובץ' })));

let view = 'home', arg = null, tick = null;
const $app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const mmss = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const fmtDate = t => new Date(t).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
function toast(m) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = m; document.body.appendChild(d); setTimeout(() => d.remove(), 2800); }
function go(v, a) { view = v; arg = a ?? null; render(); scrollTo(0, 0); }
const link = (u, t, cls = 'btn ghost') => `<a class="${cls}" style="text-decoration:none" href="${u}" target="_blank" rel="noopener">${t}</a>`;

// ===== חישובים (רק מהתשובות שלך מול המפתח הרשמי) =====
const first = k => (S.res[k] || [])[0];
const keyOf = k => S.keys[k] || '';
const scored = k => { const a = first(k), key = keyOf(k); return a && key ? a.ans.reduce((n, x, i) => n + (x && x === +key[i] ? 1 : 0), 0) : null; };
const done = () => CH.filter(x => first(x.key));
const todayCh = () => CH.find(x => !first(x.key)) || null;
function daysLeft() { return Math.ceil((new Date(S.examDate + 'T08:00:00') - new Date()) / 864e5); }
function streak() {
  const days = new Set(); Object.values(S.res).forEach(a => a.forEach(x => days.add(dayKey(x.at)))); S.wr.forEach(x => days.add(dayKey(x.at)));
  let n = 0, t = Date.now(); if (!days.has(dayKey(t))) t -= 864e5;
  while (days.has(dayKey(t))) { n++; t -= 864e5; } return n;
}
function answered() { // כל שאלה שנענתה בניסיון הראשון, בפרקים שיש להם מפתח
  const out = [];
  done().forEach(({ e, c, key }) => { const a = first(key), k = keyOf(key); if (!k) return; for (let i = 0; i < c.questions; i++) out.push({ e, c, key, n: i + 1, type: typeOf(c, i + 1), a: a.ans[i], right: +k[i], ok: a.ans[i] === +k[i] }); });
  return out;
}

// ===== מסכים =====
function navBar() {
  const it = [['home', '🏠', 'היום'], ['all', '📚', 'בחינות'], ['stats', '🎯', 'חוזקות'], ['fix', '🔁', 'טעויות'], ['write', '✍️', 'כתיבה'], ['learn', '📘', 'הדרכה']];
  return `<nav class="nav">${it.map(([v, ic, l]) => `<button class="${view === v ? 'on' : ''}" onclick="go('${v}')"><span class="ic">${ic}</span>${l}</button>`).join('')}</nav>`;
}
function render() {
  clearInterval(tick); tick = null;
  if (S.cur && !['exam', 'wx'].includes(view)) view = S.cur.kind === 'wr' ? 'wx' : 'exam';
  const f = { home, all, stats, fix, write, learn, settings, exam, keyin, result, wx, wres, retry }[view] || home;
  $app.innerHTML = f();
  if (view === 'exam' || view === 'wx') startTick();
}
const chTitle = x => `${x.e.title} · ${x.c.label || DOM[x.c.domain]}`;
function chRow(x) {
  const a = first(x.key), sc = scored(x.key);
  const right = a ? (sc != null ? `<b>${sc}/${x.c.questions}</b>` : '<span class="mut sm">חסר מפתח</span>') + ` <span class="mut sm">${fmtDate(a.at)}</span>` : '<span class="mut sm">עוד לא נעשה</span>';
  return `<div class="it" onclick="${a ? `go('${keyOf(x.key) ? 'result' : 'keyin'}',{key:'${x.key}'})` : `go('home',{pick:'${x.key}'})`}"><span class="tag ${x.c.domain[0]}">${DOM[x.c.domain]}</span><div class="grow"><b>${esc(x.e.title)}</b><div class="mut sm">${esc(x.c.label || '')} · ${x.c.questions} שאלות · ${x.c.minutes} דק׳</div></div><div>${right}</div></div>`;
}
function chCard(x) {
  const { e, c } = x;
  return `<div class="card"><div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><span class="tag ${c.domain[0]}">${DOM[c.domain]}</span><b style="font-size:17px">${esc(e.title)}</b></div>
    <p class="mut sm" style="margin:2px 0 10px">${esc(c.label || '')} · ${c.questions} שאלות · ${c.minutes} דקות · <b>עמודים ${c.page} עד ${c.endPage} בקובץ</b>${c.printed ? ` (בדף: ${c.printed})` : ''}</p>
    <div class="row">${link(pdf(e, c.page), '📄 לפתוח את הפרק')}<button class="btn" onclick="startChap('${x.key}')">▶️ טיימר ודף תשובות</button></div>
    <p class="mut sm" style="margin:6px 0 0">פותחים את הקובץ של מאל״ו בעמוד ${c.page}, ופותרים שם. כאן מסמנים תשובות, והזמן רץ כמו בבחינה.${c.domain === 'quant' && e.formulasPage ? ` דף הנוסחאות הרשמי: עמוד ${e.formulasPage}.` : ''}</p></div>`;
}
function home() {
  const dl = daysLeft(), st = streak(), A = answered();
  const pv = A.filter(x => x.c.domain === 'verbal'), pq = A.filter(x => x.c.domain === 'quant');
  const p = l => l.length ? Math.round(100 * l.filter(x => x.ok).length / l.length) + '%' : '—';
  const pick = arg && arg.pick ? chByKey[arg.pick] : null, x = pick || todayCh();
  let h = `<main><div class="card hero"><div class="mut sm">הפסיכומטרי הדו-תחומי · ${new Date(S.examDate).toLocaleDateString('he-IL')}</div>
    <div style="font-size:30px;font-weight:800;margin:4px 0">${dl > 0 ? `עוד ${dl} ימים` : dl === 0 ? 'הבחינה היום 💪' : 'הבחינה עברה'}</div>
    <div class="mut sm">${CH.length} פרקים אמיתיים מ-${EX.length} בחינות של מאל״ו</div></div>
    <div class="kpis"><div class="kpi"><b>${done().length}</b><span>פרקים נעשו</span></div><div class="kpi"><b>${p(pv)}</b><span>נכון במילולי</span></div><div class="kpi"><b>${p(pq)}</b><span>נכון בכמותי</span></div></div>`;
  if (x) h += `<h2>${pick ? 'הפרק שבחרת' : 'פרק היום'}${st ? ` <span class="mut sm">· ${st} ימים ברצף 🔥</span>` : ''}</h2>${chCard(x)}`;
  else h += `<div class="card"><b>עשית את כל הפרקים 🎉</b><p class="mut sm">אפשר לעשות פרק שוב מ«בחינות», או לתרגל ב«פסיכורשת».</p></div>`;
  const miss = done().filter(y => !keyOf(y.key));
  if (miss.length) h += `<div class="card"><b>⚠️ ${miss.length} פרקים בלי מפתח תשובות</b><p class="mut sm" style="margin:4px 0 8px">בלי המפתח אין ציון ולא רואים איפה טעית.</p><button class="btn blue" onclick="go('keyin',{key:'${miss[0].key}'})">להקליד מפתח</button></div>`;
  const last = done().slice(-3).reverse();
  if (last.length) h += `<h2>אחרונים</h2><div class="card list">${last.map(chRow).join('')}</div>`;
  h += `<div class="card"><b>מאל״ו:</b> <span class="sm">הציון מחושב רק לפי התשובות הנכונות, ואין הפחתת נקודות על תשובה שגויה. השאירו כדקה בסוף הפרק כדי לסמן תשובה בכל שאלה שלא הגעתם אליה.</span> ${link(NITE_TIPS, 'כל ההנחיות לנבחנים ↗', 'sm')}</div>
    <button class="btn ghost" onclick="go('settings')">⚙️ הגדרות וגיבוי</button></main>` + navBar();
  return h;
}
function all() {
  return `<main><h1>📚 הבחינות של מאל״ו</h1><p class="mut sm">כל הבחינות שמאל״ו פרסמו באתר שלהם, מהחדשה לישנה. בכל אחת 2 פרקים מילולי ו-2 כמותי, בלי אנגלית.</p>
  ${EX.map(e => `<h2 style="display:flex;justify-content:space-between;align-items:center">${esc(e.title)} ${link(e.url, 'הקובץ ↗', 'sm')}</h2><div class="card list">${CH.filter(x => x.e === e).map(chRow).join('')}</div>`).join('')}
  <p class="mut sm">המקור: ${link(NITE_PREP, 'דף ההכנה של מאל״ו', 'sm')}</p></main>` + navBar();
}

// ===== פרק בזמן: טיימר + דף תשובות =====
function startChap(k) {
  const x = chByKey[k]; if (!x) return;
  if (S.cur && !confirm('יש פרק אחר באמצע. לוותר עליו ולהתחיל את זה?')) return;
  const n = x.c.questions;
  S.cur = { kind: 'chap', key: k, endAt: Date.now() + x.c.minutes * 60e3, start: Date.now(), ans: Array(n).fill(0), flag: Array(n).fill(0), last: Date.now() };
  save(); go('exam');
}
function startTick() {
  const upd = () => {
    const X = S.cur; if (!X) return;
    const left = (X.endAt - Date.now()) / 1000;
    const el = document.getElementById('tm'); if (el) { el.textContent = mmss(left); el.classList.toggle('warn', left < (X.kind === 'wr' ? 300 : 60)); }
    if (left <= 0) { toast('⏰ הזמן נגמר'); X.kind === 'wr' ? wDone() : submit(true); return; }
  };
  upd(); tick = setInterval(upd, 1000);
}
function exam() {
  const X = S.cur, x = chByKey[X.key], { e, c } = x, left = (X.endAt - Date.now()) / 1000;
  let lastType = null;
  const rows = X.ans.map((a, i) => {
    const t = typeOf(c, i + 1), head = t && t !== lastType ? `<div class="sech">${TYPE_HE[t]}</div>` : ''; lastType = t;
    return head + `<div class="bub"><b>${i + 1}</b>${[1, 2, 3, 4].map(k => `<button class="${a === k ? 'on' : ''}" onclick="bub(${i},${k})">${k}</button>`).join('')}<button class="fl ${X.flag[i] ? 'on' : ''}" onclick="flg(${i})" title="לחזור אליה">🚩</button></div>`;
  }).join('');
  return `<div class="xtop"><span class="timer ${left < 60 ? 'warn' : ''}" id="tm">${mmss(left)}</span><span class="ttl">${esc(e.title)} · ${DOM[c.domain]} · ${X.ans.filter(Boolean).length}/${c.questions}</span>${link(pdf(e, c.page), '📄 PDF', 'icb')}</div>
  <main><p class="mut sm" style="margin-top:0">${esc(c.label || '')}: עמודים ${c.page} עד ${c.endPage} בקובץ.${c.domain === 'quant' && e.formulasPage ? ` נוסחאות: עמוד ${e.formulasPage}.` : ''}</p>${rows}
  <button class="btn" style="margin-top:18px" onclick="submit()">סיום והגשה</button>
  <p style="text-align:center"><button class="icb" onclick="quit()">לצאת בלי לשמור</button></p></main>`;
}
function bub(i, k) { const X = S.cur; X.ans[i] = X.ans[i] === k ? 0 : k; save(); const y = scrollY; render(); scrollTo(0, y); }
function flg(i) { const X = S.cur; X.flag[i] = X.flag[i] ? 0 : 1; save(); const y = scrollY; render(); scrollTo(0, y); }
function quit() { if (!confirm('לצאת? מה שסימנת לא יישמר.')) return; delete S.cur; save(); go('home'); }
function submit(auto) {
  const X = S.cur; if (!X) return;
  if (!auto) { const empty = X.ans.filter(a => !a).length; if (!confirm(empty ? `נשארו ${empty} שאלות בלי תשובה. מאל״ו ממליצים לנחש (אין הפחתה על טעות). להגיש בכל זאת?` : 'להגיש?')) return; }
  (S.res[X.key] = S.res[X.key] || []).push({ at: Date.now(), ans: X.ans.slice(), flag: X.flag.slice(), dur: Math.round((Math.min(Date.now(), X.endAt) - X.start) / 1000) });
  const k = X.key; delete S.cur; save(); go(keyOf(k) ? 'result' : 'keyin', { key: k });
}
function keyin() {
  const x = chByKey[arg.key], { e, c } = x;
  return `<main><h1>מפתח התשובות</h1><div class="card"><p style="margin-top:0">${esc(e.title)} · ${esc(c.label || DOM[c.domain])}</p>
  <p>בסוף הקובץ של מאל״ו יש «מפתח תשובות נכונות»${e.keyPage ? `, <b>בעמוד ${e.keyPage}</b>` : ''}. מוצאים שם את הטבלה של <b>${esc(c.label || DOM[c.domain])}</b>, ומקלידים את ${c.questions} התשובות ברצף.</p>
  ${link(pdf(e, e.keyPage), '📄 לפתוח את המפתח')}
  <input class="txt key" id="ki" inputmode="numeric" maxlength="${c.questions}" value="${esc(keyOf(arg.key))}" placeholder="${'·'.repeat(c.questions)}" oninput="document.getElementById('kc').textContent=this.value.replace(/[^1-4]/g,'').length+'/${c.questions}'">
  <div class="mut sm" id="kc">${keyOf(arg.key).length}/${c.questions}</div>
  <button class="btn blue" style="margin-top:10px" onclick="saveKey('${arg.key}')">לבדוק</button></div>
  <p class="mut sm">המפתח נשמר, ופעם הבאה שתעשה את הפרק הזה לא צריך להקליד שוב.</p></main>` + navBar();
}
function saveKey(k) {
  const n = chByKey[k].c.questions, v = (document.getElementById('ki').value || '').replace(/[^1-4]/g, '');
  if (v.length !== n) return toast(`צריך בדיוק ${n} ספרות בין 1 ל-4 (הוקלדו ${v.length})`);
  S.keys[k] = v; save(); go('result', { key: k });
}
function breakdown(items, keyf, label) {
  const g = {}; items.forEach(x => { const k = keyf(x); if (!k) return; (g[k] = g[k] || { n: 0, ok: 0 }); g[k].n++; g[k].ok += x.ok ? 1 : 0; });
  return Object.entries(g).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).map(([k, v]) => {
    const p = pct(v.ok, v.n); return `<div style="margin:10px 0"><div style="display:flex;justify-content:space-between;font-size:14px"><span>${esc(label(k))}</span><b>${v.ok}/${v.n} · ${p}%</b></div><div class="bar ${p < 50 ? 'low' : p < 75 ? 'mid' : ''}"><i style="width:${p}%"></i></div></div>`;
  }).join('');
}
function result() {
  const x = chByKey[arg.key], { e, c } = x, att = S.res[arg.key], k = arg.k ?? att.length - 1, a = att[k], key = keyOf(arg.key);
  const items = a.ans.map((v, i) => ({ n: i + 1, a: v, right: +key[i], ok: v === +key[i], type: typeOf(c, i + 1), flag: a.flag && a.flag[i] }));
  const r = items.filter(y => y.ok).length, empty = items.filter(y => !y.a).length;
  const grid = items.map(y => `<div class="rq ${y.ok ? 'ok' : y.a ? 'bad' : 'skip'}"><b>${y.n}</b><span>${y.ok ? '✓' : `${y.a || '—'}→${y.right}`}</span></div>`).join('');
  return `<main><div style="display:flex;gap:8px;align-items:center"><span class="tag ${c.domain[0]}">${DOM[c.domain]}</span><b>${esc(e.title)} · ${esc(c.label || '')}</b>${k ? '<span class="tag">ניסיון חוזר</span>' : ''}</div>
  <div class="big-score">${r}/${c.questions}</div><div style="text-align:center" class="mut">${pct(r, c.questions)}% נכון · ${mmss(a.dur)} דקות${empty ? ` · ${empty} בלי תשובה` : ''}</div>
  <div class="card" style="margin-top:12px"><b>הציון המשוער לפי מאל״ו</b><p class="sm" style="margin:4px 0 8px">בסוף הקובץ יש טבלה רשמית שממירה את מספר התשובות הנכונות לציון משוער${e.scorePages ? `, <b>בעמודים ${e.scorePages[0]} עד ${e.scorePages[1]}</b>` : ''}. בשביל ציון בתחום צריך את שני הפרקים של אותו תחום מאותה בחינה.</p>${e.scorePages ? link(pdf(e, e.scorePages[0]), '📄 לטבלת הציונים של מאל״ו') : link(NITE_SCORES, 'ציונים באתר מאל״ו ↗')}</div>
  <h2>כל השאלות</h2><p class="mut sm" style="margin-top:-4px">ענית → התשובה הנכונה לפי המפתח של מאל״ו</p><div class="rgrid">${grid}</div>
  ${c.sections && c.sections.length ? `<h2>לפי סוג שאלה</h2><div class="card">${breakdown(items, y => y.type, t => TYPE_HE[t] || t)}</div>` : ''}
  <div class="card"><b>איך לומדים מהטעויות</b><p class="sm" style="margin:4px 0 8px">פותחים את השאלה בקובץ ופותרים שוב בלי שעון. בלשונית «טעויות» מסמנים תשובה חדשה ובודקים מול המפתח. הסברים רשמיים לכל סוג שאלה נמצאים בלשונית «הדרכה».</p>
  <div class="row">${link(pdf(e, c.page), '📄 לשאלות בקובץ')}<button class="btn blue" onclick="go('fix')">לתרגל את הטעויות</button></div></div>
  <div class="row"><button class="btn ghost" onclick="startChap('${arg.key}')">לעשות שוב</button><button class="btn ghost" onclick="go('keyin',{key:'${arg.key}'})">לתקן מפתח</button></div></main>` + navBar();
}

// ===== חוזקות: רק מהתשובות שלך מול המפתח הרשמי =====
function stats() {
  const A = answered();
  if (!A.length) return `<main><h1>🎯 חוזקות וחולשות</h1><div class="card"><p style="margin:0">אחרי הפרק הראשון (עם מפתח תשובות), יופיע כאן פילוח לפי תחום ולפי סוג שאלה, מהתשובות שלך בבחינות של מאל״ו.</p></div></main>` + navBar();
  const hist = done().filter(x => keyOf(x.key)).map(x => ({ p: scored(x.key) / x.c.questions, d: x.c.domain[0], l: chTitle(x) }));
  const weakT = Object.entries(A.reduce((g, x) => { if (x.type) { (g[x.type] = g[x.type] || { n: 0, ok: 0 }); g[x.type].n++; g[x.type].ok += x.ok; } return g; }, {})).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)[0];
  const g = weakT ? GUIDES.find(z => z[3] === weakT[0]) : null;
  return `<main><h1>🎯 חוזקות וחולשות</h1><p class="mut sm" style="margin-top:-6px">מהניסיון הראשון בכל פרק, מול מפתח התשובות של מאל״ו (${A.length} שאלות).</p>
  <h2>לפי תחום</h2><div class="card">${breakdown(A, x => x.c.domain, d => DOM[d])}</div>
  <h2>לפי סוג שאלה</h2><div class="card">${breakdown(A, x => x.type, t => TYPE_HE[t] || t)}</div>
  ${g ? `<div class="card"><b>הכי חלש כרגע: ${TYPE_HE[weakT[0]]}</b><p class="sm" style="margin:4px 0 8px">לסוג הזה יש למאל״ו קובץ רשמי עם דוגמאות והסברים.</p>${link(g[2], '📘 ' + g[1])}</div>` : ''}
  <h2>ההתקדמות</h2><div class="card"><div class="hist">${hist.map(x => `<i class="${x.d}" style="height:${Math.max(4, x.p * 100)}%" title="${esc(x.l)}: ${Math.round(x.p * 100)}%"></i>`).join('')}</div>
  <div class="legend"><span style="--c:var(--o)">מילולי</span><span style="--c:var(--b)">כמותי</span></div></div>
  <h2>לפי בחינה</h2><div class="card list">${done().map(chRow).join('')}</div></main>` + navBar();
}

// ===== טעויות: פותרים שוב בקובץ ובודקים מול המפתח =====
function mistakes() { return answered().filter(x => !x.ok && !S.fix[`${x.key}:${x.n}`]); }
function fix() {
  const M = mistakes(), fixed = Object.keys(S.fix).length;
  const by = {}; M.forEach(m => (by[m.key] = by[m.key] || []).push(m));
  return `<main><h1>🔁 טעויות</h1><p class="mut sm" style="margin-top:-6px">כל שאלה שטעית בה או לא ענית עליה. פותחים אותה בקובץ, פותרים שוב בלי שעון, ומסמנים. תשובה נכונה מוציאה את השאלה מהרשימה.</p>
  <div class="kpis"><div class="kpi"><b>${M.length}</b><span>מחכות</span></div><div class="kpi"><b>${fixed}</b><span>תוקנו</span></div><div class="kpi"><b>${done().length}</b><span>פרקים</span></div></div>
  ${Object.entries(by).map(([k, ms]) => { const x = chByKey[k]; return `<h2>${esc(chTitle(x))}</h2><div class="card list">${ms.map(m => `<div class="it" onclick="go('retry',{key:'${k}',n:${m.n}})"><b>שאלה ${m.n}</b><div class="grow mut sm">${TYPE_HE[m.type] || ''}</div><span class="mut sm">${m.a ? 'טעות' : 'לא נענתה'}</span></div>`).join('')}</div>`; }).join('') || '<div class="card"><p>אין טעויות שמחכות 👏</p></div>'}
  </main>` + navBar();
}
let RP = 0;
function retry() {
  const x = chByKey[arg.key], { e, c } = x, n = arg.n, right = +keyOf(arg.key)[n - 1];
  const opts = [1, 2, 3, 4].map(k => `<button class="${RP ? (k === right ? 'ok' : k === RP ? 'bad' : '') : ''}" ${RP ? 'disabled' : `onclick="RP=${k};if(${k}===${right}){S.fix['${arg.key}:${n}']=true;save()}render()"`}>${k}</button>`).join('');
  return `<div class="xtop"><button class="icb" onclick="RP=0;go('fix')">→ חזרה</button><span class="ttl">${esc(e.title)} · ${DOM[c.domain]} · שאלה ${n}</span></div>
  <main><div class="card"><p style="margin-top:0"><b>שאלה ${n}</b> ב${esc(c.label || DOM[c.domain])} (${TYPE_HE[typeOf(c, n)] || ''}), עמודים ${c.page} עד ${c.endPage} בקובץ.</p>${link(pdf(e, c.page), '📄 לפתוח בקובץ')}</div>
  <p>התשובה שלך עכשיו:</p><div class="bub big">${opts}</div>
  ${RP ? `<p style="font-weight:800;font-size:18px;color:${RP === right ? 'var(--gd)' : 'var(--rd)'}">${RP === right ? '✅ נכון! השאלה יוצאת מהרשימה.' : `❌ התשובה הנכונה לפי המפתח: ${right}`}</p>
  <button class="btn blue big" onclick="RP=0;${mistakes().length ? `go('retry',{key:'${mistakes()[0].key}',n:${mistakes()[0].n}})` : `go('fix')`}">לטעות הבאה</button>` : ''}</main>`;
}

// ===== הדרכה: רק קבצים רשמיים של מאל״ו =====
function learn() {
  const row = ([d, t, u]) => `<div class="it"><input type="checkbox" style="width:20px;height:20px" ${S.read[u] ? 'checked' : ''} onchange="S.read['${u}']=this.checked;save()"><div class="grow">${link(u, esc(t) + ' ↗', '')}</div>${d !== 'writing' ? `<span class="tag ${d[0]}">${DOM[d]}</span>` : ''}</div>`;
  return `<main><h1>📘 הדרכה רשמית</h1><p class="mut sm" style="margin-top:-6px">הקבצים של מאל״ו עם דוגמאות לכל סוג שאלה ועם הסבר איך פותרים. מסמנים ✓ את מה שקראת.</p>
  <div class="card list">${GUIDES.map(row).join('')}</div>
  <h2>תרגול מקוון רשמי</h2><div class="card"><p style="margin-top:0"><b>פסיכורשת</b> היא בחינה ממוחשבת להתנסות של מאל״ו, עם שאלות אמיתיות.</p>${link(PSYCHORESHET, 'לפסיכורשת ↗')}</div>
  <h2>על הבחינה</h2><div class="card list">${[['מבנה הבחינה ומרכיביה', NITE_FORMAT], ['הנחיות לנבחנים', NITE_TIPS], ['הכנה לבחינה ובחינות להתנסות', NITE_PREP], ['ציונים', NITE_SCORES]].map(([t, u]) => `<div class="it">${link(u, t + ' ↗', '')}</div>`).join('')}</div></main>` + navBar();
}

// ===== מטלת כתיבה: נושאים רשמיים, טיימר 30 דקות, השוואה לחיבורים שמאל״ו העריכו =====
const WPL = 10; // הערכה: בערך 10 מילים בשורה בדף התשובות
const wWords = t => (String(t || '').trim().match(/\S+/g) || []).length;
const wById = Object.fromEntries(WT_ALL.map(w => [w.id, w]));
function write() {
  const doneIds = new Set(S.wr.map(x => x.src)), next = WT_ALL.find(w => !doneIds.has(w.id));
  const rows = S.wr.slice().reverse().map((x, j) => { const i = S.wr.length - 1 - j, w = wById[x.src]; return `<div class="it" onclick="go('wres',{i:${i}})"><div class="grow"><b>${esc(w ? w.title : x.src)}</b><div class="mut sm">${fmtDate(x.at)} · ${wWords(x.text)} מילים · ${mmss(x.dur)}</div></div><span class="sm">${x.gc ? `${x.gc}/${x.gl}` : ''}</span></div>`; }).join('');
  return `<main><h1>✍️ מטלת כתיבה</h1>
  <div class="card"><p style="margin-top:0">לפי מאל״ו: חיבור בנושא נתון, <b>לפחות 25 שורות</b>, בסגנון עיוני, ב-<b>30 דקות</b>. שני מעריכים נותנים ציון בשני ממדים: <b>תוכן</b> (עושר ואיכות הטיעונים, חשיבה ביקורתית) ו<b>לשון</b> (בהירות הניסוח, סגנון תקין ודיוק לשוני).</p>${link(GUIDES[7][2], '📘 ההסבר של מאל״ו')}</div>
  ${next ? `<button class="btn big" onclick="wStart('${next.id}')">▶️ מטלה הבאה: ${esc(next.title)}</button>` : ''}
  ${rows ? `<h2>מה שכתבת</h2><div class="card list">${rows}</div>` : ''}
  <h2>כל המטלות הרשמיות (${WT_ALL.length})</h2><div class="card list">${WT_ALL.map(w => `<div class="it" onclick="wStart('${w.id}')"><div class="grow"><b>${esc(w.title)}</b></div><span class="mut sm">${doneIds.has(w.id) ? '✓' : ''}</span></div>`).join('')}</div></main>` + navBar();
}
function wStart(id) {
  if (S.cur && !confirm('יש משהו אחר באמצע. לוותר עליו?')) return;
  S.cur = { kind: 'wr', src: id, endAt: Date.now() + 30 * 60e3, start: Date.now(), text: '' }; save(); go('wx');
}
function wCount(t) { const n = wWords(t), l = Math.ceil(n / WPL); return `${n} מילים · כ-${l} שורות ${l >= 25 ? '✅' : `(מינימום 25)`}`; }
function wx() {
  const X = S.cur, w = wById[X.src], left = (X.endAt - Date.now()) / 1000;
  return `<div class="xtop"><span class="timer ${left < 300 ? 'warn' : ''}" id="tm">${mmss(left)}</span><span class="ttl">${esc(w.title)}</span>${link(w.url, '📄 הנושא', 'icb')}</div>
  <main><p class="mut sm" style="margin-top:0">הנושא בקובץ של מאל״ו (הכפתור למעלה). כותבים כאן, והטקסט נשמר כל הזמן.</p>
  <textarea id="wt" class="txt" style="min-height:58vh;line-height:1.8;font-size:16px;resize:vertical" oninput="S.cur.text=this.value;document.getElementById('wc').textContent=wCount(this.value);save()">${esc(X.text)}</textarea>
  <div class="mut sm" id="wc">${wCount(X.text)}</div>
  <button class="btn" style="margin-top:14px" onclick="wDone(1)">סיום והגשה</button>
  <p style="text-align:center"><button class="icb" onclick="quit()">לצאת בלי לשמור</button></p></main>`;
}
function wDone(ask) {
  const X = S.cur; if (!X) return; const el = document.getElementById('wt'); if (el) X.text = el.value;
  if (ask && !confirm(Math.ceil(wWords(X.text) / WPL) < 25 ? 'פחות מ-25 שורות. להגיש בכל זאת?' : 'להגיש?')) return;
  S.wr.push({ src: X.src, at: Date.now(), text: X.text, dur: Math.round((Math.min(Date.now(), X.endAt) - X.start) / 1000) });
  delete S.cur; save(); go('wres', { i: S.wr.length - 1 });
}
function wres() {
  const x = S.wr[arg.i], w = wById[x.src]; if (!w) return write();
  const sel = (k, v) => `<select class="txt" style="width:auto;display:inline-block;margin:0 6px" onchange="S.wr[${arg.i}].${k}=+this.value||0;save()"><option value="0">—</option>${[1, 2, 3, 4, 5, 6].map(n => `<option ${v === n ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  const lines = Math.ceil(wWords(x.text) / WPL);
  return `<main><h1>✍️ ${esc(w.title)}</h1><p class="mut">${wWords(x.text)} מילים · כ-${lines} שורות ${lines >= 25 ? '✅' : '⚠️ פחות מ-25'} · ${mmss(x.dur)}</p>
  <div class="card"><b>להשוות לחיבורים שמאל״ו העריכו</b><p class="sm" style="margin:4px 0 8px">בקובץ יש חיבורים לדוגמה ברמה גבוהה, בינונית ונמוכה, עם ההערכה של מאל״ו${w.exLabel ? ` (${w.exLabel})` : ''}. קוראים אותם ובודקים לאיזה מהם החיבור שלך הכי דומה, בתוכן ובלשון.</p>${link(w.ex || w.url, '📄 לחיבורים לדוגמה')}
  <p class="sm" style="margin:10px 0 0">ההערכה שלך: תוכן ${sel('gc', x.gc)} לשון ${sel('gl', x.gl)}</p></div>
  <div class="card"><details open><summary class="mut" style="cursor:pointer">מה שכתבת</summary><p style="white-space:pre-wrap">${esc(x.text)}</p></details></div>
  <button class="btn ghost" onclick="go('write')">חזרה למטלות</button></main>` + navBar();
}

// ===== הגדרות וגיבוי =====
function settings() {
  return `<main><h1>⚙️ הגדרות</h1><div class="card"><b>תאריך הבחינה</b>
  <div class="seg">${[['2026-12-04', 'ו׳ 4.12'], ['2026-12-06', 'א׳ 6.12']].map(([d, l]) => `<button class="${S.examDate === d ? 'on' : ''}" onclick="S.examDate='${d}';save();render()">${l}</button>`).join('')}</div>
  <input class="txt" type="date" value="${S.examDate}" onchange="S.examDate=this.value;save();render()"></div>
  <div class="card"><b>גיבוי והעברה למכשיר אחר</b><p class="mut sm">ההתקדמות נשמרת בדפדפן של המכשיר הזה. כדי להעביר: מעתיקים את הקוד ומדביקים אותו במכשיר השני.</p>
  <button class="btn blue" onclick="expo()">העתקת קוד גיבוי</button><textarea class="txt" id="imp" rows="3" placeholder="להדביק כאן קוד גיבוי" style="margin-top:12px"></textarea><button class="btn ghost" onclick="impo()">טעינת גיבוי</button></div>
  <div class="card"><b>על האפליקציה</b><p class="mut sm">כל השאלות, נושאי החיבור, ההסברים, המפתחות וטבלאות הציון הם של מאל״ו, ונפתחים מהאתר שלהם. האפליקציה רק מוסיפה טיימר, דף תשובות, בדיקה מול המפתח שאתה מקליד ומעקב. מוצר אישי, לא קשור למאל״ו.</p></div>
  <button class="btn ghost" onclick="go('home')">חזרה</button></main>` + navBar();
}
function expo() {
  const code = btoa(unescape(encodeURIComponent(JSON.stringify({ res: S.res, keys: S.keys, fix: S.fix, wr: S.wr, read: S.read, examDate: S.examDate }))));
  (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => toast('הקוד הועתק ✓'), () => { document.getElementById('imp').value = code; toast('הקוד בתיבה — להעתיק ידנית'); });
}
function impo() {
  try { const d = JSON.parse(decodeURIComponent(escape(atob(document.getElementById('imp').value.trim())))); if (!d.res) throw 0; if (!confirm('לטעון? זה מחליף את מה שיש במכשיר.')) return; Object.assign(S, d); save(); toast('נטען ✓'); go('home'); }
  catch (e) { toast('הקוד לא תקין'); }
}

try { localStorage.removeItem('pd1'); } catch (e) { } // הגרסה הקודמת עם שאלות שלא ממאל״ו
render();
