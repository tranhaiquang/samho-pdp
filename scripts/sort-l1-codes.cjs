// Reorder L1 kpis / priorities / objectives by numeric code segments
// (e.g. L1 1.1.1 -> L1 1.1.2 -> L1 1.2.1 -> L1 1.4.1.1). One-off via /api/policy/restore-backup.
const SERVER = 'http://localhost:3000';

const segments = (code) => String(code || '').match(/\d+/g)?.map(Number) || [99];
const byCode = (a, b) => {
  const A = segments(a.code), B = segments(b.code);
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const d = (A[i] ?? -1) - (B[i] ?? -1);
    if (d) return d;
  }
  return 0;
};

(async () => {
  const res = await fetch(`${SERVER}/api/policy`);
  const state = await res.json();
  const l1 = JSON.parse(JSON.stringify(state.l1Data));

  l1.threeYearObjectives.sort(byCode);
  l1.annualObjectives.sort(byCode);
  l1.priorities.sort(byCode);
  l1.kpis.sort(byCode);

  const post = await fetch(`${SERVER}/api/policy/restore-backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ l1Data: l1, l2Data: state.l2Data, l3Data: state.l3Data, clientId: 'sort-script' }),
  });
  const body = await post.json();
  if (!post.ok) throw new Error('Failed: ' + post.status);
  console.log('Sorted L1:', l1.kpis.map((k) => k.code).join(' -> '));
  console.log('version:', body.version);
})().catch((e) => { console.error(e); process.exit(1); });
