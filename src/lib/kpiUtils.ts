import { KpiItem, KpiStatusSummary, MonthKey, MonthlyRecord } from '../types';

export function parseKpiValue(val: number | string | null): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[%,\s]/g, '').trim();
  if (cleaned.toUpperCase() === 'Y') return 1;
  if (cleaned.toUpperCase() === 'N') return 0;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export type StatusColor = 'green' | 'yellow' | 'red' | 'gray';

export function getMonthStatus(
  target: number | string,
  actual: number | string | null,
  direction: 'higher' | 'lower' | 'equal' | 'boolean' = 'higher'
): StatusColor {
  if (actual === null || actual === undefined || actual === '') return 'gray';

  const tNum = parseKpiValue(target);
  const aNum = parseKpiValue(actual);

  if (tNum === null || aNum === null) {
    if (String(target).trim() === String(actual).trim()) return 'green';
    return 'red';
  }

  if (direction === 'boolean') {
    return aNum >= tNum ? 'green' : 'red';
  }

  // Excel Dashboard sheet rules (5% tolerance, cell D31):
  // On track = target met; At risk = missed but within 5% band; Off track = beyond 5%.
  if (direction === 'lower') {
    if (aNum <= tNum) return 'green';
    if (aNum <= tNum * 1.05) return 'yellow';
    return 'red';
  }

  // default 'higher'
  if (tNum === 0) return aNum >= 0 ? 'green' : 'red';
  if (aNum >= tNum) return 'green';
  if (aNum >= tNum * 0.95) return 'yellow';
  return 'red';
}

export function getLatestRecordedMonth(monthly: MonthlyRecord): {
  month: MonthKey;
  target: number | string;
  actual: number | string;
  status: StatusColor;
} | null {
  const months: MonthKey[] = ['Dec', 'Nov', 'Oct', 'Sep', 'Aug', 'Jul', 'Jun', 'May', 'Apr', 'Mar', 'Feb', 'Jan'];
  for (const m of months) {
    if (monthly[m] && monthly[m].actual !== null && monthly[m].actual !== '') {
      return {
        month: m,
        target: monthly[m].target,
        actual: monthly[m].actual,
        status: getMonthStatus(monthly[m].target, monthly[m].actual),
      };
    }
  }
  return null;
}

export function getKpiOverallStatus(kpi: KpiItem): StatusColor {
  const latest = getLatestRecordedMonth(kpi.monthly);
  if (!latest) return 'gray';
  return getMonthStatus(latest.target, latest.actual, kpi.targetDirection);
}

export function normalizeTeamName(dept: string | undefined): string {
  if (!dept) return '';
  const d = dept.trim();
  const lower = d.toLowerCase();
  if (lower === 'dev' || lower === 'development') return 'Dev';
  if (lower === 'biz' || lower === 'business' || lower === 'delivery') return 'Biz';
  if (lower === 'prod' || lower === 'production') return 'Production';
  if (lower === 'qual' || lower === 'quality') return 'Quality';
  // CSR and Responsible Leadership are one and the same
  if (lower === 'csr' || lower.includes('responsible') || lower.includes('leadership')) return 'CSR';
  if (lower === 'it') return 'IT';
  if (lower === 'hr') return 'HR';
  if (lower === 'plan' || lower === 'planning') return 'Planning';
  if (lower === 'lean') return 'Lean';
  if (lower === 'delivery') return 'Delivery';
  return d;
}

export function matchesTeam(deptOrOwner: string | undefined, selectedTeam: string): boolean {
  if (!selectedTeam || selectedTeam.toUpperCase() === 'ALL') return true;
  if (!deptOrOwner) return false;

  const d = deptOrOwner.trim().toLowerCase();
  const t = selectedTeam.trim().toLowerCase();

  // CSR and Responsible Leadership are one and the same
  const isTeamCSR = t === 'csr' || t.includes('responsible') || t.includes('leadership');
  const isDataCSR = d.includes('csr') || d.includes('responsible') || d.includes('leadership');
  if (isTeamCSR && isDataCSR) return true;

  // Biz and Delivery are one and the same
  const isTeamBiz = t === 'biz' || t === 'delivery' || t === 'business';
  const isDataBiz = d === 'biz' || d === 'delivery' || d === 'business';
  if (isTeamBiz && isDataBiz) return true;

  if (d === t) return true;

  // Dev & Development synonyms
  if ((t === 'dev' || t === 'development') && (d === 'dev' || d === 'development')) return true;

  // Substring or prefix check (e.g. "Lean: Quang", "Biz: Ngoc", "Production: WSPark")
  if (d.startsWith(t) || d.includes(t) || t.includes(d)) return true;

  return false;
}

// Display values as % when the KPI's "Target to Improve" name contains '%'.
// Excel stores fractions (0.99 = 99%); strings pass through (may already contain '%').
export function isPercentKpi(kpi: KpiItem): boolean {
  return `${kpi.name || ''}${kpi.nameVi || ''}`.includes('%');
}

export function formatCellDisplay(
  kpi: KpiItem,
  val: string | number | null | undefined
): string {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'string') return val;
  if (!isPercentKpi(kpi)) return String(val);
  return val > 1 ? `${val}%` : `${Number((val * 100).toFixed(2))}%`;
}

export function computeLevelSummary(kpis: KpiItem[]): KpiStatusSummary {
  const summary: KpiStatusSummary = {
    total: kpis.length,
    onTrack: 0,
    warning: 0,
    offTrack: 0,
    unrecorded: 0,
  };

  kpis.forEach((kpi) => {
    const status = getKpiOverallStatus(kpi);
    if (status === 'green') summary.onTrack++;
    else if (status === 'yellow') summary.warning++;
    else if (status === 'red') summary.offTrack++;
    else summary.unrecorded++;
  });

  return summary;
}
