// בונה את chapters.js ממפות הבחינות הרשמיות של מאל״ו (content/exams/*.json) ובודק אותן.
// המפות מכילות רק מבנה: עמודים, פרקים, מספר שאלות וטווחי סוגי שאלות. אין בהן שאלות או תשובות.
// הרצה: node build.js
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'content', 'exams');
const SEASON = { winter: 4, autumn: 3, summer: 2, spring: 1 };
const order = id => { const [s, y] = id.split('_'); return +y * 10 + (SEASON[s] || 0); };
const out = [], errs = [];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
  let e; try { e = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (x) { errs.push(`${f}: JSON לא תקין — ${x.message}`); continue; }
  const err = m => errs.push(`${f}: ${m}`);
  if (e.id + '.json' !== f) err('id לא תואם לשם הקובץ');
  if (!/^https:\/\/www\.nite\.org\.il\/.+\.pdf$/.test(e.url || '')) err('url לא של מאל״ו');
  e.chapters = (e.chapters || []).filter(c => ['verbal', 'quant'].includes(c.domain));
  if (!e.chapters.length) err('אין פרקי מילולי/כמותי');
  e.chapters.forEach((c, i) => {
    const w = m => err(`פרק ${i + 1}: ${m}`);
    if (!c.page || !c.endPage || c.endPage < c.page) w('עמודים לא תקינים');
    if (!c.questions) w('חסר מספר שאלות');
    c.minutes = c.minutes || 20;
    const cov = Array(c.questions + 1).fill(0);
    (c.sections || []).forEach(s => { for (let n = s.from; n <= s.to; n++) cov[n]++; });
    if ((c.sections || []).length && cov.slice(1).some(v => v !== 1)) w('טווחי הסוגים לא מכסים בדיוק את כל השאלות');
  });
  out.push(e);
}
out.sort((a, b) => order(b.id) - order(a.id));
if (errs.length) { console.error('שגיאות:\n' + errs.join('\n')); process.exit(1); }
out.forEach(e => console.log(`${e.id}: ${e.chapters.map(c => `${c.domain[0]}${c.questions}@${c.page}`).join(' ')}`));
fs.writeFileSync(path.join(__dirname, 'chapters.js'), '// נוצר אוטומטית מ-content/exams ע"י build.js. לא לערוך כאן.\nwindow.EXAMS = ' + JSON.stringify(out) + ';\n');
console.log(`\nchapters.js: ${out.length} בחינות, ${out.reduce((n, e) => n + e.chapters.length, 0)} פרקים`);
