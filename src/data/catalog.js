// Worksheet catalog helpers. No worksheet titles ship with the app: the list
// lives inside the teacher vault and is passed in after a teacher unlocks it.

// Which practice skills a worksheet supports, matched from its topic name.
// Term Review and Mastering Heuristics sheets are matched by the term they
// follow, so they carry `byTerm` and should be checked against the sheets.
function skillsFor(topic, sub) {
  const wp = /Solving Word Problems/i.test(sub);
  if (/^Four Operations/i.test(topic)) return wp ? ['pw', 'cmp', 'mul'] : [];
  if (/^Addition and Subtraction of Mixed/i.test(topic)) return wp ? ['pw'] : [];
  if (/^Fractions and Mixed Numbers/i.test(topic)) return ['frac'];
  if (/^Multiplication of Whole Numbers, Fractions/i.test(topic)) {
    if (wp) return ['frac', 'rem'];
    return /Product of a Fraction and a Whole Number/i.test(sub) ? ['frac'] : [];
  }
  if (/^Rate$/i.test(topic)) return ['rate'];
  if (/^Percentage$/i.test(topic)) return /Percentage of a Quantity|Solving Word Problems|Part of a Whole/i.test(sub) ? ['pct'] : [];
  const term = { 'Term Review 1': ['pw', 'cmp', 'mul', 'frac'], 'Term Review 2': ['frac', 'rem'], 'Term Review 3': ['rate', 'pct'] };
  if (term[topic]) return term[topic];
  const mh = {
    'Mastering Heuristics 1': ['cmp', 'mul', 'xfer'],
    'Mastering Heuristics 2': ['rem', 'xfer'],
    'Mastering Heuristics 3': ['pct', 'rate', 'xfer'],
    'Mastering Heuristics 4': ['xfer', 'cmp', 'rem'],
  };
  return mh[topic] || [];
}

// rows: [[sn, topic, subtopic, name], ...]
export function buildCatalog(rows = []) {
  return rows.map(([sn, topic, sub, name]) => ({
    sn,
    topic,
    sub: String(sub).replace(/\s*\(USA Version\)\s*$/i, ''),
    name,
    usa: /\(USA\)/i.test(name),
    byTerm: /^(Term Review|Mastering Heuristics)/i.test(topic),
    skills: skillsFor(topic, sub),
  }));
}

// Accepts the worksheet table copied from the portal (S/N, Subject, Level,
// Topic, SubTopic, Worksheet Name, Action) or a 4-column version.
export function parseCatalogText(text) {
  const rows = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const cells = raw.split('\t').map((c) => c.trim());
    if (cells.length < 4 || !/^\d+$/.test(cells[0])) continue;
    if (cells.length >= 6) rows.push([Number(cells[0]), cells[3], cells[4], cells[5]]);
    else rows.push([Number(cells[0]), cells[1], cells[2], cells[3]]);
  }
  return rows;
}

export function worksheetsForSkill(catalog, skillId, { usa = false, limit = 4 } = {}) {
  const rows = (catalog || []).filter((r) => r.skills.includes(skillId) && r.usa === usa);
  rows.sort((a, b) => Number(a.byTerm) - Number(b.byTerm) || a.sn - b.sn);
  return rows.slice(0, limit);
}
