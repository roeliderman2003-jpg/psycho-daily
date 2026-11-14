// בונה את chapters.js מכל קובצי content/src/*.json ובודק שכל פרק תקין.
// הרצה: node build.js
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'content', 'src');
const files = fs.readdirSync(dir).filter(f => /^[vq]\d\d\.json$/.test(f)).sort();
const out = [], errs = [];
const NEED = { verbal: 23, quant: 20 };
for (const f of files) {
  let c;
  try { c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { errs.push(`${f}: JSON לא תקין — ${e.message}`); continue; }
  const e = m => errs.push(`${f}: ${m}`);
  if (c.id + '.json' !== f) e(`id ${c.id} לא תואם לשם הקובץ`);
  if (!NEED[c.domain]) e(`domain לא מוכר: ${c.domain}`);
  if (c.questions.length !== NEED[c.domain]) e(`${c.questions.length} שאלות במקום ${NEED[c.domain]}`);
  c.minutes = c.minutes || 20; c.stims = c.stims || {};
  const dist = [0, 0, 0, 0];
  c.questions.forEach((q, i) => {
    const w = m => e(`שאלה ${i + 1}: ${m}`);
    if (!Array.isArray(q.options) || q.options.length !== 4) w('צריך 4 תשובות');
    if (![1, 2, 3, 4].includes(q.answer)) w(`answer לא תקין: ${q.answer}`); else dist[q.answer - 1]++;
    for (const k of ['type', 'stem', 'explain']) if (!q[k]) w(`חסר ${k}`);
    if (q.stim && !c.stims[q.stim]) w(`stim ${q.stim} לא קיים`);
    if (q.traps && q.traps.length !== 4) w('traps צריך 4 פריטים');
    q.n = i + 1;
  });
  console.log(`${f}: ${c.questions.length} שאלות, פיזור תשובות ${dist.join('/')}`);
  out.push(c);
}
if (errs.length) { console.error('\nשגיאות:\n' + errs.join('\n')); process.exit(1); }
fs.writeFileSync(path.join(__dirname, 'chapters.js'), '// נוצר אוטומטית מ-content/src ע"י build.js. לא לערוך כאן.\nwindow.CHAPTERS = ' + JSON.stringify(out) + ';\n');
console.log(`\nchapters.js: ${out.length} פרקים`);
