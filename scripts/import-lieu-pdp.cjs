// One-off import: parses the Bowler sheets of the original Lieu PDP workbook
// and POSTs the KPIs to the running dev server (/api/policy/bulk-multi, merge by code).
const XLSX = require('xlsx');

const FILE = 'C:/Users/LEAN15/Desktop/Lieu PDP_2026_SA1_WS.xlsx';
const SERVER = 'http://localhost:3000';

const SHEETS = [
  { sheet: 'Top Level Bowler', level: 'L1' },
  { sheet: 'Second Level Bowler', level: 'L2' },
  { sheet: 'Third Level Bowler', level: 'L3' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const VALID_DEPTS = ['Lean', 'Delivery', 'Responsible Leadership', 'Development', 'Quality', 'Production', 'Biz', 'IT', 'CSR', 'HR', 'Planning'];

const wb = XLSX.readFile(FILE);
const payload = {};

for (const { sheet, level } of SHEETS) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: '' });
  const kpis = [];
  let activeDepartment = 'Production';

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const planLabel = String(row[7] || '').trim();
    if (!/^target$/i.test(planLabel)) continue;

    const actualRow = rows[r + 1];
    const code = String(row[3] || '').trim();
    const name = String(row[2] || '').replace(/\s+/g, ' ').trim();
    if (!name && !code) continue;

    const rawDept = String(row[1] || '').trim().toLowerCase();
    // Bowler leaves Dept. blank when it continues from the previous group;
    // do not mistake that for Production.
    if (rawDept) {
      activeDepartment =
        VALID_DEPTS.find((d) => d.toLowerCase() === rawDept) ||
        VALID_DEPTS.find((d) => rawDept.includes(d.toLowerCase())) ||
        activeDepartment;
    }
    const department = activeDepartment;

    const dirText = String(row[21] || '');
    const targetDirection = /lower|▼/i.test(dirText) ? 'lower' : /bool|y\/n/i.test(dirText) ? 'boolean' : 'higher';

    const monthly = {};
    MONTHS.forEach((m, i) => {
      const t = row[8 + i];
      const a = actualRow ? actualRow[8 + i] : '';
      monthly[m] = {
        target: t === '' || t === null || t === undefined ? null : Number(t),
        actual: a === '' || a === null || a === undefined ? null : Number(a),
      };
    });

    const countermeasure = String(row[29] || '').replace(/\s+/g, ' ').trim();

    kpis.push({
      id: `kpi-import-${level}-${Date.now()}-${r}`,
      code: code || `${level} ${kpis.length + 1}`,
      name: name || `KPI ${code}`,
      nameVi: name,
      nameKo: '',
      level,
      department,
      unit: String(row[4] || '').trim() || '%',
      jumpingOffPoint: String(row[6] || 'Jan. 2026').trim() || 'Jan. 2026',
      targetDirection,
      owner: department,
      monthly,
      problemDescription: '',
      rootCause: '',
      actionPlan: countermeasure,
      actionStatus: countermeasure ? 'In Progress' : 'Open',
    });
  }

  const key = `l${level[1]}Kpis`;
  payload[key] = kpis;
  console.log(`${sheet}: ${kpis.length} KPIs`);
}

(async () => {
  const res = await fetch(`${SERVER}/api/policy/bulk-multi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, clientId: 'excel-import-script' }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Import failed: ${res.status} ${JSON.stringify(body)}`);
  console.log('Import OK. Version:', body.version, '| Last action:', body.lastAction);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
