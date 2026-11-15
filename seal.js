// אורז את המפתחות וההסברים (content/solutions/*.json, מחוץ ל-git) לקובץ מוצפן sol.js.
// הבחינות של מאל״ו אסורות בהפצה, ולכן באתר הציבורי יש רק עותק מוצפן. רק מי שיש לו קוד הגישה (קובץ .secret) פותח אותו.
// הרצה: node seal.js   (אחרי node build.js)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const secretFile = path.join(__dirname, '.secret');
if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(8).toString('hex').slice(0, 10));
const pass = fs.readFileSync(secretFile, 'utf8').trim();
const exams = Object.fromEntries(fs.readdirSync(path.join(__dirname, 'content', 'exams')).map(f => [f.replace('.json', ''), require(`./content/exams/${f}`)]));
const dir = path.join(__dirname, 'content', 'solutions'), out = {}, errs = [];
let nq = 0, nx = 0;
for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')) : []) {
  const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), e = exams[s.id];
  if (!e) { errs.push(`${f}: אין מפה לבחינה ${s.id}`); continue; }
  e.chapters.forEach((c, i) => {
    const x = (s.chapters || [])[i];
    if (!x || x.key.length !== c.questions || /[^1-4]/.test(x.key)) return errs.push(`${f}: פרק ${i + 1} מפתח לא תקין`);
    const exp = (x.exp || []).slice(0, c.questions);
    out[`${s.id}:${i}`] = { k: x.key, x: exp, d: x.doubt || [] };
    nq += c.questions; nx += exp.filter(Boolean).length;
  });
}
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(pass, salt, 150000, 32, 'sha256');
const ci = crypto.createCipheriv('aes-256-gcm', key, iv);
const data = Buffer.concat([ci.update(JSON.stringify(out), 'utf8'), ci.final(), ci.getAuthTag()]);
const b = x => x.toString('base64');
fs.writeFileSync(path.join(__dirname, 'sol.js'), `// נוצר ע"י seal.js. מוצפן.\nwindow.SOLX = ${JSON.stringify({ salt: b(salt), iv: b(iv), data: b(data) })};\n`);
console.log(`sol.js: ${Object.keys(out).length} פרקים, ${nq} שאלות, ${nx} הסברים`);
