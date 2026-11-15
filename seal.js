// אורז את המפתחות וההסברים (content/solutions/*.json, מחוץ ל-git) לקובץ מוצפן sol.js.
// הבחינות של מאל״ו אסורות בהפצה, ולכן באתר הציבורי יש רק עותק מוצפן. רק מי שיש לו קוד הגישה (קובץ .secret) פותח אותו.
// הרצה: node seal.js   (אחרי node build.js)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const secretFile = path.join(__dirname, '.secret');
if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(8).toString('hex').slice(0, 10));
const pass = fs.readFileSync(secretFile, 'utf8').trim();
const exams = Object.fromEntries(fs.readdirSync(path.join(__dirname, 'content', 'exams')).map(f => [f.replace('.json', ''), require(`./content/exams/${f}`)]));
const dir = path.join(__dirname, 'content', 'solutions'), out = {}, errs = [];
let nq = 0, nx = 0, ns = 0;
for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')) : []) {
  const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), e = exams[s.id];
  if (!e) { errs.push(`${f}: אין מפה לבחינה ${s.id}`); continue; }
  e.chapters.forEach((c, i) => {
    const x = (s.chapters || [])[i];
    if (!x || x.key.length !== c.questions || /[^1-4]/.test(x.key)) return errs.push(`${f}: פרק ${i + 1} מפתח לא תקין`);
    const exp = (x.exp || []).slice(0, c.questions);
    out[`${s.id}:${i}`] = { k: x.key, x: exp, d: x.doubt || [], v: x.void || [] };
    nq += c.questions; nx += exp.filter(Boolean).length;
  });
  // טבלאות אומדן הציון של מאל״ו לבחינה (מסוף הקובץ): גלם → ציון תחום, משוקלל → ציון כללי, ציון → אחוזון
  if (s.scale) {
    // שאלה שמאל״ו ביטלו יוצאת מהספירה, ולכן הטבלה של התחום קצרה בשורה
    const cnt = d => e.chapters.reduce((a, c, i) => a + (c.domain === d ? c.questions - ((s.chapters[i] || {}).void || []).length : 0), 0);
    const t = s.scale, nv = cnt('verbal'), nqn = cnt('quant');
    const mono = a => a.every((x, i) => !i || x >= a[i - 1]);
    if (!Array.isArray(t.v) || t.v.length !== nv + 1 || !mono(t.v) || t.v[0] !== 50 || t.v[nv] !== 150) errs.push(`${f}: טבלת מילולי לא תקינה (צריך ${nv + 1} ערכים מ-50 עד 150)`);
    if (!Array.isArray(t.q) || t.q.length !== nqn + 1 || !mono(t.q) || t.q[0] !== 50 || t.q[nqn] !== 150) errs.push(`${f}: טבלת כמותי לא תקינה (צריך ${nqn + 1} ערכים מ-50 עד 150)`);
    if (!Array.isArray(t.g) || t.g[0][0] !== 50 || t.g[t.g.length - 1][1] !== 150 || t.g.some((r, i) => r[0] > r[1] || r[2] > r[3] || (i && (r[0] <= t.g[i - 1][1] || r[2] <= t.g[i - 1][3])))) errs.push(`${f}: טבלת הציון הכללי לא תקינה`);
    if (!Array.isArray(t.p) || t.p.some((r, i) => r.length !== 5 || r[2] + r[3] + r[4] < 98 || r[2] + r[3] + r[4] > 102 || (i && r[0] !== t.p[i - 1][1] + 1))) errs.push(`${f}: טבלת האחוזונים לא תקינה`);
    out[`${s.id}:scale`] = { v: t.v, q: t.q, g: t.g, p: t.p };
    ns++;
  }
}
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(pass, salt, 150000, 32, 'sha256');
const ci = crypto.createCipheriv('aes-256-gcm', key, iv);
const data = Buffer.concat([ci.update(JSON.stringify(out), 'utf8'), ci.final(), ci.getAuthTag()]);
const b = x => x.toString('base64');
fs.writeFileSync(path.join(__dirname, 'sol.js'), `// נוצר ע"י seal.js. מוצפן.\nwindow.SOLX = ${JSON.stringify({ salt: b(salt), iv: b(iv), data: b(data) })};\n`);
console.log(`sol.js: ${Object.keys(out).length - ns} פרקים, ${nq} שאלות, ${nx} הסברים, ${ns} טבלאות ציון`);
