'use strict';
// פרק ביום — תרגול לפסיכומטרי רק מחומרים רשמיים של מאל״ו.
// השאלות ונושאי החיבור נפתחים מהקבצים של מאל״ו באתר שלהם. האפליקציה לא מכילה שאלות.
// היא מוסיפה: טיימר בזמן של הבחינה, דף תשובות, מפתח התשובות הרשמי והסבר לכל שאלה (sol.js, מוצפן), מעקב ופילוח לפי סוג שאלה.
// מפת הבחינות (עמודים, פרקים וטווחי סוגי שאלות) ב-chapters.js, נבנית מ-content/exams ע"י build.js.

const LS = 'pd2';
const S = (() => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } })();
S.res = S.res || {};    // מפתח פרק -> [ניסיונות] ניסיון = {at, ans[], dur}
S.keys = S.keys || {};  // מפתח פרק -> מחרוזת התשובות הנכונות שהוקלדה מהקובץ
S.fix = S.fix || {};    // "מפתח:מספר שאלה" -> true כשטעות נפתרה נכון בניסיון חוזר
S.wr = S.wr || [];      // מטלות כתיבה: {src, at, text, dur, gc, gl}
S.read = S.read || {};  // קובצי הדרכה של מאל״ו שסומנו כנקראו
S.prac = S.prac || {};  // תרגול חופשי בלי שעון: מפתח פרק -> {at, ans[]}. לא נכנס לציון ולא ל«טעויות»
S.voc = S.voc || {};    // מילים: מילה -> {b תיבה 0-6, due, ok, bad, at, day, k מכיר כבר, r דירוג בכרטיסיות 1-3}
S.examDate = S.examDate || '2026-12-04';
S.gone = S.gone || {};  // ניסיונות שהוסרו מהנתונים: "מפתח@at" -> מתי הוסר. נשמר (גם בענן) כדי שמכשיר אחר לא יחזיר אותם במיזוג
dropGone(S);
S.dh = S.dh || [];
S.sims = S.sims || [];  // סימולציות מלאות שהסתיימו: {at, end, id בחינה, atts:[{k פרק, at הניסיון ב-res}]}. S.sim = סימולציה שרצה עכשיו      // היסטוריית תרגול (רועי 23/11: «מסיים ולא יכול לחזור לראות»): סבבים שהסתיימו {at, title, dom, type, a, list:[{k,n,ans}]}
if (S.drill && S.drill.list && S.drill.i >= S.drill.list.length) dArchive(S.drill); // סבב שהסתיים לפני שהייתה היסטוריה
// מפתחות והסברים: sol.js מוצפן (הבחינות של מאל״ו אסורות בהפצה). קוד הגישה מגיע פעם אחת בקישור (#k=...) ונשמר במכשיר.
let SOL = {};
// תמונות השאלות: q/<בחינה>/<פרק>-<שאלה>.bin, מוצפנות במפתח שנמצא בתוך sol.js. נפתחות רק עם קוד הגישה.
let IK = null, IKC = null; const IMG = {};
async function qImg(id) {
  if (IMG[id]) return IMG[id];
  if (!IK) throw new Error('locked');
  IKC = IKC || await crypto.subtle.importKey('raw', Uint8Array.from(atob(IK), ch => ch.charCodeAt(0)), 'AES-GCM', false, ['decrypt']);
  const r = await fetch(`q/${id}.bin`); if (!r.ok) throw new Error('missing');
  const b = new Uint8Array(await r.arrayBuffer());
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.subarray(0, 12) }, IKC, b.subarray(12));
  return IMG[id] = URL.createObjectURL(new Blob([pt], { type: 'image/png' }));
}
const PK = 'pd2k', UK = 'pd2u';
const OPEN = '0487085caa'; // רועי 19/11: «תסיר את קוד הגישה». האפליקציה נפתחת לכולם בלי להקליד קוד
// מזהה אישי להתקדמות: קוד הגישה משותף לכל מי שקיבל את הקישור, ולכן כל מכשיר חדש מקבל מזהה משלו ומתחיל מאפס.
// '0' = המזהה הישן (קוד הגישה בלבד), למכשירים שנפתחו לפני 19/11. מעבר בין מכשירים: «הקישור האישי» בהגדרות (&u=...).
let myUid = null;
function pickUid(fromLink, hadCode) {
  let cur = null; try { cur = localStorage.getItem(UK); } catch (e) { }
  if (!cur && hadCode) cur = '0';
  let u = cur;
  // רועי 23/11: מי שקיבל קישור מאדם אחר מתחיל מאפס. גם במכשיר חדש שואלים לפני שנכנסים להתקדמות קיימת מקישור אישי
  if (fromLink && fromLink !== cur && confirm(cur ? 'הקישור הזה שייך להתקדמות אחרת. לעבור אליה? מה שנעשה במכשיר הזה יתמזג לתוכה.'
    : 'הקישור הזה פותח התקדמות אישית שכבר קיימת.\n\nאישור: זה הקישור האישי שלך ממכשיר אחר, ממשיכים מאותו מקום.\nביטול: קיבלת אותו ממישהו אחר. מתחילים מאפס, וההתקדמות שלו לא תופיע אצלך.')) u = fromLink;
  if (!u) u = [...crypto.getRandomValues(new Uint8Array(9))].map(b => b.toString(16).padStart(2, '0')).join('');
  try { localStorage.setItem(UK, u); } catch (e) { }
  return myUid = u;
}
async function unseal(pass) {
  if (!window.SOLX || !window.crypto || !crypto.subtle) return false;
  try {
    const u = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: u(SOLX.salt), iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u(SOLX.iv) }, key, u(SOLX.data));
    SOL = JSON.parse(new TextDecoder().decode(pt)); IK = SOL._ik || null; delete SOL._ik; vocLoad(SOL._voc); delete SOL._voc; return true;
  } catch (e) { return false; }
}
async function setCode(v) {
  v = String(v || '').trim(); if (!v) return;
  const mk = v.match(/k=([\w-]+)/), mu = v.match(/[#&]u=([\w-]+)/); // אפשר להדביק גם את הקישור המלא (כולל הקישור האישי)
  if (mk) v = mk[1];
  let had = false; try { had = !!localStorage.getItem(PK); } catch (e) { }
  if (await unseal(v)) { pickUid(mu && mu[1], had); try { localStorage.setItem(PK, v); } catch (e) { } toast('המפתחות וההסברים נפתחו ✓'); render(); cloudInit(v); }
  else toast('הקוד לא נכון');
}
function save() { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { toast('השמירה במכשיר נכשלה'); } cloudSoon(); }

// ===== שמירה בענן: כל ההתקדמות נשמרת גם בשרת, ומתמזגת בין מכשירים. המזהה נגזר מקוד הגישה ומהמזהה האישי (myUid) =====
const CLOUD = { url: 'https://jezxhibenekurxymwxrb.supabase.co', key: 'sb_publishable_xGZcm2vZSZFN-mesHdnArg_vxRKIh3S' };
let cloudId = null, cloudAt = null, cloudErr = false, cloudT = null;
async function cloudRpc(fn, body) {
  const r = await fetch(`${CLOUD.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: CLOUD.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(fn + ' ' + r.status);
  const j = await r.json(); if (j && j.error) throw new Error(fn + ' ' + j.error); return j;
}
async function cloudInit(pass) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('psycho-daily:' + pass + (myUid && myUid !== '0' ? ':' + myUid : '')));
  cloudId = [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
  await cloudSync();
}
// איחוד: ניסיונות לפי זמן (הראשון בכל פרק נשאר הראשון), מפתחות/תיקונים/קבצים שנקראו לפי מפתח, כתיבה לפי זמן
function mergeS(a, b) {
  if (!b || typeof b !== 'object') return false;
  a.prac = a.prac || {};
  a.voc = a.voc || {};
  a.gone = a.gone || {};
  a.dh = a.dh || [];
  a.sims = a.sims || [];
  const before = JSON.stringify([a.res, a.keys, a.fix, a.wr, a.read, a.examDate, a.prac, a.voc, a.gone, a.dh, a.sims]);
  const hs = new Set(a.sims.map(x => x.at)); a.sims = a.sims.concat((b.sims || []).filter(x => x && !hs.has(x.at))).sort((x, y) => x.at - y.at); // סימולציות מלאות לפי זמן
  const ha = new Set(a.dh.map(x => x.at)); a.dh = a.dh.concat((b.dh || []).filter(x => x && !ha.has(x.at))).sort((x, y) => x.at - y.at).slice(-300); // סבבי תרגול לפי זמן
  for (const [k, list] of Object.entries(b.res || {})) { const have = new Set((a.res[k] || []).map(x => x.at)); a.res[k] = (a.res[k] || []).concat((list || []).filter(x => !have.has(x.at))).sort((x, y) => x.at - y.at); }
  a.gone = { ...(b.gone || {}), ...a.gone }; dropGone(a); // ניסיון שהוסר במכשיר אחד לא חוזר מהשני
  a.keys = { ...(b.keys || {}), ...a.keys }; a.fix = { ...(b.fix || {}), ...a.fix }; a.read = { ...(b.read || {}), ...a.read };
  const wa = new Set(a.wr.map(x => x.at)); a.wr = a.wr.concat((b.wr || []).filter(x => !wa.has(x.at))).sort((x, y) => x.at - y.at);
  for (const [w, v] of Object.entries(b.voc || {})) if (v && (!a.voc[w] || (v.at || 0) > (a.voc[w].at || 0))) a.voc[w] = v; // מילים: המצב האחרון של כל מילה
  for (const [k, v] of Object.entries(b.prac || {})) if (v && (!a.prac[k] || (v.at || 0) > (a.prac[k].at || 0))) a.prac[k] = v; // בתרגול חופשי: הגרסה האחרונה של הפרק
  if (b.examDate && (!a.examDateAt || (b.examDateAt || 0) > a.examDateAt)) { a.examDate = b.examDate; a.examDateAt = b.examDateAt; }
  return before !== JSON.stringify([a.res, a.keys, a.fix, a.wr, a.read, a.examDate, a.prac, a.voc, a.gone, a.dh, a.sims]);
}
// מוחקים מ-res כל ניסיון שהוסר. פרק שלא נשאר לו ניסיון נראה כאילו לא נעשה, והפעם הבאה שלו נכנסת לנתונים כרגיל
function dropGone(s) {
  for (const g of Object.keys(s.gone || {})) {
    const i = g.lastIndexOf('@'), k = g.slice(0, i), at = +g.slice(i + 1);
    if (s.res && s.res[k]) { s.res[k] = s.res[k].filter(x => x.at !== at); if (!s.res[k].length) delete s.res[k]; }
  }
}
function removeAtt(key, k) { // רועי 22/11: «אפשרות להסיר כאילו לא עשיתי אותו», לפרק שנעשה בטעות
  const a = (S.res[key] || [])[k]; if (!a) return;
  if (!confirm('להסיר את הפרק הזה מהנתונים?\n\nהוא ייעלם מהציון, מהמגמה, מהחוזקות ומ«טעויות», כאילו לא עשית אותו. כשתעשה אותו שוב, הוא ייכנס לנתונים כרגיל.\n\nאי אפשר לבטל.')) return;
  S.gone[`${key}@${a.at}`] = Date.now(); dropGone(S); save(); toast('הפרק הוסר מהנתונים'); go('home');
}
async function cloudSync() { // מושכים, ממזגים, ושומרים את האיחוד. ככה מכשיר שנשאר פתוח לא מוחק את מה שנעשה במכשיר אחר
  if (!cloudId) return;
  try {
    const got = await cloudRpc('psycho_load', { p_id: cloudId });
    const changed = mergeS(S, got.data); fixPre(S);
    try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { }
    const { cur, vl, vc, vs, ...data } = S; // שיעור מילים וכרטיסיות באמצע נשארים במכשיר
    const r = await cloudRpc('psycho_save', { p_id: cloudId, p_data: data });
    cloudAt = r.at || new Date().toISOString(); cloudErr = false;
    if (changed && !['exam', 'wx'].includes(view)) reRender(); else if (['home', 'settings'].includes(view)) reRender();
  } catch (e) { cloudErr = true; if (['home', 'settings'].includes(view)) reRender(); }
}
const reRender = () => { const y = scrollY; render(); scrollTo(0, y); };
function cloudSoon() { if (!cloudId) return; clearTimeout(cloudT); cloudT = setTimeout(cloudSync, 1500); }
const cloudLine = () => cloudId ? (cloudErr ? '⚠️ השמירה בענן נכשלה, ננסה שוב. בינתיים נשמר במכשיר.' : cloudAt ? `☁️ נשמר בענן · ${new Date(cloudAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : '☁️ מתחבר לענן…') : '';

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
const qid = (key, n) => key.replace(':', '/') + '-' + n;          // התמונה של שאלה
const sid = (key, from) => key.replace(':', '/') + '-s' + from;   // התמונה של קטע קריאה / תרשים
const qBox = (id, url) => `<div class="qi" data-q="${id}" data-u="${url}" onclick="zoomQ(this)">${IMG[id] ? `<img src="${IMG[id]}" alt="">` : '<span class="mut sm">טוען…</span>'}</div>`;
// גודל אחיד לכל השאלות: עמוד של מאל״ו (כ-480 נקודות רוחב תוכן) ממלא את העמודה, עד פי 1.75 (כ-18 פיקסלים לאות).
// תמונה צרה יותר לא נמתחת, כדי שגודל האותיות יהיה זהה בכל השאלות.
const IMG_ZOOM = 2.5; // הרזולוציה שבה qimg.py מרנדר
function sizeQ(img) {
  const cw = img.parentNode.clientWidth - 10; if (cw <= 0 || !img.naturalWidth) return;
  const sc = Math.min(1.75, cw / 480); img.style.width = Math.min(cw, img.naturalWidth / IMG_ZOOM * sc) + 'px';
}
function hydrate() { // ממלא את התמונות אחרי הציור. אם לא נטענה: קישור לעמוד בקובץ של מאל״ו
  document.querySelectorAll('.qi[data-q]').forEach(el => {
    const has = el.querySelector('img');
    if (has) { if (has.complete) sizeQ(has); else has.onload = () => sizeQ(has); return; }
    qImg(el.dataset.q).then(u => { el.innerHTML = `<img src="${u}" alt="">`; const im = el.firstChild; if (im.complete) sizeQ(im); else im.onload = () => sizeQ(im); },
      () => { el.innerHTML = `<span class="sm">${IK ? 'התמונה לא נטענה. ' : '🔒 צריך את קוד הגישה כדי לראות את השאלה. '}<a href="${el.dataset.u}" target="_blank" rel="noopener" onclick="event.stopPropagation()">לפתוח בקובץ של מאל״ו ↗</a></span>`; });
  });
}
document.addEventListener('toggle', ev => { if (ev.target.querySelectorAll) ev.target.querySelectorAll('.qi img').forEach(sizeQ); }, true); // תמונה בתוך חלון שנפתח
let rsT = null; addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => document.querySelectorAll('.qi img').forEach(sizeQ), 150); });
function zoomQ(el) { // לחיצה על תמונה: מסך מלא, פי 2, עם גלילה לכל הכיוונים
  const im = el.querySelector('img'); if (!im) return;
  const z = document.createElement('div'); z.className = 'zoom'; z.dataset.q = el.dataset.q || ''; z.innerHTML = `<button class="icb" onclick="this.parentNode.remove()">✕ סגירה</button><div class="zin"><img src="${im.src}" alt=""></div>`;
  document.body.appendChild(z); const zi = z.querySelector('.zin'); zi.scrollLeft = zi.scrollWidth;
}
// psg: כמה שאלות הבנה והסקה שנוגעות לקטע אחד («שאלות 10-12 נוגעות לקטע הבא»), רועי 25/11. הקטע מוצג לידן כמו בהבנת הנקרא
const isUnit = sec => !!sec && (['reading', 'chart'].includes(sec.type) || !!sec.psg);
const wideNow = () => matchMedia('(min-width: 900px)').matches;
const psgBox = (key, sec, open) => { const { e, c } = chByKey[key]; return `<details class="psg" ${open || wideNow() ? 'open' : ''}><summary>📖 ${sec.type === 'chart' ? 'התרשים' : 'הקטע'} (שאלות ${sec.from} עד ${sec.to})</summary>${qBox(sid(key, sec.from), pdf(e, secPage(c, sec)))}</details>`; };
const fmBox = key => { const { e, c } = chByKey[key]; return c.domain === 'quant' && e.formulasPage ? `<details class="psg"><summary>📐 דף הנוסחאות</summary>${qBox(e.id + '/f', pdf(e, e.formulasPage))}</details>` : ''; };
const layout = (side, body) => side ? `<div class="two"><div class="side">${side}</div><div>${body}</div></div>` : `<div class="one">${body}</div>`;
function chapterRows(key, rowFn) { // כל השאלות של פרק לפי סוג. קטע קריאה / תרשים עומד בצד של השאלות שלו
  const { e, c } = chByKey[key], secs = c.sections && c.sections.length ? c.sections : [{ type: null, from: 1, to: c.questions }];
  return secs.map(sec => {
    const pv = secs[secs.indexOf(sec) - 1]; let inner = sec.type && !(pv && pv.type === sec.type) ? `<div class="sech">${TYPE_HE[sec.type]}</div>` : '';
    for (let n = sec.from; n <= sec.to; n++) inner += qBox(qid(key, n), pdf(e, qPage(c, n))) + rowFn(n - 1);
    return layout(isUnit(sec) ? psgBox(key, sec, true) : '', inner);
  }).join('');
}
function qView(key, n, passage) { // השאלה, ולפניה הקטע / התרשים שלה. passage: 'open' | 'closed' | ''
  const { e, c } = chByKey[key], t = typeOf(c, n), s = secOf(c, n);
  const psg = passage && s && isUnit(s) ? `<details class="psg" ${passage === 'open' ? 'open' : ''}><summary>📖 ${t === 'chart' ? 'התרשים' : 'הקטע'} (שאלות ${s.from} עד ${s.to})</summary>${qBox(sid(key, s.from), pdf(e, secPage(c, s)))}</details>` : '';
  const fm = passage && c.domain === 'quant' && e.formulasPage ? `<details class="psg"><summary>📐 דף הנוסחאות</summary>${qBox(e.id + '/f', pdf(e, e.formulasPage))}</details>` : '';
  return psg + qBox(qid(key, n), pdf(e, qPage(c, n))) + fm;
}
const qPage = (c, n) => (c.qpages && c.qpages[n - 1]) || c.page; // העמוד של השאלה בקובץ
const secOf = (c, n) => (c.sections || []).find(s => n >= s.from && n <= s.to);
const secPage = (c, s) => Math.min(qPage(c, s.from), s.from > 1 ? qPage(c, s.from - 1) + 1 : c.page); // קטע קריאה או תרשים מתחיל לפני השאלה הראשונה שלו
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
function go(v, a) { dPause(); view = v; arg = a ?? null; render(); scrollTo(0, 0); }
const link = (u, t, cls = 'btn ghost') => `<a class="${cls}" style="text-decoration:none" href="${u}" target="_blank" rel="noopener">${t}</a>`;

// ===== חישובים (רק מהתשובות שלך מול המפתח הרשמי) =====
const first = k => (S.res[k] || [])[0];
const keyOf = k => (SOL[k] && SOL[k].k) || S.keys[k] || '';
const isVoid = (k, n) => !!(SOL[k] && SOL[k].v && SOL[k].v.includes(n)); // שאלה שמאל״ו ביטלו: לא נחשבת טעות
// רועי 25/11: «תשנה שצדקתי». שאלה שהתמונה שלה הוצגה בלי נתון (חיתוך שגוי ב-qimg.py, תוקן 25/11) נספרת כנכונה בכל ניסיון שנעשה לפני התיקון.
// BADQ: "פרק#שאלה" → מתי התמונה תוקנה. ממלאים מתוך הבדיקה של כל התמונות.
const FIX_IMG = Date.parse('2026-11-25T11:00:00Z');
const BADQ = Object.fromEntries([
  'winter_2023:3#14', // «x פעמים» מעל הסוגר נחתך
  'winter_2021:3#8', // המונה 26 נחתך
  'autumn_2023:1#10', 'autumn_2023:1#11', 'autumn_2023:1#12', // הקטע והסרטוט של שאלות 10-12 לא הוצגו
  'spring_2023:0#14', 'spring_2023:0#15', 'spring_2023:0#16', // הקטע של שאלות 14-16 לא הוצג
  'summer_2024:1#13', 'summer_2024:1#14', // הנתון של שאלות 13-14 לא הוצג
  'winter_2022:1#10', 'winter_2022:1#11', // הקטע (כתב הצופן) של שאלות 10-11 לא הוצג
].map(k => [k, FIX_IMG]));
const badQ = (k, n, at) => !!(BADQ[k + '#' + n] && (at || 0) < BADQ[k + '#' + n]);
const okQ = (k, n, v, key, at) => (v && v === +key[n - 1]) || isVoid(k, n) || badQ(k, n, at);
const expOf = (k, n) => (SOL[k] && SOL[k].x[n - 1]) || '';
let opening = true; // בזמן שהמפתחות נפתחים בטעינה לא מציגים «נעול»
const locked = () => !opening && !!window.SOLX && !Object.keys(SOL).length;
const expHtml = t => esc(t).replace(/\n/g, '<br>');
const EXP_NOTE = 'ההסברים נכתבו לפי המפתח הרשמי של מאל״ו. מאל״ו לא מפרסמים הסברים לבחינות, רק את המפתח.';
// שאלות שתורגלו לפני הפרק בזמן (רועי 23/11: «עושה מבחנים בשאלות שתרגלתי כבר וזה הורס לי את אפקט המבחן»).
// a.pre = מספרי השאלות שנענו בתרגול לפני שהפרק התחיל. רועי 24/11: «שבכל מקרה יחושב בציון» — הן נספרות בציון כרגיל, ורק מסומנות 🧘 בתוצאה, עם הנכונות בלעדיהן לידיעה.
const pracQs = k => ((S.prac[k] || {}).ans || []).map((v, i) => v ? i + 1 : 0).filter(Boolean);
function fixPre(s) { // ניסיון מלפני 23/11: מה שתורגל, אם התרגול האחרון בפרק היה לפני הניסיון. נקבע פעם אחת ונשמר
  for (const [k, list] of Object.entries(s.res || {})) (list || []).forEach(a => {
    if (a.pre) return; const p = (s.prac || {})[k];
    a.pre = p && (p.at || 0) < a.at ? (p.ans || []).map((v, i) => v ? i + 1 : 0).filter(Boolean) : [];
  });
}
fixPre(S);
const scored = k => {
  const a = first(k), key = keyOf(k); if (!a || !key) return null;
  return a.ans.reduce((n, x, i) => n + (okQ(k, i + 1, x, key, a.at) ? 1 : 0), 0);
};
const done = () => CH.filter(x => first(x.key));

// ===== אומדן הציון: הטבלאות הרשמיות שבסוף כל בחינה של מאל״ו (מוצפנות ב-sol.js) =====
// כמו אצל מאל״ו: תשובות נכונות בשני הפרקים של תחום → ציון תחום (50 עד 150) לפי הטבלה של אותה בחינה,
// ממוצע מילולי וכמותי (דו-תחומי) → טווח הציון הכללי. מטלת הכתיבה לא נכללת באומדן, גם אצל מאל״ו.
const scaleOf = id => SOL[`${id}:scale`] || null;
function domScore(e, d) {
  const t = scaleOf(e.id); if (!t) return null;
  const cs = CH.filter(x => x.e === e && x.c.domain === d), got = cs.filter(x => first(x.key) && keyOf(x.key));
  if (!got.length) return null;
  // שאלה שמאל״ו ביטלו לא נספרת בכלל (גם הטבלה שלהם קצרה בשורה), בניגוד ל«נכון» שמוצג בפרק
  const nv = x => (SOL[x.key] && SOL[x.key].v || []).length;
  const raw = got.reduce((n, x) => n + scored(x.key) - nv(x), 0), n = got.reduce((s, x) => s + x.c.questions - nv(x), 0), max = cs.reduce((s, x) => s + x.c.questions - nv(x), 0);
  const full = got.length === cs.length, tab = d === 'verbal' ? t.v : t.q;
  // פרק אחד מתוך שניים: מכפילים את אחוז הנכונות לכל התחום (הערכה זמנית, מסומנת *) עד שהפרק השני נעשה
  return { s: tab[Math.min(tab.length - 1, full ? raw : Math.round(raw * max / n))], raw, n, full };
}
function genScore(t, w) { // ציון משוקלל → שורת הטבלה של מאל״ו (טווח) + המקום בתוך הטווח לפי המשוקלל
  const g = t.g.find(r => w <= r[1]) || t.g[t.g.length - 1];
  const est = g[1] === g[0] ? g[2] : Math.round(g[2] + (Math.max(w, g[0]) - g[0]) / (g[1] - g[0]) * (g[3] - g[2]));
  const p = t.p.find(r => est <= r[1]) || t.p[t.p.length - 1];
  return { lo: g[2], hi: g[3], est, below: p[2] };
}
function examScore(e) {
  const t = scaleOf(e.id); if (!t) return null;
  const V = domScore(e, 'verbal'), Q = domScore(e, 'quant');
  const G = V && Q ? genScore(t, (V.s + Q.s) / 2) : null;
  return { V, Q, G, full: !!(V && Q && V.full && Q.full), VE: G && genScore(t, (3 * V.s + Q.s) / 4), QE: G && genScore(t, (3 * Q.s + V.s) / 4) };
}
const lastAt = e => Math.max(0, ...CH.filter(x => x.e === e && first(x.key)).map(x => first(x.key).at));
const scoredExams = () => EX.map(e => ({ e, sc: examScore(e), at: lastAt(e) })).filter(x => x.sc && x.sc.G).sort((a, b) => a.at - b.at);
function scoreCard(e) {
  const sc = examScore(e);
  if (!sc) return `<div class="card" style="margin-top:12px"><b>הציון המשוער לפי מאל״ו</b><p class="sm" style="margin:4px 0 8px">${locked() ? 'האומדן מחושב באפליקציה אחרי שפותחים את המפתחות עם קוד הגישה.' : 'לבחינה הזו עוד אין באפליקציה את טבלת ההמרה של מאל״ו.'} בסוף הקובץ יש את הטבלה הרשמית${e.scorePages ? `, <b>בעמודים ${e.scorePages[0]} עד ${e.scorePages[1]}</b>` : ''}. בשביל ציון בתחום צריך את שני הפרקים של אותו תחום מאותה בחינה.</p>${e.scorePages ? link(pdf(e, e.scorePages[0]), '📄 לטבלת הציונים של מאל״ו') : link(NITE_SCORES, 'ציונים באתר מאל״ו ↗')}</div>`;
  const { V, Q, G } = sc;
  const dk = (d, x) => `<div class="kpi"><b>${x ? x.s + (x.full ? '' : '*') : '—'}</b><span>${DOM[d]}${x ? ` · ${x.raw}/${x.n} נכון` : ''}</span></div>`;
  const left = CH.filter(x => x.e === e && !first(x.key));
  return `<div class="card" style="margin-top:12px"><b>הציון המשוער ב${esc(e.title)}, לפי הטבלאות של מאל״ו</b>
  ${G ? `<div class="big-score" style="font-size:40px">${G.est}${sc.full ? '' : '*'}</div><div style="text-align:center" class="sm">טווח האומדן של מאל״ו: <b>${G.lo} עד ${G.hi}</b> · כ-${G.below}% מהנבחנים קיבלו פחות</div>` : ''}
  <div class="kpis">${dk('verbal', V)}${dk('quant', Q)}<div class="kpi"><b>${G ? G.est + (sc.full ? '' : '*') : '—'}</b><span>כללי</span></div></div>
  ${G ? `<p class="mut sm" style="margin:0 0 6px">בדגש מילולי: ${sc.VE.est} · בדגש כמותי: ${sc.QE.est}</p>` : ''}
  <p class="sm" style="margin:4px 0 8px">${sc.full ? 'זה האומדן הרשמי של מאל״ו לבחינה הזו: נכונות בשני הפרקים של כל תחום, ציון תחום מהטבלה של הבחינה, והטווח הכללי מהממוצע של שני התחומים. המספר הגדול הוא המקום בתוך הטווח.' : `* זמני: ${left.length} ${left.length === 1 ? 'פרק' : 'פרקים'} מהבחינה הזו עוד לא נעשו. בתחום שנעשה בו רק פרק אחד, אחוז הנכונות הוכפל לשני הפרקים והומר בטבלה של מאל״ו. ${G ? '' : 'ציון כללי מופיע אחרי פרק מכל תחום. '}האומדן נהיה רשמי כשכל ארבעת הפרקים נעשו.`} נספר הניסיון הראשון בכל פרק, כמו בבחינה. מאל״ו לא כוללים את מטלת הכתיבה באומדן.</p>
  ${left.length ? `<div class="row">${left.slice(0, 1).map(x => `<button class="btn blue" onclick="go('home',{pick:'${x.key}'})">לפרק הבא בבחינה הזו</button>`).join('')}</div>` : ''}</div>`;
}
const todayCh = dom => { // קודם פרק נקי (לא נעשה ולא תורגל), ואחריו הפרק שתורגלו בו הכי מעט שאלות. dom: רק מילולי / רק כמותי
  const L = CH.filter(x => !first(x.key) && (!dom || x.c.domain === dom)); if (!L.length) return null;
  return L.find(x => !pracQs(x.key).length) || L.slice().sort((a, b) => taint(a.key) - taint(b.key) || pracQs(a.key).length - pracQs(b.key).length)[0];
};
// רועי 23/11: עדיפות לפרק «גם לפי כמה שתורגלו פחות, וגם לפי כמה שתורגלו ממזמן». מספר השאלות שתורגלו, ומשקל שיורד ככל שעבר זמן מהתרגול האחרון בפרק
// (היום = מלא, אחרי 3 ימים = חצי, אחרי שבוע = כשליש). הזמן נשמר לכל פרק, לא לכל שאלה
const pracDays = k => { const p = S.prac[k]; return p && p.at ? Math.max(0, (Date.now() - p.at) / 864e5) : 99; };
const taint = k => pracQs(k).length / (1 + pracDays(k) / 3);
function daysLeft() { return Math.ceil((new Date(S.examDate + 'T08:00:00') - new Date()) / 864e5); }
function streak() {
  const days = new Set(); Object.values(S.res).forEach(a => a.forEach(x => days.add(dayKey(x.at)))); S.wr.forEach(x => days.add(dayKey(x.at)));
  let n = 0, t = Date.now(); if (!days.has(dayKey(t))) t -= 864e5;
  while (days.has(dayKey(t))) { n++; t -= 864e5; } return n;
}
function answered() { // כל שאלה שנענתה בניסיון הראשון, בפרקים שיש להם מפתח
  const out = [];
  done().forEach(({ e, c, key }) => { const a = first(key), k = keyOf(key); if (!k) return; for (let i = 0; i < c.questions; i++) out.push({ e, c, key, n: i + 1, type: typeOf(c, i + 1), a: a.ans[i], right: +k[i], ok: okQ(key, i + 1, a.ans[i], k, a.at) }); });
  return out;
}

// ===== מגמה: הרמה שלך לאורך הזמן, ומה הציון שהיא שווה =====
// רמה = אחוז נכון ב-LV_N הפרקים האחרונים של התחום (ניסיון ראשון). הציון שהרמה שווה = ממוצע על הטבלאות של כל הבחינות של מאל״ו,
// כדי שלא יהיה תלוי בטבלה של בחינה אחת. כך רואים איך שיפור באחוזים הופך לנקודות.
// 5 ולא 3 (23/11, רועי: «3 או 5, מה שאתה חושב»): 3 פרקים כמותיים = 60 שאלות, והאחוז קפץ בכ-±5% (כ-±15 נקודות) מפרק לפרק. 5 = 100 שאלות, יציב יותר, ועדיין מתעדכן תוך יום-יומיים.
const LV_N = 5;
const sgn = v => `<span dir="ltr">${v >= 0 ? '+' : ''}${v}</span>`; // מספר עם סימן, שלא יתהפך בעברית
function chHist() { // כל הפרקים שיש להם מפתח, לפי הזמן שבו נעשו
  return done().filter(x => keyOf(x.key)).map(x => ({ x, at: first(x.key).at, d: x.c.domain, ok: scored(x.key), n: x.c.questions })).sort((a, b) => a.at - b.at);
}
function level(h, d, upto = h.length - 1) { // [אחוז, כמה פרקים נכנסו]
  const l = h.slice(0, upto + 1).filter(y => y.d === d).slice(-LV_N);
  return l.length ? [l.reduce((s, y) => s + y.ok, 0) / l.reduce((s, y) => s + y.n, 0), l.length] : null;
}
function worth(pv, pq) { // אחוז במילולי ובכמותי → ציון משוער, ממוצע על כל הטבלאות
  const r = EX.map(e => scaleOf(e.id)).filter(Boolean).map(t => {
    const V = t.v[Math.round(Math.min(1, pv) * (t.v.length - 1))], Q = t.q[Math.round(Math.min(1, pq) * (t.q.length - 1))];
    return { V, Q, G: genScore(t, (V + Q) / 2).est };
  });
  if (!r.length) return null;
  const av = k => Math.round(r.reduce((s, y) => s + y[k], 0) / r.length);
  return { V: av('V'), Q: av('Q'), G: av('G') };
}
function scoreTrend(h) { // אחרי כל פרק: הרמה בכל תחום והציון שהיא שווה (רק כשיש כבר פרק בשני התחומים)
  return h.map((y, i) => { const v = level(h, 'verbal', i), q = level(h, 'quant', i); return { y, i, v, q, w: v && q ? worth(v[0], q[0]) : null }; });
}
// רועי 25/11: «במקום 0 עד 100 יותר מצומצם, שאבין מה באמת המיקום שלי». ציר y נחתך סביב הנתונים, עם קווים כל 5 או 10
function zoomAxis(vals, o) { // o: {step, pad, lo, hi} → {min, max, ticks}
  const v = vals.filter(x => x != null && isFinite(x)); if (!v.length) return { min: o.lo, max: o.hi, ticks: [o.lo, o.hi] };
  let step = o.step, lo, hi;
  for (;;) {
    lo = Math.max(o.lo, Math.floor((Math.min(...v) - o.pad) / step) * step); hi = Math.min(o.hi, Math.ceil((Math.max(...v) + o.pad) / step) * step);
    if (hi - lo < 2 * step) { if (hi + step <= o.hi) hi += step; else lo -= step; }
    if ((hi - lo) / step <= 6) break; step *= 2;
  }
  const ticks = []; for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(t);
  return { min: lo, max: hi, ticks };
}
const pctAxis = vals => zoomAxis(vals, { step: 5, pad: 3, lo: 0, hi: 100 });
function lineChart(series, o) { // גרף קווים פשוט: series = [{c, name, pts:[[i, v, tip]]}], ציר x = מספר הפרק לפי הסדר
  const W = 600, H = o.h || 260, L = 64, R = 74, T = 14, B = 34, N = Math.max(2, o.n);
  const X = i => L + i * (W - L - R) / (N - 1), Y = v => T + (o.max - v) * (H - T - B) / (o.max - o.min);
  let g = o.ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 8}" y="${Y(v) + 6}" text-anchor="end" font-size="19" fill="var(--mut)">${o.fmt(v)}</text>`).join('');
  const xl = o.xl || ['פרק 1', `פרק ${o.n}`];
  g += `<text x="${L}" y="${H - 6}" font-size="19" fill="var(--mut)">${xl[0]}</text><text x="${W - R}" y="${H - 6}" text-anchor="end" font-size="19" fill="var(--mut)">${xl[1]}</text>`;
  series.forEach(s => {
    if (!s.pts.length) return;
    if (s.pts.length > 1) g += `<polyline fill="none" stroke="${s.c}" stroke-width="3" stroke-linejoin="round" ${s.dash ? 'stroke-dasharray="5 4"' : ''} points="${s.pts.map(p => `${X(p[0])},${Y(p[1])}`).join(' ')}"/>`;
    if (s.dots) g += s.pts.map(p => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="7" fill="${s.c}" stroke="var(--bg)" stroke-width="2"><title>${esc(p[2] || '')}</title></circle>`).join('');
    const z = s.pts[s.pts.length - 1]; if (s.label) g += `<text x="${X(z[0]) + 12}" y="${Y(z[1]) + 7}" font-size="21" font-weight="700" fill="var(--ink)" stroke="var(--bg)" stroke-width="6" paint-order="stroke">${o.fmt(z[1])}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;direction:ltr" role="img" aria-label="${esc(o.aria)}">${g}</svg>`;
}
// מגמה לכל סוג שאלה: אחוז נכון בכל פרק שהיה בו הסוג הזה (לפי הזמן), והזמן הממוצע לשאלה כשנמדד (a.t, מ-21/11)
function typeTrendHtml(h) {
  const pc = v => Math.round(v * 100) + '%';
  const cards = Object.keys(TYPE_HE).map(ty => {
    const P = h.map(y => {
      const a = first(y.x.key), key = keyOf(y.x.key), qs = []; for (let n = 1; n <= y.n; n++) if (typeOf(y.x.c, n) === ty) qs.push(n);
      if (!qs.length) return null;
      const ok = qs.filter(n => okQ(y.x.key, n, a.ans[n - 1], key, a.at)).length;
      return { y, ok, n: qs.length, t: a.t ? qs.reduce((s, n) => s + (a.t[n - 1] || 0), 0) / qs.length : null };
    }).filter(Boolean);
    if (!P.length) return '';
    const d = P[0].y.d, col = d === 'verbal' ? 'var(--o)' : 'var(--b)', last = P.slice(-LV_N), lv = last.reduce((s, p) => s + p.ok, 0) / last.reduce((s, p) => s + p.n, 0), p0 = P[0].ok / P[0].n;
    const ax = pctAxis(P.map(p => 100 * p.ok / p.n));
    const chart = P.length > 1 ? lineChart([{ c: col, dots: true, label: true, pts: P.map((p, i) => [i, 100 * p.ok / p.n, `${chTitle(p.y.x)}: ${p.ok}/${p.n}`]) }], { n: P.length, h: 200, ...ax, fmt: v => Math.round(v) + '%', xl: ['הראשון', 'האחרון'], aria: TYPE_HE[ty] }) : '';
    const T = P.filter(p => p.t != null), dl = Math.round((lv - p0) * 100);
    const tl = T.length ? `<p class="sm" style="margin:4px 0 0">⏱️ זמן לשאלה: ${T.length > 1 ? `${mmss(T[0].t)} בפעם הראשונה שנמדד → <b>${mmss(T[T.length - 1].t)}</b> בפרק האחרון` : `<b>${mmss(T[0].t)}</b> (נמדד בפרק אחד עד עכשיו)`}</p>` : '';
    return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><b><span class="tag ${d[0]}">${DOM[d]}</span> ${TYPE_HE[ty]}</b><span class="sm">עכשיו <b>${pc(lv)}</b></span></div>
      ${chart}
      <p class="sm" style="margin:4px 0 0">${P.length > 1 ? `בפרק הראשון ${pc(p0)} (${P[0].ok}/${P[0].n}) · ממוצע ${last.length} האחרונים ${pc(lv)} <b>(${sgn(dl)})</b>` : `פרק אחד עד עכשיו: ${P[0].ok}/${P[0].n}. מהפרק הבא תראה כאן קו.`}</p>${tl}</div>`;
  }).join('');
  return cards ? `<h2>כל חלק לאורך הזמן</h2><p class="mut sm" style="margin-top:-4px">לכל סוג שאלה: אחוז נכון בכל פרק שהיה בו, לפי הסדר שעשית אותם. «עכשיו» = ממוצע ${LV_N} הפרקים האחרונים.</p>${cards}` : '';
}
function trendHtml() {
  const h = chHist(), T = scoreTrend(h), now = T.length ? T[T.length - 1] : null;
  if (!now || !now.w) return `<div class="card"><p class="sm" style="margin:0">המגמה מופיעה אחרי שיש לפחות פרק אחד מילולי ופרק אחד כמותי (עם מפתח).</p></div>`;
  const pc = v => Math.round(v * 100) + '%', V = 'var(--o)', Q = 'var(--b)';
  const tip = y => `${chTitle(y.x)} · ${y.ok}/${y.n} · ${fmtDate(y.at)}`;
  // גרף 1: אחוז נכון בכל פרק (נקודות), והרמה של LV_N הפרקים האחרונים (קו)
  const ser = d => [{ c: d === 'verbal' ? V : Q, dots: true, pts: h.map((y, i) => y.d === d ? [i, 100 * y.ok / y.n, tip(y)] : null).filter(Boolean) },
  { c: d === 'verbal' ? V : Q, label: true, pts: T.map(t => (d === 'verbal' ? t.v : t.q) && t.y.d === d ? [t.i, 100 * (d === 'verbal' ? t.v : t.q)[0]] : null).filter(Boolean) }];
  const s1 = [...ser('verbal'), ...ser('quant')], ax1 = pctAxis(s1.flatMap(x => x.pts.map(p => p[1])));
  const c1 = lineChart(s1, { n: h.length, ...ax1, fmt: v => Math.round(v) + '%', aria: 'אחוז נכון בכל פרק' });
  // גרף 2: הציון שהרמה שווה, אחרי כל פרק
  const sp = T.filter(t => t.w).map(t => [t.i, t.w.G, `אחרי ${tip(t.y)}: ${t.w.G}`]), gs = sp.map(p => p[1]);
  const ax2 = zoomAxis(gs, { step: 10, pad: 8, lo: 200, hi: 800 });
  const c2 = lineChart([{ c: 'var(--g)', dots: true, label: true, pts: sp }], { n: h.length, ...ax2, fmt: v => Math.round(v), aria: 'הציון המשוער לפי הרמה שלך' });
  const first1 = sp[0][1], dG = now.w.G - first1, [pv, nv] = now.v, [pq, nq] = now.q;
  // כמה שווה שיפור: שאלה נכונה נוספת בכל פרק, ויעדים באחוזים
  const plusV = worth(pv + 1 / 23, pq).G - now.w.G, plusQ = worth(pv, pq + 1 / 20).G - now.w.G;
  const goals = [...[0.5, 0.6, 0.7, 0.8].filter(p => p > pv + 0.02).map(p => ({ l: `מילולי ${pc(p)}`, s: worth(p, pq).G })),
  ...[0.8, 0.85, 0.9].filter(p => p > pq + 0.02).map(p => ({ l: `כמותי ${pc(p)}`, s: worth(pv, p).G }))];
  return `<div class="card">
    <div class="kpis" style="margin-top:0"><div class="kpi"><b>${pc(pv)}</b><span>מילולי עכשיו${nv < LV_N ? ` (${nv} פרק${nv > 1 ? 'ים' : ''})` : ''}</span></div><div class="kpi"><b>${pc(pq)}</b><span>כמותי עכשיו</span></div><div class="kpi"><b>${now.w.G}</b><span>הציון שזה שווה</span></div></div>
    <p class="sm" style="margin:0">«עכשיו» = ${LV_N} הפרקים האחרונים בכל תחום. הציון: הממוצע לפי הטבלאות של כל ${EX.length} הבחינות של מאל״ו (מילולי ${now.w.V}, כמותי ${now.w.Q}).${sp.length > 1 ? ` מאז שיש ציון: ${sgn(dG)} נקודות.` : ''}</p></div>
  <h2>אחוז נכון בכל פרק</h2><div class="card">${c1}<div class="legend"><span style="--c:var(--o)">מילולי</span><span style="--c:var(--b)">כמותי</span></div>
    <p class="mut sm" style="margin:6px 0 0">נקודה = פרק, לפי הסדר שעשית אותם. קו = הרמה (ממוצע ${LV_N} הפרקים האחרונים בתחום).</p></div>
  <h2>הציון שהרמה שלך שווה</h2><div class="card">${c2}<p class="mut sm" style="margin:6px 0 0">אחרי כל פרק: כמה הייתה שווה הרמה שלך באותו רגע.</p></div>
  <h2>כמה הציון יעלה</h2><div class="card">
    <p class="sm" style="margin-top:0">כל תשובה נכונה נוספת בכל פרק מילולי: <b>${sgn(plusV)}</b> נקודות בערך. בכל פרק כמותי: <b>${sgn(plusQ)}</b>.</p>
    <div class="list">${goals.map(g => `<div class="it" style="cursor:default"><div class="grow">אם תגיע ל<b>${g.l}</b></div><b>${g.s}</b><span class="mut sm">(${sgn(g.s - now.w.G)})</span></div>`).join('')}</div>
    <p class="mut sm" style="margin:6px 0 0">והתחום השני נשאר כמו עכשיו.${nv < LV_N || nq < LV_N ? ' ככל שתעשה יותר פרקים, המגמה תהיה אמינה יותר.' : ''}</p></div>
  ${typeTrendHtml(h)}`;
}

// ===== מסכים =====
const NAV_OF = { simres: 'all', fix: 'prac', retry: 'prac', free: 'prac', drill: 'prac', hist: 'prac', pq: 'prac', keyin: 'all', result: 'all', vles: 'voc', vcards: 'voc', vlist: 'voc', vsort: 'voc' };
function navBar() {
  const it = [['home', '🏠', 'היום'], ['all', '⏱️', 'בחינות'], ['prac', '🧘', 'תרגול'], ['voc', '🔤', 'מילים'], ['stats', '🎯', 'חוזקות'], ['write', '✍️', 'כתיבה'], ['learn', '📘', 'הדרכה']];
  return `<nav class="nav">${it.map(([v, ic, l]) => `<button class="${(NAV_OF[view] || view) === v ? 'on' : ''}" onclick="go('${v}')"><span class="ic">${ic}</span>${l}</button>`).join('')}</nav>`;
}
function render() {
  clearInterval(tick); tick = null;
  if (S.cur && !['exam', 'wx'].includes(view)) view = S.cur.kind === 'wr' ? 'wx' : 'exam';
  const f = { home, all, stats, fix, write, learn, settings, exam, keyin, result, wx, wres, retry, free, prac, drill, hist, pq, simres, voc, vles, vcards, vlist, vsort }[view] || home;
  $app.classList.toggle('wide', ['exam', 'free', 'drill', 'retry', 'result', 'pq'].includes(view));
  $app.innerHTML = f(); hydrate();
  if (view === 'exam' || view === 'wx') startTick();
  else if (view === 'drill' && dRun) tick = setInterval(dShow, 1000);
}
const chTitle = x => `${x.e.title} · ${x.c.label || DOM[x.c.domain]}`;
function chRow(x) {
  const a = first(x.key), sc = scored(x.key);
  const np = pracQs(x.key).length;
  const right = a ? (sc != null ? `<b>${sc}/${x.c.questions}</b>` : '<span class="mut sm">חסר מפתח</span>') + ` <span class="mut sm">${fmtDate(a.at)}</span>` : np ? `<span class="mut sm">🧘 ${np} שאלות תורגלו</span>` : '<span class="mut sm">✨ נקי</span>';
  return `<div class="it" onclick="${a ? `go('${keyOf(x.key) ? 'result' : 'keyin'}',{key:'${x.key}'})` : `go('home',{pick:'${x.key}'})`}"><span class="tag ${x.c.domain[0]}">${DOM[x.c.domain]}</span><div class="grow"><b>${esc(x.e.title)}</b><div class="mut sm">${esc(x.c.label || '')} · ${x.c.questions} שאלות · ${x.c.minutes} דק׳</div></div><div>${right}</div></div>`;
}
function chCard(x) {
  const { e, c } = x;
  return `<div class="card"><div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><span class="tag ${c.domain[0]}">${DOM[c.domain]}</span><b style="font-size:17px">${esc(e.title)}</b></div>
    <p class="mut sm" style="margin:2px 0 10px">${esc(c.label || '')} · ${c.questions} שאלות · ${c.minutes} דקות · <b>עמודים ${c.page} עד ${c.endPage} בקובץ</b>${c.printed ? ` (בדף: ${c.printed})` : ''}</p>
    ${pracQs(x.key).length && !first(x.key) ? `<p class="sm" style="margin:0 0 10px;color:var(--o)">🧘 כבר תרגלת ${pracQs(x.key).length} שאלות מהפרק הזה (${pracQs(x.key).join(', ')}), ${pracDays(x.key) < 1 ? 'היום' : `לפני ${Math.floor(pracDays(x.key))} ימים`}. הן נספרות בציון כרגיל, ובתוצאה יסומנו 🧘.</p>` : ''}
    <div class="row">${link(pdf(e, c.page), '📄 לפתוח את הפרק')}<button class="btn" onclick="startChap('${x.key}')">▶️ טיימר ודף תשובות</button></div>
    <p class="mut sm" style="margin:6px 0 0">פותחים את הקובץ של מאל״ו בעמוד ${c.page}, ופותרים שם. כאן מסמנים תשובות, והזמן רץ כמו בבחינה.${c.domain === 'quant' && e.formulasPage ? ` דף הנוסחאות הרשמי: עמוד ${e.formulasPage}.` : ''}</p></div>`;
}
function home() {
  const dl = daysLeft(), st = streak(), A = answered();
  const pv = A.filter(x => x.c.domain === 'verbal'), pq = A.filter(x => x.c.domain === 'quant');
  const p = l => l.length ? Math.round(100 * l.filter(x => x.ok).length / l.length) + '%' : '—';
  const pick = arg && arg.pick ? chByKey[arg.pick] : null, x = pick || todayCh(S.tDom) || todayCh();
  // רועי 23/11: «לעשות פרק נקי רק כמותי או מילולי, ולבחור». הבחירה נשמרת עד שמשנים
  const nc = d => CH.filter(y => (!d || y.c.domain === d) && cleanCh(y)).length;
  const dBtn = (d, l) => `<button class="btn ${(S.tDom || '') === d && !pick ? 'blue' : 'ghost'}" style="padding:8px 6px" onclick="S.tDom='${d}';save();go('home')">${l}<div class="sm" style="font-weight:400">✨ ${nc(d)} נקיים</div></button>`;
  const domRow = `<div class="row" style="margin:0 0 10px">${dBtn('', 'הכל')}${dBtn('verbal', 'מילולי')}${dBtn('quant', 'כמותי')}</div>`;
  let h = `<main><div class="card hero"><div class="mut sm">הפסיכומטרי הדו-תחומי · ${new Date(S.examDate).toLocaleDateString('he-IL')}</div>
    <div style="font-size:30px;font-weight:800;margin:4px 0">${dl > 0 ? `עוד ${dl} ימים` : dl === 0 ? 'הבחינה היום 💪' : 'הבחינה עברה'}</div>
    <div class="mut sm">${CH.length} פרקים אמיתיים מ-${EX.length} בחינות של מאל״ו</div></div>
    <div class="kpis"><div class="kpi"><b>${done().length}</b><span>פרקים נעשו</span></div><div class="kpi"><b>${p(pv)}</b><span>נכון במילולי (בכל הפרקים)</span></div><div class="kpi"><b>${p(pq)}</b><span>נכון בכמותי (בכל הפרקים)</span></div></div>`;
  // רועי 23/11: «זה לא מתאים» (622 כאן מול 634 במגמה). המספר הראשי = הרמה עכשיו, אותו חישוב כמו ב«📈 המגמה».
  // הציון של בחינה אחת נכנס רק לבחינה שעשית בה גם מילולי וגם כמותי, ולכן הוא יכול להיות ישן. הוא מוצג מתחת.
  const se = scoredExams(), ls = se[se.length - 1], TT = scoreTrend(chHist()), nw = TT.length ? TT[TT.length - 1] : null;
  if (nw && nw.w) h += `<div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline"><b>הציון שהרמה שלך שווה עכשיו</b><span class="mut sm">${LV_N} הפרקים האחרונים בכל תחום</span></div>
    <div class="big-score" style="font-size:40px">${nw.w.G}</div><div style="text-align:center" class="sm">מילולי ${Math.round(nw.v[0] * 100)}%${nw.v[1] < LV_N ? ` (${nw.v[1] > 1 ? nw.v[1] + ' פרקים' : 'פרק אחד'})` : ''} → ${nw.w.V} · כמותי ${Math.round(nw.q[0] * 100)}%${nw.q[1] < LV_N ? ` (${nw.q[1] > 1 ? nw.q[1] + ' פרקים' : 'פרק אחד'})` : ''} → ${nw.w.Q}</div>
    ${ls ? `<p class="mut sm" style="margin:8px 0 0">בחינה שלמה אחרונה (מילולי וכמותי מאותה בחינה): ${esc(ls.e.title)} ${ls.sc.G.est}${ls.sc.full ? '' : '*'} (טווח ${ls.sc.G.lo}-${ls.sc.G.hi})${se.length > 1 ? ` · לפני: ${se.slice(-3, -1).map(y => `${esc(y.e.title)} ${y.sc.G.est}${y.sc.full ? '' : '*'}`).join(' · ')}` : ''}</p>` : ''}
    <p class="mut sm" style="margin:6px 0 0">לפי הטבלאות של מאל״ו (ממוצע על כל ${EX.length} הבחינות). נקודת הפתיחה: 620.</p>
    <button class="btn ghost" style="margin-top:10px" onclick="go('stats');setTimeout(()=>document.getElementById('trend')&&document.getElementById('trend').scrollIntoView(),50)">📈 המגמה וכמה הציון יעלה</button></div>`;
  if (x) h += `<h2>${pick ? 'הפרק שבחרת' : 'פרק היום'}${st ? ` <span class="mut sm">· ${st} ימים ברצף 🔥</span>` : ''}</h2>${domRow}${!pick && S.tDom && !todayCh(S.tDom) ? `<p class="sm">עשית את כל הפרקים ב${DOM[S.tDom]}, אז הנה פרק מהתחום השני.</p>` : ''}${chCard(x)}`;
  else h += `<div class="card"><b>עשית את כל הפרקים 🎉</b><p class="mut sm">אפשר לעשות פרק שוב מ«בחינות», או לתרגל ב«פסיכורשת».</p></div>`;
  if (VOC.length) { const d = vDue().length, l = VOC.filter(vLearned).length; h += `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b>🔤 מילים</b><div class="mut sm">${l} מתוך ${VOC.length} נלמדו${d ? ` · ${d} מחכות לחזרה` : ''}</div></div><button class="btn blue" style="width:auto;padding:10px 16px" onclick="${d || vNew().length ? "vStart('learn')" : "go('voc')"}">${d ? 'לחזרה' : 'שיעור'}</button></div></div>`; }
  if (locked()) h += codeCard();
  const miss = done().filter(y => !keyOf(y.key));
  if (miss.length) h += `<div class="card"><b>⚠️ ${miss.length} פרקים בלי מפתח תשובות</b><p class="mut sm" style="margin:4px 0 8px">בלי המפתח אין ציון ולא רואים איפה טעית.</p><button class="btn blue" onclick="go('keyin',{key:'${miss[0].key}'})">להקליד מפתח</button></div>`;
  // רועי 25/11: «זה לא באמת האחרונים» — היה לפי הסדר של הבחינות. עכשיו 3 הפרקים האחרונים לפי מתי הוגשו (כולל ניסיון חוזר וסימולציה)
  const last = CH.flatMap(x => (S.res[x.key] || []).map((a, k) => ({ x, a, k }))).sort((p, q) => q.a.at - p.a.at).slice(0, 3);
  const lastRow = ({ x, a, k }) => { const key = keyOf(x.key), ok = key ? a.ans.reduce((n, v, i) => n + (okQ(x.key, i + 1, v, key, a.at) ? 1 : 0), 0) : null;
    return `<div class="it" onclick="go('${key ? 'result' : 'keyin'}',{key:'${x.key}',k:${k}})"><span class="tag ${x.c.domain[0]}">${DOM[x.c.domain]}</span><div class="grow"><b>${esc(x.e.title)}</b>${k ? ' <span class="tag">חוזר</span>' : ''}<div class="mut sm">${esc(x.c.label || '')} · ${x.c.questions} שאלות · ${x.c.minutes} דק׳</div></div><div>${ok != null ? `<b>${ok}/${x.c.questions}</b>` : '<span class="mut sm">חסר מפתח</span>'} <span class="mut sm">${fmtWhen(a.at)}</span></div></div>`; };
  if (last.length) h += `<h2>אחרונים</h2><div class="card list">${last.map(lastRow).join('')}</div>`;
  h += `<div class="card"><b>מאל״ו:</b> <span class="sm">הציון מחושב רק לפי התשובות הנכונות, ואין הפחתת נקודות על תשובה שגויה. השאירו כדקה בסוף הפרק כדי לסמן תשובה בכל שאלה שלא הגעתם אליה.</span> ${link(NITE_TIPS, 'כל ההנחיות לנבחנים ↗', 'sm')}</div>
    <button class="btn ghost" onclick="go('settings')">⚙️ הגדרות וגיבוי</button>${cloudId ? `<p class="mut sm" style="text-align:center">${cloudLine()}</p>` : ''}</main>` + navBar();
  return h;
}
function all() {
  return `<main><h1>⏱️ הבחינות של מאל״ו</h1><p class="mut sm">כל הבחינות שמאל״ו פרסמו באתר שלהם, מהחדשה לישנה. בכל אחת 2 פרקים מילולי ו-2 כמותי, בלי אנגלית. כאן הכל בזמן, כמו בבחינה. בלי שעון: לשונית «🧘 תרגול».</p>
  ${simCard()}
  ${EX.map(e => `<h2 style="display:flex;justify-content:space-between;align-items:center">${esc(e.title)} ${link(e.url, 'הקובץ ↗', 'sm')}</h2><div class="card list">${CH.filter(x => x.e === e).map(chRow).join('')}</div>`).join('')}
  <p class="mut sm">המקור: ${link(NITE_PREP, 'דף ההכנה של מאל״ו', 'sm')}</p></main>` + navBar();
}

// ===== פרק בזמן: טיימר + דף תשובות =====
function startChap(k) {
  const x = chByKey[k]; if (!x) return;
  if (S.cur && !confirm('יש פרק אחר באמצע. לוותר עליו ולהתחיל את זה?')) return;
  const n = x.c.questions, pre = first(k) ? [] : pracQs(k); // בניסיון חוזר הציון ממילא לא נספר
  S.cur = { kind: 'chap', key: k, endAt: Date.now() + x.c.minutes * 60e3, start: Date.now(), ans: Array(n).fill(0), flag: Array(n).fill(0), t: Array(n).fill(0), last: Date.now(), pre };
  save(); go('exam');
}
// זמן לכל שאלה (X.t, בשניות): כל שנייה שהמסך פתוח נזקפת לשאלה שמול העיניים.
// מול העיניים = השאלה שמוגדלת במסך מלא, או מבין השאלות (התמונה + שורת התשובות) שרובן גלוי:
// הראשונה שעוד אין לה תשובה. כשכל הגלויות כבר נענו (חזרה לשאלה), העליונה מהן.
// רועי 23/11: «יש בעיות במדידת זמנים פר שאלה». עד אז: (1) העליונה הגלויה קיבלה את הזמן גם כשכבר נענתה וקראו את זו שמתחתיה;
// (2) במסך 1600+ התרשים בעמודה בצד נחשב כמכסה גם את השאלות שלידו, ושאלות התרשים הראשונות קיבלו 0-1 שניות.
// לכן פס או קטע נעוץ מכסה רק שאלה שנמצאת מתחתיו באותו טור.
function qFocus(X) {
  const pre = X.key.replace(':', '/') + '-', num = id => id && id.startsWith(pre) && /^\d+$/.test(id.slice(pre.length)) ? +id.slice(pre.length) - 1 : -1;
  const z = document.querySelector('.zoom'); if (z) return num(z.dataset.q);
  const stuck = [];
  document.querySelectorAll('.xtop, .two>.side').forEach(el => { // פס או קטע שנעוץ עכשיו למעלה
    const r = el.getBoundingClientRect(), st = getComputedStyle(el);
    if (st.position === 'sticky' && r.top <= (parseFloat(st.top) || 0) + 2) stuck.push(r);
  });
  const H = innerHeight; let first = -1, fa = 1e9, open = -1, oa = 1e9, skip = -1, sa = 1e9, big = -1, bv = 40;
  document.querySelectorAll(`.qi[data-q^="${pre}"]`).forEach(el => {
    const i = num(el.dataset.q); if (i < 0) return;
    const q = el.getBoundingClientRect(), a = q.top, b = (el.nextElementSibling || el).getBoundingClientRect().bottom;
    const top = stuck.reduce((t, r) => r.left < q.right - 1 && r.right > q.left + 1 && r.bottom > t ? r.bottom : t, 0); // רק מה שמעליה באותו טור
    const v = Math.min(b, H) - Math.max(a, top);
    if (v > bv) { bv = v; big = i; }
    if (v >= 0.6 * (b - a) || v >= 250) { // רובה גלוי (או לפחות 250 פיקסלים משאלה ארוכה)
      if (a < fa) { fa = a; first = i; }
      if (!X.ans[i] && !X.flag[i] && a < oa) { oa = a; open = i; } // שאלה שדילגו עליה עם 🚩 בלי תשובה לא «תופסת» את הזמן של הבאה
      if (!X.ans[i] && a < sa) { sa = a; skip = i; }
    }
  });
  return open >= 0 ? open : skip >= 0 ? skip : first >= 0 ? first : big;
}
let lastTk = 0, tkN = 0;
function startTick() {
  const upd = () => {
    const X = S.cur; if (!X) return;
    if (X.kind === 'chap') {
      const now = Date.now(), dt = Math.min(now - (lastTk || now), 3000) / 1000; lastTk = now;
      if (!document.hidden && dt > 0) {
        // אחרי תשובה (X.pin) הזמן עובר מיד לשאלה הבאה שעוד אין לה תשובה, גם אם השאלה שענית עוד מול העיניים. גוללים לשאלה אחרת → חוזרים למדידה לפי המסך.
        // זמן על שאלה שכבר יש לה תשובה = חזרה אליה (X.tb), ונספר גם בזמן שלה.
        let i = qFocus(X);
        if (X.pin != null) { if (i === X.pin || i < 0) i = X.ans.findIndex((v, j) => j > X.pin && !v); else delete X.pin; } // הבאה שעוד אין לה תשובה
        if (i >= 0) {
          (X.t = X.t || Array(X.ans.length).fill(0))[i] += dt;
          if (X.ans[i]) (X.tb = X.tb || Array(X.ans.length).fill(0))[i] += dt;
          if (++tkN % 5 === 0) try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { }
        }
      }
    }
    const left = (X.endAt - Date.now()) / 1000;
    const el = document.getElementById('tm'); if (el) { el.textContent = mmss(left); el.classList.toggle('warn', left < (X.kind === 'wr' ? 300 : 60)); }
    if (left <= 0) { toast('⏰ הזמן נגמר'); X.kind === 'wr' ? wDone() : submit(true); return; }
  };
  upd(); tick = setInterval(upd, 1000);
}
function exam() {
  const X = S.cur, x = chByKey[X.key], { e, c } = x, left = (X.endAt - Date.now()) / 1000;
  const rows = chapterRows(X.key, i => `<div class="bub" id="bub${i}"><b>${i + 1}</b>${[1, 2, 3, 4].map(k => `<button class="${X.ans[i] === k ? 'on' : ''}" onclick="bub(${i},${k})">${k}</button>`).join('')}<button class="fl ${X.flag[i] ? 'on' : ''}" onclick="flg(${i})" title="לחזור אליה">🚩</button></div>`);
  return `<div class="xtop"><span class="timer ${left < 60 ? 'warn' : ''}" id="tm">${mmss(left)}</span><span class="ttl">${S.sim && S.sim.keys[S.sim.i] === X.key ? `🎓 פרק ${S.sim.i + 1}/${S.sim.keys.length} · ` : ''}${esc(e.title)} · ${DOM[c.domain]} · <span id="xc">${X.ans.filter(Boolean).length}</span>/${c.questions}</span></div>
  <main class="full"><div class="one"><p class="mut sm" style="margin-top:0">${esc(c.label || '')}. לוחצים על שאלה כדי להגדיל.</p>${fmBox(X.key)}${locked() ? codeCard() : ''}</div>${rows}
  <div class="one"><button class="btn" style="margin-top:18px" onclick="submit()">סיום והגשה</button>
  <p style="text-align:center"><button class="icb" onclick="quit()">לצאת בלי לשמור</button></p></div></main>`;
}
// תשובה או דגל מעדכנים רק את השורה שלהם. בלי לצייר את כל הדף, המסך לא קופץ והמדידה לא זזה לשאלה אחרת.
function bubRow(i) {
  const X = S.cur, r = document.getElementById('bub' + i); if (!r) { const y = scrollY; render(); scrollTo(0, y); return; }
  r.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j < 4 ? X.ans[i] === j + 1 : !!X.flag[i]));
  const c = document.getElementById('xc'); if (c) c.textContent = X.ans.filter(Boolean).length;
}
// לחיצה על תשובה: בוחרת אותה. לחיצה שנייה על אותה תשובה לא מוחקת אותה (לחיצה כפולה מחקה תשובות בלי לשים לב).
// כל שינוי נרשם (X.hs[i]: התשובות לפי הסדר), כדי שבתוצאות יראו בדיוק מה סומן ואם שונה.
function bub(i, k) {
  const X = S.cur; if (X.ans[i] === k) return;
  X.ans[i] = k; X.pin = i; ((X.hs = X.hs || [])[i] = X.hs[i] || []).push(k);
  save(); bubRow(i);
}
function flg(i) { const X = S.cur; X.flag[i] = X.flag[i] ? 0 : 1; save(); bubRow(i); }
function quit() { if (!confirm(S.sim ? 'לצאת? מה שסימנת בפרק הזה לא יישמר, והסימולציה תבוטל.' : 'לצאת? מה שסימנת לא יישמר.')) return; delete S.cur; delete S.sim; save(); go('home'); }
function submit(auto) {
  const X = S.cur; if (!X) return;
  if (!auto) { const empty = X.ans.filter(a => !a).length; if (!confirm(empty ? `נשארו ${empty} שאלות בלי תשובה. מאל״ו ממליצים לנחש (אין הפחתה על טעות). להגיש בכל זאת?` : 'להגיש?')) return; }
  const att = { at: Date.now(), ans: X.ans.slice(), flag: X.flag.slice(), ...(X.t ? { t: X.t.map(v => Math.round(v)) } : {}), ...(X.tb ? { tb: X.tb.map(v => Math.round(v)) } : {}), ...(X.hs ? { hs: X.ans.map((v, i) => (X.hs[i] || []).join('')) } : {}), dur: Math.round((Math.min(Date.now(), X.endAt) - X.start) / 1000), pre: X.pre || [] };
  (S.res[X.key] = S.res[X.key] || []).push(att);
  const k = X.key; delete S.cur;
  if (S.sim && S.sim.keys[S.sim.i] === k) return simNext(k, att.at);
  save(); go(keyOf(k) ? 'result' : 'keyin', { key: k });
}
// ===== סימולציה מלאה (רועי 24/11): 4 הפרקים של בחינה אחת ברצף, בלי הפסקה, וציון לפי הטבלה של אותה בחינה =====
// כל פרק נשמר ב-res כרגיל (אם עשית אותו קודם, זה ניסיון חוזר). הציון של הסימולציה מחושב רק מהניסיונות שלה.
const simChs = e => CH.filter(x => x.e === e);
function simState(e) { const L = simChs(e); return { done: L.filter(x => first(x.key)).length, pr: L.reduce((n, x) => n + pracQs(x.key).length, 0) }; }
const simLabel = e => { const s = simState(e); return s.done || s.pr ? [s.done ? `${s.done} פרקים כבר נעשו` : '', s.pr ? `${s.pr} שאלות תורגלו` : ''].filter(Boolean).join(' · ') : '✨ נקייה'; };
function startSim(id) {
  const e = EX.find(x => x.id === id); if (!e) return;
  if (!Object.keys(SOL).length) return toast('צריך קודם לפתוח את המפתחות עם קוד הגישה');
  if (S.cur && !confirm('יש פרק אחר באמצע. לוותר עליו ולהתחיל סימולציה?')) return;
  const L = simChs(e), min = L.reduce((n, x) => n + x.c.minutes, 0), st = simState(e);
  if (!confirm(`סימולציה מלאה: ${e.title}\n\n${L.length} פרקים ברצף, ${min} דקות, בלי הפסקה. כשפרק נגמר או מוגש, הבא מתחיל מיד. בסוף: הציון לפי הטבלה של מאל״ו לבחינה הזו.${st.done || st.pr ? `\n\nשים לב: ${simLabel(e)}. הציון עלול לצאת גבוה מהאמיתי.` : ''}\n\nלהתחיל?`)) return;
  delete S.cur; S.sim = { id, at: Date.now(), i: 0, keys: L.map(x => x.key), atts: [] }; save(); startChap(S.sim.keys[0]);
}
function simNext(k, at) {
  const M = S.sim; M.atts.push({ k, at }); M.i++;
  if (M.i < M.keys.length) { save(); toast(`🎓 פרק ${M.i + 1} מתוך ${M.keys.length} מתחיל`); return startChap(M.keys[M.i]); }
  delete S.sim; S.sims.push({ at: M.at, end: Date.now(), id: M.id, atts: M.atts }); save(); go('simres', { at: M.at });
}
function simCancel() { if (!confirm('לבטל את הסימולציה? הפרקים שכבר הגשת נשארים שמורים כפרקים רגילים.')) return; delete S.sim; save(); render(); }
function simScore(r) {
  const e = EX.find(x => x.id === r.id), t = scaleOf(r.id);
  const rows = r.atts.map(s => { const x = chByKey[s.k], a = (S.res[s.k] || []).find(y => y.at === s.at), key = keyOf(s.k); if (!x || !a || !key) return null;
    const ok = a.ans.reduce((n, v, i) => n + (okQ(s.k, i + 1, v, key, a.at) ? 1 : 0), 0), nv = (SOL[s.k] && SOL[s.k].v || []).length;
    return { x, a, ok, nv, k: (S.res[s.k] || []).indexOf(a), pre: (a.pre || []).length, rep: (S.res[s.k] || []).indexOf(a) > 0 }; }).filter(Boolean);
  const dom = d => { const L = rows.filter(y => y.x.c.domain === d); if (!L.length || !t) return null; const raw = L.reduce((n, y) => n + y.ok - y.nv, 0), tab = d === 'verbal' ? t.v : t.q; return { s: tab[Math.min(tab.length - 1, raw)], raw, n: L.reduce((n, y) => n + y.x.c.questions - y.nv, 0) }; };
  const V = dom('verbal'), Q = dom('quant');
  return { e, rows, V, Q, G: V && Q && t ? genScore(t, (V.s + Q.s) / 2) : null };
}
function simres() {
  const r = S.sims.find(y => y.at === (arg && arg.at)) || S.sims[S.sims.length - 1]; if (!r) return all();
  const { e, rows, V, Q, G } = simScore(r);
  const dur = rows.reduce((n, y) => n + (y.a.dur || 0), 0), seen = rows.filter(y => y.rep).length, pre = rows.reduce((n, y) => n + y.pre, 0);
  return `<main><h1>🎓 סימולציה: ${esc(e.title)}</h1><p class="mut sm" style="margin-top:-6px">${fmtWhen(r.at)} · ${rows.length} פרקים ברצף · ${mmss(dur)} דקות</p>
  ${G ? `<div class="card"><b>הציון לפי הטבלה של מאל״ו לבחינה הזו</b><div class="big-score" style="font-size:44px">${G.est}</div><div style="text-align:center" class="sm">טווח האומדן: <b>${G.lo} עד ${G.hi}</b> · כ-${G.below}% מהנבחנים קיבלו פחות</div>
  <div class="kpis"><div class="kpi"><b>${V.s}</b><span>מילולי · ${V.raw}/${V.n}</span></div><div class="kpi"><b>${Q.s}</b><span>כמותי · ${Q.raw}/${Q.n}</span></div></div>
  <p class="mut sm" style="margin:4px 0 0">כמו אצל מאל״ו: נכונות בשני הפרקים של כל תחום → ציון תחום מהטבלה, והציון הכללי מהממוצע. בלי מטלת הכתיבה, שגם מאל״ו לא כוללים באומדן.</p></div>` : '<div class="card"><p class="sm" style="margin:0">אין לבחינה הזו טבלת המרה, אז אין ציון כללי. הנכונות בכל פרק למטה.</p></div>'}
  ${seen || pre ? `<div class="card" style="border-color:var(--o)"><p class="sm" style="margin:0">⚠️ ${seen ? `${seen} מהפרקים כבר נעשו לפני הסימולציה` : ''}${seen && pre ? ', ו-' : ''}${pre ? `${pre} שאלות תורגלו לפני` : ''}. הציון כנראה גבוה קצת מהאמיתי.</p></div>` : ''}
  <h2>הפרקים</h2><div class="card list">${rows.map((y, i) => `<div class="it" onclick="go('result',{key:'${y.x.key}',k:${y.k}})"><b>${i + 1}</b><span class="tag ${y.x.c.domain[0]}">${DOM[y.x.c.domain]}</span><div class="grow"><b>${esc(y.x.c.label || '')}</b><div class="mut sm">${mmss(y.a.dur || 0)} דקות</div></div><b>${y.ok}/${y.x.c.questions}</b><b style="color:var(--b)">◀</b></div>`).join('')}</div>
  <p class="mut sm" style="margin-top:-4px">לוחצים על פרק כדי לראות את התשובות, הזמנים וההסברים.</p>
  <button class="btn ghost" onclick="go('all')">לכל הבחינות</button></main>` + navBar();
}
function simCard() { // בראש «בחינות»: לבחור בחינה, להתחיל, ומה כבר נעשה
  const best = EX.slice().sort((a, b) => { const x = simState(a), y = simState(b); return (x.done * 30 + x.pr) - (y.done * 30 + y.pr); })[0];
  const M = S.sim && !S.cur ? S.sim : null;
  return `<div class="card"><b>🎓 סימולציה מלאה</b><p class="sm" style="margin:4px 0 8px">4 הפרקים של בחינה אחת ברצף, ${4 * 20} דקות בלי הפסקה, וציון אמיתי לפי הטבלה של מאל״ו לאותה בחינה. כדאי לבחור בחינה נקייה, שלא עשית ולא תרגלת ממנה.</p>
  ${M ? `<p class="sm" style="color:var(--o)">סימולציה של ${esc(EX.find(x => x.id === M.id).title)} באמצע: ${M.i} מתוך ${M.keys.length} פרקים הוגשו.</p><div class="row"><button class="btn blue" onclick="startChap('${M.keys[M.i]}')">להמשיך לפרק ${M.i + 1}</button><button class="btn ghost" onclick="simCancel()">לבטל</button></div>`
    : `<select class="txt" id="simx" style="margin:0 0 8px">${EX.map(e => `<option value="${e.id}" ${e === best ? 'selected' : ''}>${esc(e.title)} · ${simLabel(e)}</option>`).join('')}</select><button class="btn blue" onclick="startSim(document.getElementById('simx').value)">▶️ להתחיל סימולציה</button>`}
  ${S.sims.length ? `<div class="list" style="margin-top:10px">${S.sims.slice().reverse().map(r => { const s = simScore(r); return `<div class="it" onclick="go('simres',{at:${r.at}})"><div class="grow"><b>${esc(s.e.title)}</b><div class="mut sm">${fmtWhen(r.at)}</div></div><b>${s.G ? s.G.est : '—'}</b><b style="color:var(--b)">◀</b></div>`; }).join('')}</div>` : ''}</div>`;
}
function keyin() {
  const x = chByKey[arg.key], { e, c } = x;
  return `<main><h1>מפתח התשובות</h1><div class="card"><p style="margin-top:0">${esc(e.title)} · ${esc(c.label || DOM[c.domain])}</p>
  <p>בסוף הקובץ של מאל״ו יש «מפתח תשובות נכונות»${e.keyPage ? `, <b>בעמוד ${e.keyPage}</b>` : ''}. מוצאים שם את הטבלה של <b>${esc(c.label || DOM[c.domain])}</b>, ומקלידים את ${c.questions} התשובות ברצף.</p>
  ${link(pdf(e, e.keyPage), '📄 לפתוח את המפתח')}
  <input class="txt key" id="ki" inputmode="numeric" maxlength="${c.questions}" value="${esc(keyOf(arg.key))}" placeholder="${'·'.repeat(c.questions)}" oninput="document.getElementById('kc').textContent=this.value.replace(/[^1-4]/g,'').length+'/${c.questions}'">
  <div class="mut sm" id="kc">${keyOf(arg.key).length}/${c.questions}</div>
  <button class="btn blue" style="margin-top:10px" onclick="saveKey('${arg.key}')">לבדוק</button></div>
  <p class="mut sm">המפתח נשמר, ופעם הבאה שתעשה את הפרק הזה לא צריך להקליד שוב.</p>${locked() ? codeCard() : ''}</main>` + navBar();
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
// איפה הלך הזמן בפרק: לפי סוג שאלה, השאלות הארוכות, וכמה זמן לקחו שאלות שצדקת מול שאלות שטעית
function timeCard(items, a, per, bySec) {
  if (!a.t) return `<h2>⏱️ איפה הלך הזמן</h2><div class="card"><p class="sm" style="margin:0">בפרק הזה נשמר רק הזמן הכולל (${mmss(a.dur)}). הזמן לכל שאלה נמדד מ-21/11, מהפרק הבא שתעשה.</p></div>`;
  const tot = items.reduce((s, y) => s + y.t, 0), rest = Math.max(0, a.dur - tot), sh = v => pct(v, Math.max(a.dur, tot, 1));
  const avg = l => l.length ? l.reduce((s, y) => s + y.t, 0) / l.length : 0;
  const res = y => y.vd ? 'בוטלה' : y.ok ? '✓' : y.a ? '✗' : 'לא ענית';
  const slow = items.filter(y => y.t > 0).sort((x, y) => y.t - x.t).slice(0, 5);
  const g = {}; if (bySec) items.forEach(y => { if (y.type) (g[y.type] = g[y.type] || []).push(y); });
  const secs = Object.entries(g).sort((x, y) => y[1].reduce((s, q) => s + q.t, 0) - x[1].reduce((s, q) => s + q.t, 0)).map(([t, l]) => {
    const st = l.reduce((s, y) => s + y.t, 0), p = sh(st), ok = l.filter(y => y.ok).length;
    return `<div style="margin:10px 0"><div style="display:flex;justify-content:space-between;gap:8px;font-size:14px"><span>${esc(TYPE_HE[t] || t)} <span class="mut sm">· ${l.length} שאלות · ${ok}/${l.length} נכון</span></span><b>${mmss(st)} · ${p}%</b></div><div class="bar tm"><i style="width:${p}%"></i></div><div class="mut sm">ממוצע ${mmss(avg(l))} לשאלה ${avg(l) > per * 1.3 ? '· ⚠️ איטי מהקצב' : ''}</div></div>`;
  }).join('');
  const okL = items.filter(y => y.ok && !y.vd), badL = items.filter(y => !y.ok && y.a);
  const tb = items.reduce((s, y) => s + y.tb, 0), tbMax = items.reduce((m, y) => y.tb > m.tb ? y : m, items[0]);
  return `<h2>⏱️ איפה הלך הזמן</h2><div class="card">
    <p class="sm" style="margin-top:0">הקצב של מאל״ו: <b>${mmss(per)}</b> לשאלה. אצלך בממוצע: <b>${mmss(avg(items))}</b>.${okL.length && badL.length ? ` בשאלות שצדקת ${mmss(avg(okL))}, בשאלות שטעית ${mmss(avg(badL))}.` : ''}${tb >= 10 ? ` חזרת לשאלות שכבר ענית עליהן: <b>${mmss(tb)}</b> בסך הכל (הכי הרבה בשאלה ${tbMax.n}, ${mmss(tbMax.tb)}).` : ''}</p>
    ${secs}
    ${rest >= 20 ? `<p class="mut sm">${mmss(rest)} בלי שאלה מול העיניים (הוראות, דף הנוסחאות, קטע קריאה לבד במסך, או גלילה).</p>` : ''}
    <b class="sm">5 השאלות שלקחו הכי הרבה זמן</b></div>
  <div class="card list">${slow.map(y => `<div class="it" onclick="openQ(${y.n})"><b>שאלה ${y.n}</b><div class="grow mut sm">${TYPE_HE[y.type] || ''}</div><span class="sm">${res(y)} · <b>${mmss(y.t)}</b>${y.tb >= 5 ? ` <span class="mut">(חזרה ${mmss(y.tb)})</span>` : ''}</span></div>`).join('')}</div>
  <p class="mut sm" style="margin-top:-4px">נמדד לפי השאלה שהייתה מול העיניים במסך, או שהגדלת. אחרי שעונים, הזמן עובר מיד לשאלה הבאה. כשגוללים חזרה לשאלה שכבר ענית, הזמן נספר לה ומופיע כ«חזרה». ברשת למעלה: הזמן מתחת לכל שאלה, ובאדום שאלה שלקחה יותר מפי 2 מהקצב.</p>`;
}
function result() {
  const x = chByKey[arg.key], { e, c } = x, att = S.res[arg.key], k = arg.k ?? att.length - 1, a = att[k], key = keyOf(arg.key);
  const items = a.ans.map((v, i) => ({ n: i + 1, a: v, right: +key[i], ok: okQ(arg.key, i + 1, v, key, a.at), vd: isVoid(arg.key, i + 1), bad: badQ(arg.key, i + 1, a.at), type: typeOf(c, i + 1), flag: a.flag && a.flag[i], t: a.t ? a.t[i] || 0 : null, tb: a.tb ? a.tb[i] || 0 : 0, hs: a.hs ? a.hs[i] || '' : null }));
  // מה סומן בפועל (נשמר מ-21/11): «סימנת 4, ואחר כך 1». בלי היסטוריה מוצגת רק התשובה הסופית.
  const hsTxt = y => y.hs && y.hs.length > 1 ? `<div class="sm" style="margin:6px 2px 0">✏️ סימנת ${y.hs.split('').join(', ואחר כך ')}. נשארה ${y.a}.</div>` : '';
  const r = items.filter(y => y.ok).length, empty = items.filter(y => !y.a).length;
  const preS = new Set(a.pre || []), preL = items.filter(y => preS.has(y.n)), cl = items.filter(y => !preS.has(y.n)), clOk = cl.filter(y => y.ok).length;
  const preBox = preL.length ? `<div class="card" style="border-color:var(--o)"><b>🧘 ${preL.length} שאלות תורגלו לפני הפרק</b><p class="sm" style="margin:4px 0 0">שאלות ${preL.map(y => y.n).join(', ')} (מסומנות 🧘 ברשת) כבר נפתרו בתרגול. הן נספרות בציון כרגיל. לידיעה, בלי השאלות האלה: <b>${clOk} נכונות מתוך ${cl.length}</b>.</p></div>` : '';
  const per = c.minutes * 60 / c.questions; // הקצב שמאל״ו נותנים: זמן הפרק חלקי מספר השאלות
  const grid = items.map(y => `<div class="rq ${y.ok ? 'ok' : y.a ? 'bad' : 'skip'}" onclick="openQ(${y.n})">${y.flag ? '<i class="fg">🚩</i>' : ''}<b>${preS.has(y.n) ? '🧘' : ''}${y.n}</b><span>${y.vd ? 'בוטלה' : y.ok ? '✓' : `${y.a || '—'}→${y.right}`}</span>${y.t != null ? `<em class="${y.t > 2 * per ? 'slow' : ''}">${mmss(y.t)}</em>` : ''}</div>`).join('');
  const timeBox = timeCard(items, a, per, !!(c.sections && c.sections.length));
  const hasExp = items.some(y => expOf(arg.key, y.n));
  // השאלות שסומנו ב-🚩 בזמן הפרק (נשמרות בניסיון, a.flag): רשימה משלהן, והן פתוחות בהסברים גם כשענית נכון
  const fl = items.filter(y => y.flag);
  const flagBox = fl.length ? `<h2>🚩 סימנת לחזור (${fl.length})</h2><div class="card list">${fl.map(y => `<div class="it" onclick="openQ(${y.n})"><b>שאלה ${y.n}</b><div class="grow mut sm">${TYPE_HE[y.type] || ''}</div><span class="sm">${y.vd ? 'בוטלה' : y.ok ? '✓ נכון' : y.a ? `✗ ענית ${y.a}, הנכונה ${y.right}` : `לא ענית, הנכונה ${y.right}`}</span></div>`).join('')}</div>` : '';
  let lastT = null; const psgShown = {};
  const exps = hasExp ? items.map(y => {
    const t = y.type, hd = t && t !== lastT ? `<div class="sech">${TYPE_HE[t]}</div>` : ''; lastT = t;
    // התרשים פתוח בכל שאלה של תרשים (בלעדיו אי אפשר להבין את השאלה). קטע קריאה ארוך: פתוח בשאלה הפתוחה הראשונה שלו, ובשאר בלחיצה
    const op = !(y.ok && !y.flag), s = secOf(c, y.n), first = op && s && !psgShown[s.from]; if (first) psgShown[s.from] = 1;
    const psg = t === 'chart' || first ? 'open' : 'closed';
    return hd + `<details class="qx ${y.ok ? 'ok' : y.a ? 'bad' : 'skip'}" id="q${y.n}" ${op ? 'open' : ''}><summary><b>${y.flag ? '🚩 ' : ''}שאלה ${y.n}</b><span class="grow"></span>${y.t != null ? `<span class="sm mut">⏱️ ${mmss(y.t)}${y.tb >= 5 ? ` (חזרה ${mmss(y.tb)})` : ''}</span>` : ''}<span class="sm">${y.vd ? 'מאל״ו ביטלו את השאלה' : y.bad ? `✓ נספרה כנכונה: בתמונה שהוצגה חסר נתון (ענית ${y.a || '—'}, הנכונה ${y.right})` : y.ok ? `✓ ${y.right}` : `${y.a ? `ענית ${y.a}${y.hs && y.hs.length > 1 ? ' ✏️' : ''}` : 'לא ענית'} · הנכונה <b>${y.right}</b>`}</span></summary>${hsTxt(y)}${qView(arg.key, y.n, psg)}<p class="xp">${expHtml(expOf(arg.key, y.n)) || '<span class="mut">אין הסבר לשאלה הזו.</span>'}</p></details>`;
  }).join('') : '';
  return `<main><div style="display:flex;gap:8px;align-items:center"><span class="tag ${c.domain[0]}">${DOM[c.domain]}</span><b>${esc(e.title)} · ${esc(c.label || '')}</b>${k ? '<span class="tag">ניסיון חוזר</span>' : ''}</div>
  <div class="big-score">${r}/${c.questions}</div><div style="text-align:center" class="mut">${pct(r, c.questions)}% נכון · ${mmss(a.dur)} דקות${empty ? ` · ${empty} בלי תשובה` : ''}</div>
  ${preBox}
  ${scoreCard(e)}
  <h2>כל השאלות</h2><p class="mut sm" style="margin-top:-4px">ענית → התשובה הנכונה לפי המפתח של מאל״ו${hasExp ? '. לוחצים על שאלה כדי לראות את ההסבר.' : ''}</p><div class="rgrid">${grid}</div>
  ${flagBox}
  ${timeBox}
  ${c.sections && c.sections.length ? `<h2>לפי סוג שאלה</h2><div class="card">${breakdown(items, y => y.type, t => TYPE_HE[t] || t)}</div>` : ''}
  ${hasExp ? `<h2>הסבר לכל שאלה</h2><p class="mut sm" style="margin-top:-4px">השאלות שטעית בהן פתוחות. כדאי לפתוח את הקובץ בצד (${link(pdf(e, c.page), 'עמוד ' + c.page, 'sm')}). ${EXP_NOTE}</p>${exps}` : locked() ? codeCard() : ''}
  <div class="card"><b>איך לומדים מהטעויות</b><p class="sm" style="margin:4px 0 8px">${hasExp ? 'קוראים את ההסבר, ואחרי יום או יומיים פותרים את השאלה שוב בלי שעון בלשונית «טעויות».' : 'פותחים את השאלה בקובץ ופותרים שוב בלי שעון. בלשונית «טעויות» מסמנים תשובה חדשה ובודקים מול המפתח.'} הסברים רשמיים לכל סוג שאלה נמצאים בלשונית «הדרכה».</p>
  <div class="row">${link(pdf(e, c.page), '📄 לשאלות בקובץ')}<button class="btn blue" onclick="go('fix')">לתרגל את הטעויות</button></div></div>
  <div class="row"><button class="btn ghost" onclick="startChap('${arg.key}')">לעשות שוב בזמן</button>${SOL[arg.key] ? '' : `<button class="btn ghost" onclick="go('keyin',{key:'${arg.key}'})">לתקן מפתח</button>`}</div>
  <p style="text-align:center;margin-top:18px"><button class="icb" onclick="removeAtt('${arg.key}',${k})">🗑️ להסיר את הפרק מהנתונים (נעשה בטעות)</button></p></main>` + navBar();
}

// ===== חוזקות: רק מהתשובות שלך מול המפתח הרשמי =====
function stats() {
  const A = answered();
  if (!A.length) return `<main><h1>🎯 חוזקות וחולשות</h1><div class="card"><p style="margin:0">אחרי הפרק הראשון (עם מפתח תשובות), יופיע כאן פילוח לפי תחום ולפי סוג שאלה, מהתשובות שלך בבחינות של מאל״ו.</p></div></main>` + navBar();
  const weakT = Object.entries(A.reduce((g, x) => { if (x.type) { (g[x.type] = g[x.type] || { n: 0, ok: 0 }); g[x.type].n++; g[x.type].ok += x.ok; } return g; }, {})).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)[0];
  const g = weakT ? GUIDES.find(z => z[3] === weakT[0]) : null;
  return `<main><h1>🎯 חוזקות וחולשות</h1><p class="mut sm" style="margin-top:-6px">מהניסיון הראשון בכל פרק, מול מפתח התשובות של מאל״ו (${A.length} שאלות).</p>
  <h2 id="trend">📈 המגמה</h2>${trendHtml()}
  ${(se => se.length ? `<h2>ציון משוער לפי בחינה</h2><div class="card list">${se.slice().reverse().map(y => `<div class="it" onclick="go('result',{key:'${CH.find(z => z.e === y.e && first(z.key)).key}'})"><div class="grow"><b>${esc(y.e.title)}</b><div class="mut sm">מילולי ${y.sc.V.s} · כמותי ${y.sc.Q.s} · טווח ${y.sc.G.lo} עד ${y.sc.G.hi}</div></div><b style="font-size:20px">${y.sc.G.est}${y.sc.full ? '' : '*'}</b></div>`).join('')}</div>${se.some(y => !y.sc.full) ? '<p class="mut sm" style="margin-top:-4px">* זמני: לא כל ארבעת הפרקים של הבחינה נעשו.</p>' : ''}` : '')(scoredExams())}
  <h2>לפי תחום</h2><div class="card">${breakdown(A, x => x.c.domain, d => DOM[d])}</div>
  <h2>לפי סוג שאלה</h2><div class="card">${breakdown(A, x => x.type, t => TYPE_HE[t] || t)}</div>
  ${g ? `<div class="card"><b>הכי חלש כרגע: ${TYPE_HE[weakT[0]]}</b><p class="sm" style="margin:4px 0 8px">לסוג הזה יש למאל״ו קובץ רשמי עם דוגמאות והסברים.</p>${link(g[2], '📘 ' + g[1])}</div>` : ''}
  <h2>לפי בחינה</h2><div class="card list">${done().map(chRow).join('')}</div></main>` + navBar();
}

// ===== טעויות: פותרים שוב בקובץ ובודקים מול המפתח =====
// תיקון בלשונית «טעויות» תקף רק לניסיון שהוא תיקן: true (לפני 22/11) לא נספר בפרק שהוסר ממנו ניסיון; זמן תיקון חייב להיות אחרי הניסיון
const fixOk = x => { const f = S.fix[`${x.key}:${x.n}`]; if (!f) return false; if (f === true) return !Object.keys(S.gone).some(g => g.startsWith(x.key + '@')); const a = first(x.key); return !a || f > a.at; };
function mistakes() { return answered().filter(x => !x.ok && !fixOk(x)); }
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
  const opts = [1, 2, 3, 4].map(k => `<button class="${RP ? (k === right ? 'ok' : k === RP ? 'bad' : '') : ''}" ${RP ? 'disabled' : `onclick="RP=${k};if(${k}===${right}){S.fix['${arg.key}:${n}']=Date.now();save()}render()"`}>${k}</button>`).join('');
  return `<div class="xtop"><button class="icb" onclick="RP=0;go('fix')">→ חזרה</button><span class="ttl">${esc(e.title)} · ${DOM[c.domain]} · שאלה ${n}</span></div>
  <main class="${isUnit(secOf(c, n)) ? 'full' : ''}">${isUnit(secOf(c, n)) ? `<div class="two"><div class="side">${psgBox(arg.key, secOf(c, n), true)}</div><div>` : ''}<div class="card"><p style="margin-top:0"><b>שאלה ${n}</b> ב${esc(c.label || DOM[c.domain])} (${TYPE_HE[typeOf(c, n)] || ''})</p></div>${qBox(qid(arg.key, n), pdf(e, qPage(c, n)))}${fmBox(arg.key)}
  <p>התשובה שלך עכשיו:</p><div class="bub big">${opts}</div>
  ${RP ? `<p style="font-weight:800;font-size:18px;color:${RP === right ? 'var(--gd)' : 'var(--rd)'}">${RP === right ? '✅ נכון! השאלה יוצאת מהרשימה.' : `❌ התשובה הנכונה לפי המפתח: ${right}`}</p>
  ${expOf(arg.key, n) ? `<div class="card"><b>ההסבר</b><p class="xp" style="margin:6px 0 0">${expHtml(expOf(arg.key, n))}</p></div>` : ''}
  <button class="btn blue big" onclick="RP=0;${mistakes().length ? `go('retry',{key:'${mistakes()[0].key}',n:${mistakes()[0].n}})` : `go('fix')`}">לטעות הבאה</button>` : ''}${isUnit(secOf(c, n)) ? '</div></div>' : ''}</main>`;
}

// ===== תרגול חופשי: בלי שעון, כל שאלה נבדקת מיד עם ההסבר. לא נכנס לציון המשוער ולא ל«טעויות» =====
function free() {
  const x = chByKey[arg.key], { e, c } = x, key = keyOf(arg.key), P = S.prac[arg.key] || { ans: [] };
  let ok = 0, n = 0;
  const rows = chapterRows(arg.key, i => {
    const q = i + 1, a = P.ans[i] || 0, right = +key[i] || 0, vd = isVoid(arg.key, q), shown = !!(a && right), good = a === right || vd;
    if (shown) { n++; if (good) ok++; }
    const btns = [1, 2, 3, 4].map(k => `<button class="${shown ? (k === right ? 'ok' : k === a ? 'bad' : '') : a === k ? 'on' : ''}" ${shown ? 'disabled' : `onclick="fp(${i},${k})"`}>${k}</button>`).join('');
    const ex = expOf(arg.key, q);
    const res = shown ? `<details class="qx ${good ? 'ok' : 'bad'}" ${good ? '' : 'open'} style="margin:0 0 12px"><summary><span class="sm">${vd ? 'מאל״ו ביטלו את השאלה' : good ? `✅ נכון, ${right}` : `❌ ענית ${a} · הנכונה <b>${right}</b>`}</span><span class="grow"></span><span class="mut sm">${ex ? 'הסבר' : ''}</span></summary>${ex ? `<p class="xp">${expHtml(ex)}</p>` : ''}</details>` : '';
    return `<div class="bub"><b>${q}</b>${btns}<span></span></div>` + res;
  });
  return `<div class="xtop"><button class="icb" onclick="go('prac')">→ חזרה</button><span class="ttl">🧘 ${esc(e.title)} · ${DOM[c.domain]} · ${n ? `${ok}/${n} נכון` : 'בלי שעון'}</span></div>
  <main class="full"><div class="one"><p class="mut sm" style="margin-top:0">${esc(c.label || '')}. בלי שעון. מסמנים תשובה ורואים מיד אם צדקת ואת ההסבר. לא נכנס לציון המשוער ולא ל«טעויות». לוחצים על שאלה כדי להגדיל.</p>
  ${!first(arg.key) ? `<div class="card" style="border-color:var(--o)"><span class="sm">⚠️ את הפרק הזה עוד לא עשית בזמן. אחרי שתראה כאן את התשובות, ציון של פרק בזמן עליו כבר לא ישקף את הרמה שלך. לתרגול חופשי עדיף לבחור בחינה ישנה, ולהשאיר את החדשות לפרק בזמן.</span></div>` : ''}
  ${fmBox(arg.key)}${key ? '' : codeCard()}</div>${rows}
  <div class="one">${P.ans.some(Boolean) ? `<p style="text-align:center"><button class="icb" onclick="fpReset()">לנקות את התשובות ולהתחיל מחדש</button></p>` : ''}</div></main>` + navBar();
}
function fp(i, k) {
  const c = chByKey[arg.key].c, P = S.prac[arg.key] = S.prac[arg.key] || { ans: Array(c.questions).fill(0) };
  P.ans[i] = keyOf(arg.key) || P.ans[i] !== k ? k : 0; P.at = Date.now(); save(); reRender();
}
function fpReset() { if (!confirm('לנקות את כל התשובות של התרגול בפרק הזה?')) return; S.prac[arg.key] = { at: Date.now(), ans: [] }; save(); reRender(); }

// ===== לשונית «תרגול»: בלי שעון. מעורב, לפי סוג, פרק שלם, וטעויות. לא נכנס לציון המשוער =====
const RESERVE = 8; // הבחינות החדשות נשמרות לפרקים בזמן, כדי שהציון המשוער שלהן יהיה אמיתי
const UNIT_TYPES = ['reading', 'chart']; // קטע קריאה ותרשים: כל השאלות על אותו קטע באות יחד
const pracAns = (k, n) => ((S.prac[k] || {}).ans || [])[n - 1] || 0;
// רועי 23/11: תרגול לא לוקח שאלות מפרק נקי (שלא נעשה בזמן ולא תורגל), כדי שהפרקים בזמן יישארו מבחן אמיתי.
// הסדר (רועי 26/11: «התרגולים זה שאלות שנתקלתי בהם כבר, תעשה שלא»): קודם שאלות שלא ראית בכלל, מפרקים ישנים שכבר תרגלת בהם (מהבחינה הישנה ביותר),
// אחר כך שאלות שראית רק בפרק בזמן, ובסוף שאלות שכבר תורגלו. פרק נקי עדיין לא נוגעים בו (נשמר לפרק בזמן), אלא אם מסמנים «לכלול גם פרקים נקיים»
const cleanCh = x => !first(x.key) && !pracQs(x.key).length;
function pracUnits(dom, type) { // יחידה = שאלה אחת, או כל השאלות של קטע קריאה / תרשים
  const out = [], resv = new Set(EX.slice(0, S.pracAll ? 0 : RESERVE).map(e => e.id));
  CH.forEach(x => {
    const { e, c, key } = x, done = !!first(key); if (dom && c.domain !== dom) return;
    if (!S.pracAll && !done && (resv.has(e.id) || cleanCh(x))) return;
    (c.sections || []).forEach(sec => {
      if (type && sec.type !== type) return;
      const qs = []; for (let n = sec.from; n <= sec.to; n++) if (!isVoid(key, n)) qs.push(n);
      const groups = isUnit(sec) ? [qs] : qs.map(n => [n]);
      groups.forEach(g => { if (!g.length) return; const pr = g.some(n => pracAns(key, n)); out.push({ key, type: sec.type, qs: g, unit: isUnit(sec), done, pr, ei: EX.indexOf(e), seen: pr || done }); });
    });
  });
  return out;
}
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function startDrill(dom, type, title) {
  if (!Object.keys(SOL).length) return toast('צריך קודם לפתוח את המפתחות עם קוד הגישה');
  const U = pracUnits(dom, type), byType = {};
  const pool = shuffle(U.filter(u => !u.done && !u.pr)).sort((a, b) => b.ei - a.ei).concat(shuffle(U.filter(u => u.done && !u.pr)), shuffle(U.filter(u => u.pr)));
  pool.forEach(u => (byType[u.type] = byType[u.type] || []).push(u));
  const types = shuffle(Object.keys(byType)), list = [];
  let more = true;
  while (list.length < 10 && more) { // מעורב: כל פעם סוג אחר. בסבב מעורב לכל היותר קטע אחד
    more = false;
    for (const t of types) {
      if (list.length >= 10) break;
      const u = byType[t].shift(); if (!u) continue; more = true;
      const un = u.unit;
      if (un && !type && list.some(y => y.unit)) continue;
      u.qs.forEach((n, j) => list.push({ k: u.key, n, unit: un ? { first: j === 0, from: u.qs[0], to: u.qs[u.qs.length - 1] } : null }));
    }
  }
  if (!list.length) return toast('אין שאלות לתרגול כאן');
  dArchive(S.drill); // סבב שנעזב באמצע נשמר בהיסטוריה עם מה שנענה בו
  S.drill = { title, dom, type, list, i: 0, a: 0 }; save(); go('drill');
}
function prac() {
  const locked0 = !Object.keys(SOL).length;
  const st = t => { let n = 0, ok = 0; CH.forEach(({ c, key }) => { const k = keyOf(key); if (!k) return; for (let q = 1; q <= c.questions; q++) if (typeOf(c, q) === t && pracAns(key, q)) { n++; if (pracAns(key, q) === +k[q - 1] || isVoid(key, q)) ok++; } }); return n ? `${ok}/${n} נכון בתרגול` : 'עוד לא תורגל'; };
  const types = [['verbal', ['analogy', 'inference', 'reading']], ['quant', ['problem', 'chart']]];
  const D = S.drill && S.drill.i < S.drill.list.length ? S.drill : null;
  const M = mistakes().length, opts = CH.filter(x => first(x.key) || S.pracAll || (EX.indexOf(x.e) >= RESERVE && !cleanCh(x))).map(x => `<option value="${x.key}">${esc(chTitle(x))}</option>`).join('');
  const nClean = d => CH.filter(x => x.c.domain === d && cleanCh(x)).length;
  return `<main><h1>🧘 תרגול</h1><p class="mut sm" style="margin-top:-6px">בלי שעון. מסמנים תשובה ורואים מיד אם צדקת ואת ההסבר. לא נכנס לציון המשוער.</p>
  <div class="card"><p class="sm" style="margin:0">✨ פרקים נקיים שנשמרים לפרק בזמן: <b>מילולי ${nClean('verbal')}</b> · <b>כמותי ${nClean('quant')}</b>. התרגול לא לוקח מהם שאלות.</p></div>
  ${locked0 ? codeCard() : ''}
  ${D ? `<div class="card"><b>באמצע: ${esc(D.title)}</b><p class="mut sm" style="margin:4px 0 8px">שאלה ${D.i + 1} מתוך ${D.list.length}</p><button class="btn blue" onclick="go('drill')">להמשיך</button></div>` : ''}
  <div class="card"><b>📜 היסטוריה</b><p class="mut sm" style="margin:4px 0 8px">${S.dh.length ? `${S.dh.length === 1 ? 'סבב אחד' : `${S.dh.length} סבבים`}. האחרון: ${esc(S.dh[S.dh.length - 1].title)}, ${dhScore(S.dh[S.dh.length - 1])}.` : 'כל סבב שתסיים יופיע כאן, עם כל שאלה, מה ענית וההסבר.'}</p><button class="btn ghost" onclick="go('hist')">לכל מה שתרגלתי</button></div>
  <h2>מעורב</h2><div class="card"><p class="sm" style="margin-top:0">כ-10 שאלות, כל פעם מסוג אחר ומבחינה אחרת.</p>
  <div class="row"><button class="btn blue" onclick="startDrill(null,null,'מעורב')">הכל</button><button class="btn ghost" onclick="startDrill('verbal',null,'מעורב מילולי')">מילולי</button><button class="btn ghost" onclick="startDrill('quant',null,'מעורב כמותי')">כמותי</button></div></div>
  <h2>לפי נושא</h2><div class="card list">${types.map(([d, ts]) => ts.map(t => `<div class="it" onclick="startDrill('${d}','${t}','${TYPE_HE[t]}')"><span class="tag ${d[0]}">${DOM[d]}</span><div class="grow"><b>${TYPE_HE[t]}</b><div class="mut sm">${st(t)}</div></div><b style="color:var(--b)">◀</b></div>`).join('')).join('')}</div>
  <p class="mut sm" style="margin-top:-4px">בהבנת הנקרא ובהסקה מתרשים, כל השאלות על אותו קטע באות ברצף.</p>
  <h2>🔁 טעויות מפרקים בזמן</h2><div class="card"><p class="sm" style="margin-top:0">${M ? `${M} שאלות מחכות לפתרון חוזר.` : 'אין טעויות שמחכות.'}</p><button class="btn ghost" onclick="go('fix')">לטעויות</button></div>
  <h2>פרק שלם בלי שעון</h2><div class="card"><select class="txt" id="fch" style="margin:0 0 8px">${opts}</select><button class="btn ghost" onclick="go('free',{key:document.getElementById('fch').value})">לפתוח</button></div>
  <div class="card"><label class="sm" style="display:flex;gap:8px;align-items:center"><input type="checkbox" style="width:20px;height:20px" ${S.pracAll ? 'checked' : ''} onchange="S.pracAll=this.checked;save();render()">לכלול גם פרקים נקיים</label><p class="mut sm" style="margin:6px 0 0">בלי הסימון, התרגול לוקח קודם שאלות שעוד לא ראית, מפרקים ישנים שכבר תרגלת בהם, ורק אחר כך שאלות שכבר ראית בפרק בזמן. פרק נקי (שלא נעשה בזמן ולא תורגל) וכל ${RESERVE} הבחינות החדשות נשמרים לפרק בזמן, כדי שהציון יהיה אמיתי.</p></div></main>` + navBar();
}
function drill() {
  const D = S.drill; if (!D) return prac();
  if (D.i >= D.list.length) return `<main><h1>🧘 ${esc(D.title)}</h1><div class="big-score">${D.a}/${D.list.length}</div><div style="text-align:center" class="mut">נכון בסבב הזה</div>
    <div class="row" style="margin-top:14px"><button class="btn blue" onclick="startDrill(S.drill.dom,S.drill.type,S.drill.title)">עוד סבב</button><button class="btn ghost" onclick="go('prac')">לתרגול</button></div>
    ${dTimeLine(D.list)}
    <h2>השאלות בסבב</h2><p class="mut sm" style="margin-top:-6px">לוחצים על שאלה כדי לראות אותה שוב עם ההסבר. הסבב נשמר גם ב«📜 היסטוריה» בלשונית תרגול.</p>
    <div class="card list">${D.list.map(q => hRow(q, 'drill')).join('')}</div></main>` + navBar();
  const q = D.list[D.i], x = chByKey[q.k], { e, c } = x, t = typeOf(c, q.n), right = +keyOf(q.k)[q.n - 1], a = q.ans || 0, good = a === right || isVoid(q.k, q.n);
  if (a) dRun = null; else if (!dRun || dRun.i !== D.i) dRun = { i: D.i, t0: Date.now() }; // הסטופר רץ מהרגע שהשאלה על המסך ועד שעונים
  const btns = [1, 2, 3, 4].map(k => `<button class="${a ? (k === right ? 'ok' : k === a ? 'bad' : '') : ''}" ${a ? 'disabled' : `onclick="dAns(${k})"`}>${k}</button>`).join('');
  const ex = expOf(q.k, q.n), u = q.unit, what = t === 'chart' ? 'תרשים' : 'קטע', sp = u ? secPage(c, secOf(c, q.n)) : 0;
  return `<div class="xtop"><button class="icb" onclick="go('prac')">→ חזרה</button><span class="ttl">🧘 ${esc(D.title)} · ${D.i + 1}/${D.list.length} · ✓ ${D.a}</span><span class="grow"></span><b id="dsw" style="font-variant-numeric:tabular-nums">⏱ ${fmtT(a ? (q.t || 0) * 1000 : dEl())}</b></div>
  <main class="${u ? 'full' : ''}">${u ? `<div class="two"><div class="side">${psgBox(q.k, secOf(c, q.n), u.first)}</div><div>` : ''}<div class="card"><div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><span class="tag ${c.domain[0]}">${DOM[c.domain]}</span><b>${TYPE_HE[t] || ''}</b></div>
  <p class="sm" style="margin:0 0 8px">${esc(e.title)} · ${esc(c.label || DOM[c.domain])} · <b>שאלה ${q.n}</b>${u ? `. שאלות ${u.from} עד ${u.to} הן על אותו ${what}.` : ''}</p></div>
  ${qBox(qid(q.k, q.n), pdf(e, qPage(c, q.n)))}${fmBox(q.k)}
  <p style="margin:14px 0 0">התשובה שלך:</p><div class="bub big">${btns}</div>
  ${a ? `<p style="font-weight:800;font-size:18px;color:${good ? 'var(--gd)' : 'var(--rd)'}">${isVoid(q.k, q.n) ? 'מאל״ו ביטלו את השאלה' : good ? '✅ נכון!' : `❌ התשובה הנכונה: ${right}`}</p>
  ${q.t != null ? `<p class="sm" style="margin:-6px 0 10px">⏱ ענית תוך <b>${fmtT(q.t * 1000)}</b>${u && u.first ? ' (כולל קריאת ה' + what + ')' : ''}</p>` : ''}
  ${ex ? `<div class="card"><b>ההסבר</b><p class="xp" style="margin:6px 0 0">${expHtml(ex)}</p></div>` : ''}
  <button class="btn blue big" onclick="dNext()">${D.i + 1 < D.list.length ? 'לשאלה הבאה' : 'לסיכום'}</button>` : ''}${u ? '</div></div>' : ''}</main>` + navBar();
}
function dNext() { S.drill.i++; if (S.drill.i >= S.drill.list.length) dArchive(S.drill); save(); go('drill'); }
function dArchive(D) { // סבב נכנס להיסטוריה פעם אחת, כשהסתיים או כשמתחילים סבב חדש באמצע
  if (!D || D.done || !D.list || !D.list.some(q => q.ans)) return;
  D.done = 1;
  S.dh.push({ at: Date.now(), title: D.title, dom: D.dom, type: D.type, a: D.a, list: D.list.map(q => ({ k: q.k, n: q.n, ans: q.ans || 0, ...(q.t != null ? { t: q.t } : {}) })) });
  if (S.dh.length > 300) S.dh = S.dh.slice(-300);
}
// ===== סטופר לכל שאלה בתרגול (רועי 23/11): q.el = זמן שכבר נצבר במ״ש, q.t = שניות עד התשובה. עוצר כשיוצאים מהמסך או כשהמסך כבוי =====
let dRun = null; // {i, t0} השאלה שהסטופר רץ עליה עכשיו
const fmtT = ms => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const dEl = () => { const D = S.drill, q = D && D.list[D.i]; return q ? (q.el || 0) + (dRun && dRun.i === D.i ? Date.now() - dRun.t0 : 0) : 0; };
function dShow() { const el = document.getElementById('dsw'); if (el && dRun) el.textContent = '⏱ ' + fmtT(dEl()); }
function dPause() {
  if (!dRun || !S.drill) { dRun = null; return; }
  const q = S.drill.list[dRun.i]; if (q && !q.ans) { q.el = (q.el || 0) + Date.now() - dRun.t0; save(); }
  dRun = null;
}
function dTimeLine(list) { // סיכום זמנים לסבב
  const ts = list.filter(q => q.ans && q.t != null).map(q => q.t); if (!ts.length) return '';
  const sum = ts.reduce((x, y) => x + y, 0), slow = ts.filter(s => s > 90).length;
  return `<div class="card" style="margin-top:14px"><p class="sm" style="margin:0">⏱ סה״כ <b>${fmtT(sum * 1000)}</b> · בממוצע <b>${fmtT(sum / ts.length * 1000)}</b> לשאלה${slow ? ` · ${slow} שאלות מעל דקה וחצי` : ''}</p><p class="mut sm" style="margin:4px 0 0">בבחינה יש בערך דקה לשאלה, כולל השאלות הקלות.</p></div>`;
}
const dhScore = r => { const n = r.list.filter(q => q.ans).length; return `${r.a}/${n} נכון${n < r.list.length ? ` (נענו ${n} מתוך ${r.list.length})` : ''}`; };
const fmtWhen = t => new Date(t).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
function hRow(q, from) { // שורה של שאלה בהיסטוריה. לחיצה פותחת אותה שוב עם התשובה וההסבר
  const x = chByKey[q.k]; if (!x) return '';
  const right = +keyOf(q.k)[q.n - 1] || 0, good = q.ans === right || isVoid(q.k, q.n);
  const ic = !q.ans ? '⏭️' : !right ? '•' : good ? '✅' : '❌';
  return `<div class="it" onclick="go('pq',{k:'${q.k}',n:${q.n},a:${q.ans || 0},t:${q.t != null ? q.t : -1},from:'${from}'})"><span>${ic}</span><div class="grow"><b>${TYPE_HE[typeOf(x.c, q.n)] || ''}</b> · שאלה ${q.n}<div class="mut sm">${esc(chTitle(x))} · ${q.ans ? `ענית ${q.ans}${right && !good ? `, הנכונה ${right}` : ''}` : 'לא נענתה'}</div></div>${q.ans && q.t != null ? `<span class="sm" style="font-variant-numeric:tabular-nums">⏱ ${fmtT(q.t * 1000)}</span>` : ''}<b style="color:var(--b)">◀</b></div>`;
}
let histArg = null;
function hist() { // כל מה שתורגל: הסבבים (החדש למעלה), וכל שאלה שנענתה בתרגול לפי סוג
  const A = histArg = arg || histArg || { t: '', w: 0 };
  const R = S.dh.slice().reverse();
  const rounds = R.length ? R.map((r, i) => `<details class="card" ${i === 0 ? 'open' : ''}><summary><b>${esc(r.title)}</b> · ${dhScore(r)} <span class="mut sm">· ${fmtWhen(r.at)}${(s => s ? ` · ⏱ ${fmtT(s * 1000)}` : '')(r.list.reduce((x, q) => x + (q.ans && q.t ? q.t : 0), 0))}</span></summary><div class="list" style="margin-top:8px">${r.list.map(q => hRow(q, 'hist')).join('')}</div></details>`).join('')
    : '<div class="card"><p class="sm" style="margin:0">עוד אין סבבים שמורים. מעכשיו כל סבב שתסיים יישמר כאן.</p></div>';
  const all = [];
  Object.entries(S.prac).forEach(([k, P]) => { const x = chByKey[k]; if (!x || !keyOf(k)) return; (P.ans || []).forEach((v, i) => { if (!v) return; const right = +keyOf(k)[i]; if (A.t && typeOf(x.c, i + 1) !== A.t) return; if (A.w && (v === right || isVoid(k, i + 1))) return; all.push({ k, n: i + 1, ans: v, at: P.at || 0 }); }); });
  all.sort((a, b) => b.at - a.at);
  const tb = (t, l) => `<option value="${t}" ${A.t === t ? 'selected' : ''}>${l}</option>`;
  return `<div class="xtop"><button class="icb" onclick="go('prac')">→ חזרה</button><span class="ttl">📜 היסטוריית תרגול</span></div><main>
  <h2>סבבים</h2>${rounds}
  <h2>כל השאלות שענית בתרגול</h2><p class="mut sm" style="margin-top:-6px">מכל הסבבים ומפרק שלם בלי שעון, גם מלפני שההיסטוריה נשמרה. התשובה האחרונה שלך לכל שאלה.</p>
  <select class="txt" style="margin:0" onchange="go('hist',{t:this.value,w:${A.w}})">${tb('', 'כל הסוגים')}${Object.entries(TYPE_HE).map(([t, l]) => tb(t, l)).join('')}</select>
  <label class="sm" style="display:flex;gap:8px;align-items:center;margin:10px 0"><input type="checkbox" style="width:20px;height:20px" ${A.w ? 'checked' : ''} onchange="go('hist',{t:'${A.t}',w:this.checked?1:0})">רק טעויות</label>
  <div class="card list">${all.length ? all.slice(0, 150).map(q => hRow(q, 'hist')).join('') : '<p class="sm" style="margin:0">אין שאלות כאן.</p>'}</div>
  ${all.length > 150 ? `<p class="mut sm">מוצגות 150 האחרונות מתוך ${all.length}.</p>` : ''}</main>` + navBar();
}
function pq() { // שאלה אחת מההיסטוריה: השאלה, מה ענית, התשובה הנכונה וההסבר
  const { k, n, a, t: secs, from } = arg || {}, x = chByKey[k]; if (!x) return hist();
  const { c } = x, right = +keyOf(k)[n - 1] || 0, vd = isVoid(k, n), good = a === right || vd, ex = expOf(k, n);
  const btns = [1, 2, 3, 4].map(i => `<button class="${i === right ? 'ok' : i === a ? 'bad' : ''}" disabled>${i}</button>`).join('');
  return `<div class="xtop"><button class="icb" onclick="${from === 'drill' ? "go('drill')" : 'go(\'hist\',histArg)'}">→ חזרה</button><span class="ttl">📜 ${TYPE_HE[typeOf(c, n)] || ''} · שאלה ${n}</span></div>
  <main><div class="card"><p class="sm" style="margin:0">${esc(chTitle(x))} · <b>שאלה ${n}</b></p></div>
  ${qView(k, n, 'closed')}
  <p style="margin:14px 0 0">${a ? 'התשובה שלך:' : 'לא ענית על השאלה הזו.'}</p><div class="bub big">${btns}</div>
  <p style="font-weight:800;font-size:18px;color:${vd || good ? 'var(--gd)' : 'var(--rd)'}">${vd ? 'מאל״ו ביטלו את השאלה' : !right ? '' : good ? `✅ ענית ${a}, נכון` : a ? `❌ ענית ${a} · הנכונה ${right}` : `התשובה הנכונה: ${right}`}</p>
  ${a && secs >= 0 ? `<p class="sm" style="margin:-6px 0 10px">⏱ ענית תוך <b>${fmtT(secs * 1000)}</b></p>` : ''}
  ${ex ? `<div class="card"><b>ההסבר</b><p class="xp" style="margin:6px 0 0">${expHtml(ex)}</p></div>` : ''}</main>` + navBar();
}
function dAns(k) {
  const D = S.drill, q = D.list[D.i], c = chByKey[q.k].c, right = +keyOf(q.k)[q.n - 1];
  q.t = Math.round(dEl() / 1000); delete q.el; dRun = null;
  q.ans = k; if (k === right || isVoid(q.k, q.n)) D.a++;
  const P = S.prac[q.k] = S.prac[q.k] && S.prac[q.k].ans && S.prac[q.k].ans.length ? S.prac[q.k] : { ans: Array(c.questions).fill(0) };
  P.ans[q.n - 1] = k; P.at = Date.now(); save(); reRender();
}

// ===== מילים: המילים והביטויים הקשים מהאנלוגיות של 20 הבחינות, ולימוד בחזרה מרווחת (כמו באמירנט) =====
// המאגר מגיע מוצפן בתוך sol.js (vocab.py → content/words/words.json → seal.js). רק המילים הקשות (רמה 2; MIN_LEVEL ב-vocab.py).
// לכל מילה: w המילה, m פירוש, x דוגמה, alt מובן נוסף, l רמה, n בכמה בחינות הופיעה, o איפה: {t בחינה, s הזוג של השאלה, a התשובה הנכונה, p 0 בזוג של השאלה / 1-4 בתשובה}.
// הסדר במאגר: קודם מה שחזר בכמה בחינות, אחר כך הקשות, ואז מהבחינות החדשות. המילים והזוגות של מאל״ו, הפירושים שלנו.
let VOC = [];
const VI = {};
function vocLoad(list) { VOC = Array.isArray(list) ? list : []; VOC.forEach((v, i) => { VI[v.w] = i; }); }
const DAY = 864e5, VINT = [0, 1, 2, 4, 8, 16, 32]; // ימים עד החזרה הבאה, לפי התיבה
const NEW_PER = 10, REV_MAX = 20;
const vst = v => S.voc[v.w];
const vLearned = v => { const s = vst(v); return !!s && (s.k || s.b >= 3); };
const vDue = () => VOC.filter(v => { const s = vst(v); return s && !s.k && (s.due || 0) <= Date.now(); });
const vWeak = () => VOC.filter(v => { const s = vst(v); return s && !s.k && s.bad > 0 && s.b < 3; });
const vNew = () => VOC.filter(v => !vst(v));
const vTags = v => v.n > 1 ? `<span class="tag v">${v.n} בחינות</span>` : ''; // המאגר כולו מילים קשות, אז אין תג «קשה»
const vMark = (txt, w) => esc(txt).split(esc(w)).join(`<mark>${esc(w)}</mark>`);
const vOcc = v => (v.o || []).map(o => `<div class="occ"><span class="mut sm">${esc(o.t)}${o.p ? ` · בתשובה ${o.p}` : ' · בשאלה'}</span><div>${vMark(o.s, v.w)} <span class="mut">→</span> ${vMark(o.a, v.w)}</div></div>`).join('');
const VOC_NOTE = 'המילים והזוגות מהאנלוגיות בבחינות של מאל״ו. הפירושים והדוגמאות נכתבו אצלנו, כי מאל״ו לא מפרסמים מילון.';
function vCard(v, big) {
  return `<div class="vw ${big ? 'big' : ''}">${esc(v.w)}</div><div style="text-align:center;margin:2px 0 10px">${vTags(v)}</div>
  <p class="vm">${esc(v.m)}</p>${v.alt ? `<p class="sm mut" style="text-align:center;margin:-4px 0 8px">גם: ${esc(v.alt)}</p>` : ''}
  ${v.x ? `<p class="vx">«${esc(v.x)}»</p>` : ''}${(v.o || []).length ? `<div class="sm" style="font-weight:700;margin:12px 0 4px">איפה הופיעה (השאלה → התשובה הנכונה):</div>${vOcc(v)}` : ''}`;
}
function vGrade(v, ok) {
  const now = Date.now(), d = dayKey(now), s = S.voc[v.w] = S.voc[v.w] || { b: 0, ok: 0, bad: 0 };
  if (!s.f) s.f = d; // היום שבו התחילה ללמוד אותה
  // נכון: עולה תיבה פעם אחת ביום. גם אחרי טעות ותיקון באותו יום, החזרה הבאה מחר ולא עכשיו
  if (ok) { s.ok = (s.ok || 0) + 1; if (s.day !== d) s.b = Math.min((s.b || 0) + 1, VINT.length - 1); s.due = now + Math.max(1, VINT[s.b || 0]) * DAY; }
  else { s.bad = (s.bad || 0) + 1; s.b = 0; s.due = now; }
  s.day = d; s.at = now;
}
function vStart(mode) {
  if (!VOC.length) return toast('המילים נעולות. צריך את קוד הגישה');
  const T = { learn: 'שיעור', review: 'חזרה', weak: 'מילים שטעיתי בהן', rep: 'החוזרות' };
  let q = [];
  const ask = v => ({ i: VI[v.w], t: Math.random() < 0.5 ? 'mean' : 'rev' });
  if (mode === 'learn' || mode === 'rep') {
    const pool = mode === 'rep' ? vNew().filter(v => v.n > 1) : vNew(), nw = pool.slice(0, NEW_PER);
    for (let g = 0; g < nw.length; g += 3) { const gr = nw.slice(g, g + 3); gr.forEach(v => q.push({ i: VI[v.w], t: 'intro' })); shuffle(gr.slice()).forEach(v => q.push({ i: VI[v.w], t: 'mean' })); }
    q = q.concat(shuffle(nw.map(v => ({ i: VI[v.w], t: 'rev' }))).concat(shuffle(vDue()).slice(0, mode === 'learn' ? REV_MAX : 0).map(ask)));
  } else if (mode === 'review') q = shuffle(vDue()).slice(0, REV_MAX * 2).map(ask);
  else if (mode === 'weak') q = shuffle(vWeak()).slice(0, REV_MAX).map(ask);
  if (!q.length) return toast(mode === 'review' ? 'אין מילים לחזרה עכשיו ✓' : mode === 'weak' ? 'אין מילים שטעית בהן ✓' : 'אין מילים חדשות');
  S.vl = { title: T[mode], q, i: 0, a: 0, n: 0, wrong: {} }; save(); go('vles');
}
function vOpts(v, t) { // התשובה הנכונה ועוד 3 מאותה רמה, בלי פירוש זהה
  const key = t === 'mean' ? 'm' : 'w', pool = shuffle(VOC.filter(x => x !== v && x[key] !== v[key] && x.l === v.l)).slice(0, 3);
  return shuffle([v, ...pool]).map(x => VI[x.w]);
}
function vles() {
  const L = S.vl; if (!L) return voc();
  if (L.i >= L.q.length) return `<main><h1>🔤 ${esc(L.title)}</h1><div class="big-score">${L.a}/${L.n}</div><div style="text-align:center" class="mut">נכון בשיעור הזה</div>
    <p class="sm" style="text-align:center">${vDue().length ? `${vDue().length} מילים מחכות לחזרה.` : 'אין מילים שמחכות לחזרה עכשיו.'}</p>
    <div class="row" style="margin-top:14px"><button class="btn blue" onclick="vStart('learn')">עוד ${NEW_PER} מילים</button><button class="btn ghost" onclick="delete S.vl;save();go('voc')">למילים</button></div></main>` + navBar();
  const it = L.q[L.i], v = VOC[it.i]; if (!v) { L.i++; return vles(); }
  const top = `<div class="xtop"><button class="icb" onclick="go('voc')">→ חזרה</button><span class="ttl">🔤 ${esc(L.title)} · ${L.i + 1}/${L.q.length}${L.n ? ` · ✓ ${L.a}` : ''}</span></div>`;
  if (it.t === 'intro') return top + `<main><div class="sm mut" style="text-align:center">מילה חדשה</div><div class="card">${vCard(v, true)}</div>
    <button class="btn blue big" onclick="S.vl.i++;save();go('vles')">הבנתי, הלאה</button><button class="btn ghost" onclick="vKnow()">אני כבר מכיר אותה</button></main>` + navBar();
  it.o = it.o || vOpts(v, it.t);
  const pick = it.a, done = pick !== undefined;
  const opts = it.o.map((k, j) => { const x = VOC[k], cls = done ? (k === it.i ? 'ok' : j === pick ? 'bad' : '') : ''; return `<button class="opt ${cls}" ${done ? 'disabled' : `onclick="vAns(${j})"`}><span class="num">${j + 1}</span><span>${esc(it.t === 'mean' ? x.m : x.w)}</span></button>`; }).join('');
  return top + `<main><div class="sm mut" style="text-align:center">${it.t === 'mean' ? 'מה הפירוש?' : 'איזו מילה מתאימה לפירוש?'}</div>
    <div class="card" style="text-align:center">${it.t === 'mean' ? `<div class="vw big">${esc(v.w)}</div>` : `<p class="vm" style="margin:6px 0">${esc(v.m)}</p>`}</div>
    <div class="opts">${opts}</div>
    ${done ? `<p style="font-weight:800;font-size:18px;color:${it.o[pick] === it.i ? 'var(--gd)' : 'var(--rd)'}">${it.o[pick] === it.i ? '✅ נכון!' : '❌ לא בדיוק. המילה תחזור בסוף השיעור.'}</p>
    <div class="card">${vCard(v)}</div><button class="btn blue big" onclick="S.vl.i++;save();go('vles')">${L.i + 1 < L.q.length ? 'הלאה' : 'לסיכום'}</button>` : ''}</main>` + navBar();
}
function vAns(j) {
  const L = S.vl, it = L.q[L.i], v = VOC[it.i], ok = it.o[j] === it.i;
  it.a = j; L.n++; if (ok) L.a++;
  vGrade(v, ok);
  if (!ok && !L.wrong[it.i]) { L.wrong[it.i] = 1; L.q.push({ i: it.i, t: it.t === 'mean' ? 'rev' : 'mean' }); }
  save(); reRender();
}
function vKnow() {
  const L = S.vl, it = L.q[L.i], v = VOC[it.i];
  S.voc[v.w] = Object.assign(S.voc[v.w] || { b: 0, ok: 0, bad: 0 }, { k: 1, at: Date.now() });
  L.q = L.q.filter((x, j) => j <= L.i || x.i !== it.i); L.i++;
  // במקום המילה שהוא מכיר נכנסת החדשה הבאה
  const nx = vNew().find(x => !L.q.some(y => y.i === VI[x.w]));
  if (nx) L.q.splice(L.i, 0, { i: VI[nx.w], t: 'intro' }, { i: VI[nx.w], t: 'mean' });
  toast('✓ סומנה כמוכרת'); save(); go('vles');
}
// ===== כרטיסיות: מילה מקדימה, הפירוש מאחורה, ושלושה דירוגים =====
const VC_F = [['seen', 'כל מה שלמדתי'], ['r1', 'לא יודע'], ['r2', 'קצת מכיר'], ['r3', 'יודע'], ['all', 'כל המאגר']];
function vcStart(f) {
  const pool = VOC.filter(v => { const s = vst(v); return f === 'all' ? true : f === 'seen' ? !!s : !!s && s.r === +f[1]; });
  if (!pool.length) return toast('אין מילים ברשימה הזו');
  S.vc = { f, list: shuffle(pool.map(v => VI[v.w])).slice(0, 40), i: 0, flip: 0 }; save(); go('vcards');
}
function vcards() {
  const C = S.vc; if (!C) return voc();
  const top = `<div class="xtop"><button class="icb" onclick="go('voc')">→ חזרה</button><span class="ttl">🃏 כרטיסיות · ${VC_F.find(x => x[0] === C.f)[1]} · ${Math.min(C.i + 1, C.list.length)}/${C.list.length}</span></div>`;
  if (C.i >= C.list.length) return top + `<main><div class="card" style="text-align:center"><b>סיימת את החבילה 🎉</b></div><button class="btn blue" onclick="vcStart(S.vc.f)">עוד חבילה</button><button class="btn ghost" style="margin-top:10px" onclick="delete S.vc;save();go('voc')">למילים</button></main>` + navBar();
  const v = VOC[C.list[C.i]];
  return top + `<main><div class="card flip" onclick="S.vc.flip=1;save();reRender()">${C.flip ? vCard(v, true) : `<div class="vw big" style="margin:40px 0">${esc(v.w)}</div><p class="mut sm" style="text-align:center">לחיצה כדי לראות את הפירוש</p>`}</div>
  ${C.flip ? `<div class="row"><button class="btn red" onclick="vcRate(1)">לא יודע</button><button class="btn ghost" onclick="vcRate(2)">קצת מכיר</button><button class="btn" onclick="vcRate(3)">יודע</button></div>` : ''}</main>` + navBar();
}
function vcRate(r) {
  const C = S.vc, v = VOC[C.list[C.i]], s = S.voc[v.w] = S.voc[v.w] || { b: 0, ok: 0, bad: 0, due: Date.now() };
  s.r = r; s.at = Date.now();
  if (r === 1) { s.bad = (s.bad || 0) + 1; s.b = 0; s.due = Date.now(); } // לא יודע: חוזרת לחזרה הקרובה
  C.i++; C.flip = 0; save(); reRender();
}
// ===== המילון: כל המאגר, עם חיפוש וסינון =====
const VL_F = [['all', 'הכל'], ['rep', 'חוזרות'], ['weak', 'טעיתי'], ['new', 'לא נלמדו']];
let vlF = 'all', vlQ = '';
function vlRows() {
  const q = vlQ.trim(), W = new Set(vWeak());
  const L = VOC.filter(v => (vlF === 'rep' ? v.n > 1 : vlF === 'weak' ? W.has(v) : vlF === 'new' ? !vst(v) : true) && (!q || v.w.includes(q) || v.m.includes(q)));
  const dot = v => { const s = vst(v); return !s ? '' : s.k ? '✓' : W.has(v) ? '⚠️' : vLearned(v) ? '✓' : '·'; };
  return `<p class="mut sm">${L.length} מילים</p>` + L.map(v => `<details class="qx"><summary><b>${esc(v.w)}</b><span class="grow mut sm" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(v.m)}</span>${vTags(v)}<span>${dot(v)}</span></summary>
    <div style="padding:0 12px 12px">${vCard(v)}<button class="btn ghost" style="margin-top:10px" onclick="vToggleKnown(${VI[v.w]})">${vst(v) && vst(v).k ? 'להחזיר ללימוד' : 'אני כבר מכיר אותה'}</button></div></details>`).join('');
}
function vToggleKnown(i) { const v = VOC[i], s = S.voc[v.w] = S.voc[v.w] || { b: 0, ok: 0, bad: 0 }; s.k = s.k ? 0 : 1; s.at = Date.now(); if (!s.k) s.due = Date.now(); save(); document.getElementById('vl').innerHTML = vlRows(); }
function vlist() {
  return `<div class="xtop"><button class="icb" onclick="go('voc')">→ חזרה</button><span class="ttl">📖 המילון</span></div><main>
  <input class="txt" placeholder="חיפוש מילה או פירוש" value="${esc(vlQ)}" oninput="vlQ=this.value;document.getElementById('vl').innerHTML=vlRows()">
  <div class="seg">${VL_F.map(([k, l]) => `<button class="${vlF === k ? 'on' : ''}" onclick="vlF='${k}';reRender()">${l}</button>`).join('')}</div>
  <div id="vl">${vlRows()}</div><p class="mut sm">${VOC_NOTE}</p></main>` + navBar();
}
// ===== מיון מהיר: מילים שעוד לא ראית. «מכיר» יוצאת מהלימוד, «לא מכיר» נכנסת לשיעורים =====
function vsStart() { const L = vNew().map(v => VI[v.w]); if (!L.length) return toast('מיינת את כל המילים ✓'); S.vs = { list: L, i: 0, show: 0, k: 0, u: 0 }; go('vsort'); }
function vsort() {
  const Z = S.vs; if (!Z) return voc();
  while (Z.i < Z.list.length && S.voc[VOC[Z.list[Z.i]].w] && !Z.show) Z.i++;
  const top = `<div class="xtop"><button class="icb" onclick="go('voc')">→ חזרה</button><span class="ttl">⚡ מיון מהיר · ✓ ${Z.k} מכיר · ✗ ${Z.u} ללמוד</span></div>`;
  if (Z.i >= Z.list.length) return top + `<main><div class="card" style="text-align:center"><b>מיינת את כל המילים 🎉</b></div><button class="btn blue" onclick="vStart('learn')">לשיעור</button></main>` + navBar();
  const v = VOC[Z.list[Z.i]];
  return top + `<main><p class="mut sm" style="text-align:center">מכיר את המילה ויודע להסביר אותה? אם כן, היא יוצאת מהלימוד. בספק — «לא בטוח».</p>
  <div class="card">${Z.show ? vCard(v, true) : `<div class="vw big" style="margin:36px 0 8px">${esc(v.w)}</div><div style="text-align:center">${vTags(v)}</div><p class="mut sm" style="text-align:center">${Z.i + 1} מתוך ${Z.list.length}</p>`}</div>
  ${Z.show ? `<button class="btn blue big" onclick="S.vs.show=0;S.vs.i++;save();reRender()">הלאה</button>` : `<div class="row"><button class="btn" onclick="vsAns(1)">מכיר ✓</button><button class="btn red" onclick="vsAns(0)">לא בטוח</button></div>
  <button class="btn ghost" onclick="S.vs.show=1;save();reRender()">להציץ בפירוש</button>`}</main>` + navBar();
}
function vsAns(k) {
  const Z = S.vs, v = VOC[Z.list[Z.i]], now = Date.now();
  if (k) { S.voc[v.w] = { b: 0, ok: 0, bad: 0, k: 1, at: now }; Z.k++; Z.i++; }
  else { S.voc[v.w] = { b: 0, ok: 0, bad: 0, due: now, at: now, f: dayKey(now) }; Z.u++; Z.show = 1; } // נכנסת לחזרה הקרובה
  save(); reRender();
}
// ===== מסך המילים =====
function voc() {
  if (!VOC.length) return `<main><h1>🔤 מילים</h1>${window.SOLX ? codeCard() : '<div class="card">המאגר עוד לא נטען.</div>'}</main>` + navBar();
  const seen = VOC.filter(vst), learned = VOC.filter(vLearned), due = vDue().length, weak = vWeak().length, nw = vNew();
  const rep = VOC.filter(v => v.n > 1), repL = rep.filter(vLearned).length;
  const L = S.vl && S.vl.i < S.vl.q.length ? S.vl : null, dl = daysLeft(), today = dayKey(Date.now());
  const goal = dl > 0 ? Math.ceil(nw.length / dl) : nw.length, todayNew = VOC.filter(v => { const s = vst(v); return s && !s.k && s.f === today; }).length;
  return `<main><h1>🔤 מילים</h1>
  <div class="card hero"><div style="font-size:26px;font-weight:800"><span class="ltr">${learned.length} / ${VOC.length}</span></div><div class="mut sm">מילים וביטויים קשים מהאנלוגיות של ${EX.length} הבחינות שכבר נלמדו</div>
  <div class="bar" style="margin-top:8px;background:rgba(255,255,255,.3)"><i style="width:${pct(learned.length, VOC.length)}%;background:#fff"></i></div></div>
  <div class="kpis"><div class="kpi"><b>${due}</b><span>לחזרה עכשיו</span></div><div class="kpi"><b>${seen.length - learned.length}</b><span>בתהליך</span></div><div class="kpi"><b>${repL}/${rep.length}</b><span>החוזרות</span></div></div>
  ${L ? `<div class="card"><b>באמצע: ${esc(L.title)}</b><p class="mut sm" style="margin:4px 0 8px">${L.i + 1} מתוך ${L.q.length}</p><button class="btn blue" onclick="go('vles')">להמשיך</button></div>` : ''}
  ${nw.length ? `<div class="card"><b>היעד להיום: ${goal} מילים חדשות</b> <span class="mut sm">(${todayNew} כבר היום)</span><p class="mut sm" style="margin:4px 0 0">${nw.length} מילים שעוד לא ראית, ${dl > 0 ? `${dl} ימים עד הבחינה` : 'הבחינה עברה'}. שיעור = ${NEW_PER} חדשות, אז ${Math.ceil(goal / NEW_PER)} שיעורים ביום. מילים שאתה כבר מכיר מורידים מהר ב«מיון מהיר», והיעד יורד.</p></div>` : ''}
  <button class="btn blue big" onclick="vStart('learn')">${nw.length ? `שיעור: ${Math.min(NEW_PER, nw.length)} מילים חדשות${due ? ` + ${Math.min(due, REV_MAX)} לחזרה` : ''}` : 'אין מילים חדשות. לחזרה'}</button>
  ${nw.length ? `<button class="btn ghost" style="margin-bottom:10px" onclick="vsStart()">⚡ מיון מהיר: מה אני כבר מכיר (${nw.length})</button>` : ''}
  <div class="row"><button class="btn ghost" onclick="vStart('review')">🔁 חזרה (${due})</button><button class="btn ghost" onclick="vStart('weak')">⚠️ טעיתי (${weak})</button></div>
  <h2>🃏 כרטיסיות</h2><div class="card"><p class="sm" style="margin-top:0">מילה מקדימה, פירוש מאחורה. מדרגים: יודע, קצת מכיר, לא יודע. «לא יודע» חוזרת לחזרה הקרובה.</p>
  <div class="seg" style="flex-wrap:wrap">${VC_F.map(([k, l]) => `<button onclick="vcStart('${k}')">${l}${k[0] === 'r' ? ` (${VOC.filter(v => vst(v) && vst(v).r === +k[1]).length})` : ''}</button>`).join('')}</div></div>
  <button class="btn ghost" onclick="go('vlist')">📖 המילון: כל ${VOC.length} המילים</button>
  <h2>איך לומדים</h2><div class="card"><p class="sm" style="margin:0">באנלוגיות (6 שאלות בכל פרק מילולי) שאלה נופלת בדרך כלל על מילה אחת שלא מכירים. המאגר הוא ${VOC.length} המילים והביטויים הקשים מכל ${EX.length} הבחינות הרשמיות: מילים ספרותיות, נדירות וניבים. <b>${rep.length} מהם חזרו ב-2 בחינות או יותר</b>, והם באים ראשונים.</p>
  <p class="sm">קודם «מיון מהיר»: עוברים על המילים ומוציאים את מה שכבר מכירים (שניה למילה). מה שנשאר נלמד בשיעורים: ${NEW_PER} חדשות בכל שיעור, ואז חזרה על מה שהגיע זמנו (אחרי יום, יומיים, 4, 8, 16 ו-32). טעות מחזירה את המילה להתחלה. מילה נחשבת «נלמדה» אחרי 3 חזרות נכונות בימים שונים.</p>
  ${rep.length - rep.filter(vst).length > 0 ? `<p class="sm" style="margin-bottom:0">רוצה להתחיל רק מהחוזרות? <a href="#" onclick="vStart('rep');return false">שיעור מ-${rep.length} החוזרות</a>.</p>` : ''}</div>
  <p class="mut sm">${VOC_NOTE}</p></main>` + navBar();
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
  <div class="seg">${[['2026-12-04', 'ו׳ 4.12'], ['2026-12-06', 'א׳ 6.12']].map(([d, l]) => `<button class="${S.examDate === d ? 'on' : ''}" onclick="S.examDate='${d}';S.examDateAt=Date.now();save();render()">${l}</button>`).join('')}</div>
  <input class="txt" type="date" value="${S.examDate}" onchange="S.examDate=this.value;S.examDateAt=Date.now();save();render()"></div>
  ${window.SOLX ? `<div class="card"><b>מפתחות והסברים</b><p class="mut sm" style="margin:4px 0 8px">${locked() ? 'נעולים. צריך את קוד הגישה פעם אחת במכשיר.' : `פתוחים ✓ (${Object.keys(SOL).filter(k => !k.endsWith(':scale')).length} פרקים, טבלאות ציון ל-${Object.keys(SOL).filter(k => k.endsWith(':scale')).length} בחינות)`}</p>${locked() ? codeInput() : ''}</div>` : ''}
  <div class="card"><b>שמירה בענן</b><p class="sm" style="margin:4px 0 8px">${cloudId ? `כל פרק, מפתח וטעות שתוקנה נשמרים בענן. ההתקדמות אישית: מי שמקבל את הקישור הרגיל מתחיל מאפס. כדי להמשיך במכשיר נוסף שלך, פותחים בו את הקישור האישי.<br>${cloudLine()}` : 'נדלקת אחרי שפותחים את המפתחות עם קוד הגישה. עד אז ההתקדמות נשמרת רק במכשיר הזה.'}</p>${cloudId ? '<button class="btn ghost" onclick="cloudSync().then(render)">לסנכרן עכשיו</button><button class="btn ghost" onclick="copyMyLink()">📱 הקישור האישי שלי (למכשיר נוסף)</button><button class="btn ghost" onclick="pasteMyLink()">🔗 להמשיך כאן התקדמות ממכשיר אחר</button>' : ''}</div>
  <div class="card"><b>גיבוי ידני</b><p class="mut sm">קוד גיבוי של כל ההתקדמות, למקרה הצורך. מעתיקים, ומדביקים במכשיר אחר כדי לטעון.</p>
  <button class="btn blue" onclick="expo()">העתקת קוד גיבוי</button><textarea class="txt" id="imp" rows="3" placeholder="להדביק כאן קוד גיבוי" style="margin-top:12px"></textarea><button class="btn ghost" onclick="impo()">טעינת גיבוי</button></div>
  <div class="card"><b>על האפליקציה</b><p class="mut sm">השאלות, נושאי החיבור, המפתחות וטבלאות הציון הם של מאל״ו.  ההסברים לכל שאלה נכתבו לפי המפתח הרשמי, כי מאל״ו לא מפרסמים הסברים. מוצר אישי, לא קשור למאל״ו.</p></div>
  <button class="btn ghost" onclick="go('home')">חזרה</button></main>` + navBar();
}
function openQ(n) { const d = document.getElementById('q' + n); if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
function codeInput() { return `<div class="row"><input class="txt" id="cd" placeholder="קוד גישה" autocomplete="off" style="margin:0"><button class="btn blue" style="width:auto;padding:12px 18px" onclick="setCode(document.getElementById('cd').value)">לפתוח</button></div>`; }
function codeCard() { return `<div class="card"><b>🔒 המפתחות וההסברים נעולים במכשיר הזה</b><p class="sm" style="margin:4px 0 8px">פותחים פעם אחת עם הקישור המלא שקיבלת, או מקלידים כאן את קוד הגישה. כדי להמשיך התקדמות ממכשיר אחר, מדביקים כאן את «הקישור האישי» מההגדרות שם.</p>${codeInput()}</div>`; }
function pasteMyLink() { const v = prompt('להדביק כאן את «הקישור האישי» מהמכשיר השני:'); if (v && /[#&]u=[\w-]+/.test(v)) setCode(v); else if (v) toast('זה לא קישור אישי'); }
function copyMyLink() { // הקישור האישי: קוד הגישה + המזהה האישי. פותח את אותה התקדמות במכשיר אחר
  let k = ''; try { k = localStorage.getItem(PK) || ''; } catch (e) { }
  const url = location.origin + location.pathname + '#k=' + k + '&u=' + myUid;
  (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('הקישור האישי הועתק ✓ לא לשלוח אותו לאחרים'), () => prompt('הקישור האישי שלך (לא לשלוח לאחרים):', url));
}
function expo() {
  const code = btoa(unescape(encodeURIComponent(JSON.stringify({ res: S.res, keys: S.keys, fix: S.fix, wr: S.wr, read: S.read, prac: S.prac, voc: S.voc, examDate: S.examDate, gone: S.gone, dh: S.dh, sims: S.sims }))));
  (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => toast('הקוד הועתק ✓'), () => { document.getElementById('imp').value = code; toast('הקוד בתיבה — להעתיק ידנית'); });
}
function impo() {
  try { const d = JSON.parse(decodeURIComponent(escape(atob(document.getElementById('imp').value.trim())))); if (!d.res) throw 0; if (!confirm('לטעון? זה מחליף את מה שיש במכשיר.')) return; Object.assign(S, d); save(); toast('נטען ✓'); go('home'); }
  catch (e) { toast('הקוד לא תקין'); }
}

try { localStorage.removeItem('pd1'); } catch (e) { } // הגרסה הקודמת עם שאלות שלא ממאל״ו
// מבקשים מהדפדפן לא למחוק את האחסון של האתר כשחסר מקום. בלי זה, מכשיר שאיבד את המזהה האישי (pd2u) מתחיל מאפס
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { }); } catch (e) { }
render();
(async () => { // פתיחת המפתחות וההסברים: מהקישור (#k=...) או מהקוד שנשמר
  let p = null, had = false; const m = location.hash.match(/k=([\w-]+)/), mu = location.hash.match(/[#&]u=([\w-]+)/);
  try { had = !!localStorage.getItem(PK); } catch (e) { } // מכשיר שכבר נפתח בעבר נשאר על ההתקדמות שלו
  if (m) { p = m[1]; history.replaceState(null, '', location.pathname + location.search); }
  if (!p) try { p = localStorage.getItem(PK); } catch (e) { }
  if (!p || !(await unseal(p))) p = (await unseal(OPEN)) ? OPEN : null;
  opening = false;
  if (p) { pickUid(mu && mu[1], had); try { localStorage.setItem(PK, p); } catch (e) { } cloudInit(p); }
  render();
})();
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') dPause(); else if (view === 'drill') reRender(); }); // הסטופר בתרגול עוצר כשהמסך כבוי או באפליקציה אחרת
addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') cloudSync(); else if (cloudT) { clearTimeout(cloudT); cloudSync(); } });
