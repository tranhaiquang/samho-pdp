// Rebuild L1 matrix (X-Matrix) from the workbook's "Top Level Matrix" sheet.
// Reuses the 18 KPIs already imported from the Bowler sheet; replaces objectives,
// priorities, resources and links; drops stale baseline KPIs. Posts via
// /api/policy/restore-backup (L2/L3 kept unchanged from server state).
const fs = require('fs');
const XLSX = require('xlsx');

const FILE = 'C:/Users/LEAN15/Desktop/Lieu PDP_2026_SA1_WS.xlsx';
const SERVER = 'http://localhost:3000';

const wb = XLSX.readFile(FILE);
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Top Level Matrix'], { header: 1, defval: '' });
const c = (r, col) => String(rows[r][col] || '').replace(/\s+/g, ' ').trim();
const mark = (r, col) => {
  const v = String(rows[r][col] || '').trim().toLowerCase();
  return v === 'l' ? 'primary' : v === 'm' ? 'secondary' : null;
};

// Axis definitions
const OBJ_COLS = [1, 2, 3, 4, 5, 6];
const OBJ_IDS = { 1: 'obj-l1-qual', 2: 'obj-l1-dev', 3: 'obj-l1-csr', 4: 'obj-l1-del', 5: 'obj-l1-sa2', 6: 'obj-l1-lean' };
const KPI_COLS = [...Array(18)].map((_, i) => i + 9); // 9..26
const RES_COLS = { 28: 'biz', 29: 'quality', 30: 'csr', 31: 'lean', 32: 'dev', 33: 'prod', 34: 'it' };
const RES_DEPT = { biz: 'Biz', quality: 'Quality', csr: 'CSR', lean: 'Lean', dev: 'Dev', prod: 'Production', it: 'IT' };
const EMPTY_ROLES = { biz: 'none', quality: 'none', csr: 'none', lean: 'none', dev: 'none', prod: 'none', plan: 'none', it: 'none' };

// 3-Year objectives (rows 21-22, top axis)
const threeYearObjectives = [
  {
    id: '3y-l1-1', code: c(21, 7),
    title: `${c(21, 8)} ${c(21, 9)}`.trim(),
    period: '2026 - 2028',
    linkedObjectiveIds: [],
    linkedPriorityIds: [],
  },
  {
    id: '3y-l1-2', code: c(22, 7),
    title: c(22, 8),
    period: '2026 - 2028',
    linkedObjectiveIds: [],
    linkedPriorityIds: [],
  },
];
for (const col of OBJ_COLS) {
  const m = mark(21, col);
  if (m === 'primary') threeYearObjectives[0].linkedObjectiveIds.push(OBJ_IDS[col]);
  if (mark(22, col) === 'primary') threeYearObjectives[1].linkedObjectiveIds.push(OBJ_IDS[col]);
}

// Annual objectives (left axis, cols 1-6)
const annualObjectives = OBJ_COLS.map((col, i) => ({
  id: OBJ_IDS[col],
  code: c(20, col),
  title: c(19, col),
  period: '2026',
  linkedObjectiveIds: threeYearObjectives.filter((t) => t.linkedObjectiveIds.includes(OBJ_IDS[col])).map((t) => t.id),
  linkedPriorityIds: [],
}));

// Priorities (rows 3-18) with links to annual objectives, own KPI codes and resources
const priorities = [];
for (let r = 3; r <= 18; r++) {
  const code = c(r, 7);
  if (!code) continue;
  const roles = { ...EMPTY_ROLES };
  for (const [col, key] of Object.entries(RES_COLS)) {
    const m = mark(r, Number(col));
    if (m) roles[key] = m;
  }
  const linkedObjIds = OBJ_COLS.filter((col) => mark(r, col) === 'primary').map((col) => OBJ_IDS[col]);
  const kpiCodes = KPI_COLS.filter((col) => mark(r, col)).map((col) => c(20, col).toLowerCase());
  priorities.push({
    id: `p-l1m-${priorities.length + 1}`,
    code,
    title: c(r, 8),
    titleVi: c(r, 8),
    titleKo: '',
    owner: '',
    department: '',
    linkedObjectiveIds: linkedObjIds,
    linkedPriorityIds: kpiCodes, // temporary: KPI codes, resolved below
    resourceRoles: roles,
  });
}
// Annual objectives get their priority links too
for (const p of priorities) {
  for (const objId of p.linkedObjectiveIds) {
    const o = annualObjectives.find((a) => a.id === objId);
    if (o) o.linkedPriorityIds.push(p.id);
  }
}

// Resources (right axis, cols 28-34)
const resources = Object.entries(RES_COLS).map(([col, key]) => {
  const fullTitle = c(19, Number(col)); // e.g. "Biz: Ngoc"
  const name = fullTitle.includes(':') ? fullTitle.split(':').slice(1).join(':').trim() : fullTitle;
  return { key, department: RES_DEPT[key], name, fullTitle };
});

// KPIs: keep only the 18 that exist on the matrix bottom axis, rewire links
const kpiCodeSet = new Set(KPI_COLS.map((col) => c(20, col).toLowerCase()));
const kpiByCode = {};
for (const col of KPI_COLS) kpiByCode[c(20, col).toLowerCase()] = col;

(async () => {
  const res = await fetch(`${SERVER}/api/policy`);
  const state = await res.json();
  // Backup current state before replacing anything
  fs.writeFileSync('data_store/backup-pre-matrix-import.json', JSON.stringify(state, null, 2));

  const l1 = JSON.parse(JSON.stringify(state.l1Data));
  const keptKpis = l1.kpis.filter((k) => kpiCodeSet.has(String(k.code).trim().toLowerCase()));
  // Order KPIs by matrix bottom-axis column order
  keptKpis.sort((a, b) => kpiByCode[String(a.code).trim().toLowerCase()] - kpiByCode[String(b.code).trim().toLowerCase()]);

  // Resolve priority.linkedPriorityIds from KPI codes -> priority ids, and set KPI links
  for (const p of priorities) {
    p.linkedPriorityIds = keptKpis.filter((k) => p.linkedPriorityIds.includes(String(k.code).trim().toLowerCase())).map((k) => k.id);
  }
  for (const k of keptKpis) {
    const p = priorities.find((pr) => pr.linkedPriorityIds.includes(k.id));
    k.linkedPriorityIds = p ? [p.id] : [];
    k.linkedObjectiveIds = p ? p.linkedObjectiveIds : [];
    if (p) k.resourceRoles = { ...EMPTY_ROLES, ...p.resourceRoles };
  }

  l1.title = c(1, 1) || '2026 TOP Level Policy Deployment';
  l1.owner = 'SYKIM';
  l1.revDate = c(2, 30) || 'Oct. 2026';
  l1.annualObjectives = annualObjectives;
  l1.threeYearObjectives = threeYearObjectives;
  l1.priorities = priorities;
  l1.resources = resources;
  l1.kpis = keptKpis;

  // Self-check before posting
  const assert = (cond, msg) => { if (!cond) throw new Error('Self-check failed: ' + msg); };
  assert(annualObjectives.length === 6, '6 annual objectives');
  assert(threeYearObjectives.length === 2, '2 three-year objectives');
  assert(priorities.length === 16, '16 priorities');
  assert(resources.length === 7, '7 resources');
  assert(keptKpis.length === 18, '18 KPIs kept, got ' + keptKpis.length);
  for (const k of keptKpis) assert(k.linkedPriorityIds.length === 1, 'KPI ' + k.code + ' has a priority link');
  for (const p of priorities) assert(p.linkedObjectiveIds.length >= 1, 'priority ' + p.code + ' links an objective');

  const post = await fetch(`${SERVER}/api/policy/restore-backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      l1Data: l1,
      l2Data: state.l2Data,
      l3Data: state.l3Data,
      clientId: 'matrix-import-script',
    }),
  });
  const body = await post.json();
  if (!post.ok) throw new Error('Restore failed: ' + post.status + ' ' + JSON.stringify(body));
  console.log('L1 matrix updated. version:', body.version);
  console.log('Last action:', body.lastAction);
  console.log(`Summary: 2 three-year, 6 annual, 16 priorities, 7 resources, ${keptKpis.length} KPIs (dropped ${l1.kpis ? '' : ''}${30 - keptKpis.length} stale)`);
})().catch((e) => { console.error(e); process.exit(1); });
