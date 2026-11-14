// One-off: merge the CSR workbook's Second/Third Level sheets into the static
// seed. Existing (Lean 1.1) content is preserved; the CSR file adds the other
// families and refreshes the Lean KPIs it carries (matched by code).
// Run: node scripts/import-csr-l2-l3.cjs
const fs = require('fs');
const XLSX = require('xlsx');

const FILE = 'C:/Users/LEAN15/Downloads/Copy of SA1 PDP 2026- CSR.xlsx';
const SEED = 'public/seed-policy-data.json';
const STORE = 'data_store/policy_data.json';
const SAMHO = 'src/data/samhoData.ts';

const wb = XLSX.readFile(FILE);
const state = JSON.parse(fs.readFileSync(SEED, 'utf8'));
fs.writeFileSync('data_store/backup-pre-csr-import.json', JSON.stringify(state, null, 2));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const VALID_DEPTS = ['Lean', 'Delivery', 'Responsible Leadership', 'Development', 'Quality', 'Production', 'Biz', 'IT', 'CSR', 'HR', 'Planning'];
// Delivery is the same team as Biz; Responsible Leadership is the same team as CSR.
const canonicalTeam = (d) => d === 'Delivery' ? 'Biz' : d === 'Responsible Leadership' ? 'CSR' : d;
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const slug = (s) => clean(s).toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '');
const normCode = (c) => clean(c).toLowerCase();

// ---------- Bowler sheets -> KPIs ----------
const parseBowler = (sheetName, level) => {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
  const kpis = [];
  let dept = 'Production';
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!/^target$/i.test(clean(row[6]))) continue;
    const actualRow = rows[r + 1] && /^actual$/i.test(clean(rows[r + 1][6])) ? rows[r + 1] : null;
    const code = clean(row[2]);
    const name = clean(row[1]);
    if (!name && !code) continue;
    const rawDept = clean(row[0]).toLowerCase();
    if (rawDept) {
      dept = VALID_DEPTS.find((d) => d.toLowerCase() === rawDept)
        || VALID_DEPTS.find((d) => rawDept.includes(d.toLowerCase()))
        || dept;
    }
    const department = canonicalTeam(dept);
    const unit = clean(row[3]) || 'Points';
    const monthly = {};
    MONTHS.forEach((m, i) => {
      const t = row[7 + i];
      const a = actualRow ? actualRow[7 + i] : '';
      const num = (v) => (v === '' || v == null ? null : (isNaN(Number(v)) ? String(v).trim() : Number(v)));
      monthly[m] = { target: num(t), actual: num(a) };
    });
    kpis.push({
      id: `kpi-csr-${level.toLowerCase()}-${slug(code.replace(/^l[23]\s*/i, ''))}`,
      code,
      name,
      nameVi: name,
      nameKo: '',
      level,
      department,
      unit,
      jumpingOffPoint: clean(row[5]) || 'Jan. 2026',
      targetDirection: /^(y\/n|yes\/no)$/i.test(unit) ? 'boolean' : 'higher',
      owner: department,
      monthly,
      problemDescription: '',
      rootCause: '',
      actionPlan: '',
      actionStatus: 'Open',
    });
  }
  return kpis;
};

// Tolerate the workbook's inconsistent codes: exact match always; strip
// trailing dot-segments only if the two names actually line up (>=2 shared
// content tokens). Otherwise the CSR file lists a DIFFERENT KPI under a
// colliding code and we must create a new item, not overwrite a Lean one.
const contentTokens = (s) =>
  new Set(normCode(s).toLowerCase().split(/[^a-z0-9À-ỹ]+/).filter((t) => t.length >= 4 && !/^\d+$/.test(t)));
const sharesTokens = (a, b) => {
  const ta = contentTokens(a), tb = contentTokens(b);
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared >= 2;
};
const findExistingKpi = (existing, code, name) => {
  const lc = normCode(code);
  const exact = existing.find((k) => normCode(k.code) === lc);
  if (exact) return exact;
  let cur = lc;
  while (cur.includes('.')) {
    cur = cur.slice(0, cur.lastIndexOf('.')).trim();
    const hit = existing.find((k) => normCode(k.code) === cur);
    if (hit && sharesTokens(hit.name, name)) return hit;
    if (hit) console.log(`  note: code ${code} looks like ${hit.code} but names differ - creating new KPI instead of overwriting "${hit.name.slice(0, 40)}"`);
  }
  return null;
};

const mergeKpis = (level, sheetName, cur) => {
  const incoming = parseBowler(sheetName, level);
  const merged = cur.kpis.map((k) => ({ ...k, monthly: { ...k.monthly } }));
  const created = [], updated = [];
  for (const inc of incoming) {
    const hit = findExistingKpi(merged, inc.code, inc.name);
    if (hit) {
      for (const m of MONTHS) {
        const t = inc.monthly[m].target, a = inc.monthly[m].actual;
        if (t !== null) hit.monthly[m] = { ...hit.monthly[m], target: t };
        if (a !== null) hit.monthly[m] = { ...hit.monthly[m], actual: a };
      }
      hit.unit = inc.unit;
      hit.jumpingOffPoint = inc.jumpingOffPoint;
      updated.push(inc.code);
    } else {
      merged.push(inc);
      created.push(inc.code);
    }
  }
  console.log(`[${level}] Bowler: ${incoming.length} file KPIs -> ${created.length} new, ${updated.length} matched existing`);
  console.log('  new:', created.join(', ') || '(none)');
  console.log('  matched existing (kept, monthly refreshed):', updated.join(', ') || '(none)');
  return merged;
};

const EMPTY_ROLES = { biz: 'none', quality: 'none', csr: 'none', lean: 'none', dev: 'none', prod: 'none', plan: 'none', it: 'none' };
const familyDept = { 1: 'Lean', 2: 'Biz', 3: 'Quality', 4: 'CSR', 5: 'Development' };

// ---------- Matrix sheets ----------
const parseMatrix = (level, sheetName, cfg, cur, mergedKpis) => {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  const mark = (r, col) => {
    const v = clean(rows[r]?.[col] ?? '').toLowerCase();
    return v === 'l' ? 'primary' : v === 'm' ? 'secondary' : null;
  };
  const cell = (r, col) => clean(rows[r]?.[col] ?? '');
  const kpiAt = (col) => {
    const code = cfg.eastOverride[col];
    return code ? mergedKpis.find((k) => normCode(k.code) === normCode(code)) || null : null;
  };

  const priorities = cur.priorities.map((p) => ({
    ...p,
    linkedObjectiveIds: [...(p.linkedObjectiveIds || [])],
    linkedPriorityIds: [...(p.linkedPriorityIds || [])],
    resourceRoles: { ...EMPTY_ROLES, ...p.resourceRoles },
  }));
  const byCode = new Map(priorities.map((p) => [normCode(p.code), p]));
  let seq = 0;
  const newId = () => `p-${level.toLowerCase()}csr-${++seq}`;
  const kpiLinks = new Map(); // kpiId -> Set(priorityId)

  for (let r = cfg.prioFirstRow; r <= cfg.prioLastRow; r++) {
    const code = cell(r, cfg.codeCol);
    const title = cell(r, cfg.titleCol);
    if (!code || !title) continue;
    const roles = { ...EMPTY_ROLES };
    for (const [col, key] of Object.entries(cfg.resCols)) {
      const m = mark(r, Number(col));
      if (m) roles[key] = m;
    }
    const linkedObjectiveIds = [...new Set(cfg.westCols.map((c) => (mark(r, c) === 'primary' ? cfg.westMap[c] : null)).filter(Boolean))];
    const kpiIds = [...new Set(cfg.eastCols.map((c) => (mark(r, c) ? kpiAt(c) : null)).filter(Boolean).map((k) => k.id))];
    const hit = byCode.get(normCode(code));
    let pid;
    if (hit) { // merge into the existing (Lean) priority; seed wins for title/owner
      pid = hit.id;
      hit.linkedObjectiveIds = [...new Set([...hit.linkedObjectiveIds, ...linkedObjectiveIds])];
      hit.linkedPriorityIds = [...new Set([...hit.linkedPriorityIds, ...kpiIds])];
      for (const [k, v] of Object.entries(roles)) if (hit.resourceRoles[k] === 'none' && v !== 'none') hit.resourceRoles[k] = v;
      console.log(`  [${level}] merged file priority ${code} into existing ${hit.id}`);
    } else {
      pid = newId();
      priorities.push({
        id: pid,
        code,
        title,
        titleVi: title,
        titleKo: '',
        owner: '',
        department: familyDept[Number(String(code).match(/^L[23][^0-9]*(\d)/i)?.[1])] || 'Production',
        linkedObjectiveIds,
        linkedPriorityIds: kpiIds,
        resourceRoles: roles,
      });
      byCode.set(normCode(code), priorities[priorities.length - 1]);
    }
    for (const kid of kpiIds) {
      if (!kpiLinks.has(kid)) kpiLinks.set(kid, new Set());
      kpiLinks.get(kid).add(pid);
    }
  }

  const threeYearObjectives = [];
  for (let r = cfg.southFirstRow; r <= cfg.southLastRow; r++) {
    const code = cell(r, cfg.codeCol);
    const title = cell(r, cfg.titleCol);
    if (!code && !title) continue;
    threeYearObjectives.push({
      id: `3y-${level.toLowerCase()}csr-${threeYearObjectives.length + 1}`,
      code,
      title,
      titleVi: title,
      titleKo: '',
      period: '2026 - 2028',
      linkedObjectiveIds: [],
      linkedPriorityIds: [],
    });
  }

  // KPI cross-links: KPI -> its priorities + priority's objectives/roles
  for (const [kpiId, pids] of kpiLinks) {
    const k = mergedKpis.find((x) => x.id === kpiId);
    if (!k) continue;
    k.linkedPriorityIds = [...new Set([...(k.linkedPriorityIds || []), ...pids])];
    const p = priorities.find((x) => x.id === [...pids][0]);
    if (p) {
      k.linkedObjectiveIds = [...new Set([...(k.linkedObjectiveIds || []), ...p.linkedObjectiveIds])];
      k.resourceRoles = { ...EMPTY_ROLES, ...(k.resourceRoles || {}), ...p.resourceRoles };
    }
  }

  // Annual objectives added by the file (L3: 4 new CSR/RL parents)
  const newAnnual = (cfg.newAnnualObjectives || []).map((o, i) => {
    const id = `obj-${level.toLowerCase()}csr-${i + 1}`;
    return {
      id,
      ...o,
      linkedObjectiveIds: [],
      linkedPriorityIds: priorities.filter((p) => p.linkedObjectiveIds.includes(id)).map((p) => p.id),
    };
  });
  // Back-fill linkedPriorityIds on the new annual objectives' partner priorities is automatic via linkedObjectiveIds above.

  const nNew = priorities.length - cur.priorities.length;
  console.log(`[${level}] Matrix: ${nNew} new priorities (${priorities.length} total), ${threeYearObjectives.length} new 3Y, ${newAnnual.length} new annual objectives`);
  return { priorities, threeYearObjectives, newAnnual };
};

const applyLevel = (key, bowlerSheet, matrixSheet, cfg) => {
  const level = key === 'l2Data' ? 'L2' : 'L3';
  const cur = state[key];
  const kpis = mergeKpis(level, bowlerSheet, cur);
  const merged = { ...cur, kpis };
  const parsed = parseMatrix(level, matrixSheet, cfg, cur, merged.kpis);
  merged.priorities = parsed.priorities;
  merged.threeYearObjectives = [...cur.threeYearObjectives, ...parsed.threeYearObjectives];
  merged.annualObjectives = [...cur.annualObjectives, ...parsed.newAnnual];
  return merged;
};

const L2 = {
  codeCol: 15, titleCol: 16,
  prioFirstRow: 4, prioLastRow: 24,
  southFirstRow: 27, southLastRow: 31,
  westCols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  westMap: {
    1: 'obj-l1-dev', 2: 'obj-l1-dev', 3: 'obj-l1-dev',
    4: 'obj-l1-csr', 5: 'obj-l1-csr', 6: 'obj-l1-csr', 7: 'obj-l1-csr',
    8: 'obj-l1-qual', 9: 'obj-l1-qual',
    10: 'obj-l1-del', 11: 'obj-l1-del', 12: 'obj-l1-del',
    13: 'obj-l1-lean', 14: 'obj-l1-lean',
  },
  eastCols: [17, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44],
  eastOverride: {
    17: 'L2 1.1.1',
    23: 'L2 1.1.1.1', 24: 'L2 1.1.2.1', 25: 'L2 1.1.3.1',
    26: 'L2 3.1.1.1', 27: 'L2 3.1.1.2', 28: 'L2 3.1.1.3',
    29: 'L2 4.1.1.1', 30: 'L2 4.1.1.2', 31: 'L2 4.1.1.2',
    32: 'L2 4.1.1.3', 33: 'L2 4.1.1.4',
    34: 'L2 4.2.1.1', 35: 'L2 4.2.1.2',
    36: 'L2 4.3.1.1', 37: 'L2 4.3.1.2', 38: 'L2 4.3.1.4',
    39: 'L2 5.1.1.1', 40: 'L2 5.2.1.1', 41: 'L2 5.3.1.1',
    42: 'L2 5.4.1.1', 43: 'L2 5.5.1.1', 44: 'L2 5.6.1.1',
  },
  resCols: { 45: 'biz', 46: 'quality', 47: 'csr', 48: 'lean', 49: 'dev', 50: 'prod' },
};

const L3 = {
  codeCol: 11, titleCol: 12,
  prioFirstRow: 8, prioLastRow: 23,
  southFirstRow: 26, southLastRow: 30,
  westCols: [5, 6, 7, 8, 9, 10],
  westMap: {
    5: 'obj-l3csr-1', 6: 'obj-l3csr-2', 7: 'obj-l3csr-3', 8: 'obj-l3csr-4',
    9: 'p-l1-3', 10: 'p-l1-1',
  },
  eastCols: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37],
  eastOverride: {
    13: 'L3 1.1.1.1.1', 14: 'L3 1.2.1.1.1', 15: 'L3 1.2.1.1.2', 16: 'L3 1.2.1.2.1',
    17: 'L3 1.2.1.2.2', 18: 'L3 1.2.1.3.1', 19: 'L3 1.2.1.3.2', 20: 'L3 1.2.1.4.1',
    21: 'L3 1.2.1.4.2', 22: 'L3 1.2.1.4.3', 23: 'L3 1.2.1.4.4', 24: 'L3 1.2.1.5.1',
    25: 'L3 4.1.1.1.1', 26: 'L3 4.1.1.2.1', 27: 'L3 4.1.1.2.2',
    28: 'L3 4.1.1.3.1', 29: 'L3 4.1.1.4.1', 30: 'L3 4.1.1.5.1',
    31: 'L3 4.1.1.6.1', 32: 'L3 4.1.1.7.1', 33: 'L3 4.1.1.9.1',
    34: 'L3 4.1.1.7.2', 35: 'L3 4.1.1.8.1', 36: 'L3 4.1.1.8.2',
    37: 'L3 4.1.1.10.1',
  },
  resCols: { 38: 'biz', 39: 'quality', 40: 'csr', 41: 'lean', 42: 'dev' },
  newAnnualObjectives: [
    { code: 'L2 4.4.1', title: 'Fair Compensation - 1 point', period: '2026' },
    { code: 'L2 4.3.1', title: 'Respecting Human Rights - 4/4 Points', period: '2026' },
    { code: 'L2 4.2.1', title: 'Protecting the Environment - 6/6 Points', period: '2026' },
    { code: 'L2 4.1.1', title: 'Responsible ownership - 4/4 Points', period: '2026' },
  ],
};

state.l2Data = applyLevel('l2Data', 'Second Level Bowler', 'Second Level matrix', L2);
state.l3Data = applyLevel('l3Data', 'Third Level Bowler', 'Third Level matrix', L3);

// Self-checks
const assert = (cond, msg) => { if (!cond) throw new Error('Self-check failed: ' + msg); };
for (const [key, lvl] of [['l2Data', 'L2'], ['l3Data', 'L3']]) {
  const d = state[key];
  const ids = new Set(d.priorities.map((p) => p.id));
  assert(ids.size === d.priorities.length, `${lvl} duplicate priority ids`);
  const pCodes = new Set(d.priorities.map((p) => normCode(p.code)));
  assert(pCodes.size === d.priorities.length, `${lvl} duplicate priority codes`);
  const parentIds = new Set([...state.l1Data.priorities, ...state.l2Data.priorities, ...state.l2Data.annualObjectives, ...state.l3Data.annualObjectives].map((p) => p.id));
  for (const p of d.priorities) {
    for (const oid of p.linkedObjectiveIds) assert(d.annualObjectives.some((o) => o.id === oid), `${lvl} priority ${p.code} links unknown objective ${oid}`);
    for (const kid of p.linkedPriorityIds) assert(d.kpis.some((k) => k.id === kid) || parentIds.has(kid), `${lvl} priority ${p.code} links unknown KPI/parent ${kid}`);
  }
  console.log(`${lvl}: ${d.kpis.length} KPIs, ${d.priorities.length} priorities, ${d.annualObjectives.length} annual objectives, ${d.threeYearObjectives.length} 3Y objectives`);
}

// changed counts vs orig
const origL2 = JSON.parse(fs.readFileSync('data_store/backup-pre-csr-import.json', 'utf8')).l2Data;
const origL3 = JSON.parse(fs.readFileSync('data_store/backup-pre-csr-import.json', 'utf8')).l3Data;
for (const [lvl, a, b] of [['L2', origL2, state.l2Data], ['L3', origL3, state.l3Data]]) {
  console.log(`${lvl}: KPIs ${a.kpis.length} -> ${b.kpis.length}, priorities ${a.priorities.length} -> ${b.priorities.length}, annual ${a.annualObjectives.length} -> ${b.annualObjectives.length}, 3Y ${a.threeYearObjectives.length} -> ${b.threeYearObjectives.length}`);
}

fs.writeFileSync(SEED, JSON.stringify(state, null, 2));
if (fs.existsSync(STORE)) {
  const store = JSON.parse(fs.readFileSync(STORE, 'utf8'));
  store.l2Data = state.l2Data;
  store.l3Data = state.l3Data;
  fs.writeFileSync(STORE, JSON.stringify(store, null, 2));
  console.log('data_store/policy_data.json synced (L2/L3)');
}

// samhoData.ts: splice regenerated L2/L3 blocks; L1 stays byte-identical
const src = fs.readFileSync(SAMHO, 'utf8');
const m1 = src.indexOf('export const INITIAL_LEVEL_2_DATA');
const m2 = src.indexOf('export const INITIAL_LEVEL_3_DATA');
const l1Block = src.slice(0, m1);
const out =
  l1Block +
  'export const INITIAL_LEVEL_2_DATA: LevelPolicyData = ' + JSON.stringify(state.l2Data, null, 2) + ';\n\n' +
  'export const INITIAL_LEVEL_3_DATA: LevelPolicyData = ' + JSON.stringify(state.l3Data, null, 2) + ';\n';
fs.writeFileSync(SAMHO, out);
console.log('src/data/samhoData.ts regenerated (L1 untouched)');
console.log('Seed size:', fs.statSync(SEED).size, 'bytes');
