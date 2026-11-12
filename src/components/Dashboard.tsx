import React from 'react';
import { LevelPolicyData, Language, KpiItem, MonthKey } from '../types';
import {
  getKpiOverallStatus,
  getMonthStatus,
  matchesTeam,
  normalizeTeamName,
} from '../lib/kpiUtils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ChartBoundary,
} from './lazyCharts';
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  UserCheck,
  ArrowRight,
  Filter,
  X,
  MinusCircle,
  ClipboardList,
} from 'lucide-react';
import { getTeamColorConfig, getLocalizedPureText } from '../lib/teamUtils';

interface DashboardProps {
  data: LevelPolicyData;
  language: Language;
  onSelectKpi: (kpi: KpiItem) => void;
  selectedTeam?: string;
  onSelectTeam?: (team: string) => void;
  /** Company-wide KPIs across all 3 levels (matches the Excel Dashboard sheet). */
  allKpis?: KpiItem[];
}

const MONTHS: MonthKey[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

export const Dashboard: React.FC<DashboardProps> = ({
  data,
  language,
  onSelectKpi,
  selectedTeam = 'ALL',
  onSelectTeam,
  allKpis,
}) => {
  const isVi = language === 'vi';
  const { kpis, level, title, titleVi } = data;

  const isTeamFiltered = Boolean(selectedTeam && selectedTeam !== 'ALL');
  const displayedKpis = isTeamFiltered
    ? kpis.filter((k) => matchesTeam(k.department, selectedTeam))
    : kpis;

  // Company-wide headline (all 3 levels) — mirrors the Excel Dashboard sheet headline.
  // Team filter from the toolbar still applies for consistency with the rest of the app.
  const [reportMonth, setReportMonth] = React.useState<MonthKey>('Jun');
  const HEADLINE_MONTHS = ['Dec', 'Nov', 'Oct', 'Sep', 'Aug', 'Jul', 'Jun', 'May', 'Apr', 'Mar', 'Feb', 'Jan'] as MonthKey[];
  const headlineSource: KpiItem[] = allKpis ?? displayedKpis;
  const headlineKpis = isTeamFiltered
    ? headlineSource.filter((k) => matchesTeam(k.department, selectedTeam))
    : headlineSource;

  const monthStatusOf = (k: KpiItem): 'green' | 'yellow' | 'red' | 'gray' => {
    const rec = k.monthly?.[reportMonth];
    if (!rec || rec.actual === null || rec.actual === '') return 'gray';
    return getMonthStatus(rec.target, rec.actual, k.targetDirection);
  };

  const headline = headlineKpis.reduce(
    (acc, k) => {
      acc.total += 1;
      const st = monthStatusOf(k);
      if (st === 'green') acc.onTrack += 1;
      else if (st === 'yellow') acc.atRisk += 1;
      else if (st === 'red') acc.offTrack += 1;
      else acc.noData += 1;
      return acc;
    },
    { total: 0, onTrack: 0, atRisk: 0, offTrack: 0, noData: 0 }
  );
  const headlineWithData = headline.total - headline.noData;
  const onTrackRate = headlineWithData > 0 ? headline.onTrack / headlineWithData : 0;
  const onTrackRateDisplay = `${Math.round(onTrackRate * 1000) / 10}%`;
  const MONTH_LABEL: Record<string, string> = {
    Jan: 'Jan', Feb: 'Feb', Mar: 'Mar', Apr: 'Apr', May: 'May', Jun: 'Jun',
    Jul: 'Jul', Aug: 'Aug', Sep: 'Sep', Oct: 'Oct', Nov: 'Nov', Dec: 'Dec',
  };

  // Identify Emergency Off-Track Metrics
  const redFlagKpis = displayedKpis.filter((k) => getKpiOverallStatus(k) === 'red');

  // Compute monthly trend data
  const monthlyTrendData = MONTHS.map((m) => {
    let green = 0;
    let yellow = 0;
    let red = 0;
    let totalRecorded = 0;

    displayedKpis.forEach((k) => {
      const rec = k.monthly[m];
      if (rec && rec.actual !== null && rec.actual !== '') {
        totalRecorded++;
        const st = getMonthStatus(rec.target, rec.actual, k.targetDirection);
        if (st === 'green') green++;
        else if (st === 'yellow') yellow++;
        else if (st === 'red') red++;
      }
    });

    const onTrackRate = totalRecorded > 0 ? Math.round((green / totalRecorded) * 100) : 0;

    return {
      month: m,
      OnTrack: green,
      Warning: yellow,
      OffTrack: red,
      OnTrackRate: onTrackRate,
    };
  });

  // Department Breakdown (normalized, CSR and Responsible Leadership merged)
  const deptMap: Record<string, { total: number; green: number; yellow: number; red: number }> = {};
  displayedKpis.forEach((k) => {
    const dept = normalizeTeamName(k.department);
    if (!deptMap[dept]) {
      deptMap[dept] = { total: 0, green: 0, yellow: 0, red: 0 };
    }
    deptMap[dept].total++;
    const st = getKpiOverallStatus(k);
    if (st === 'green') deptMap[dept].green++;
    else if (st === 'yellow') deptMap[dept].yellow++;
    else if (st === 'red') deptMap[dept].red++;
  });

  const deptChartData = Object.keys(deptMap).map((dept) => ({
    department: dept,
    'Đạt (On Track)': deptMap[dept].green,
    'Cảnh Báo (Warning)': deptMap[dept].yellow,
    'Vượt Ngưỡng Lỗi (Off Track)': deptMap[dept].red,
  }));

  return (
    <div className="space-y-6">
      {/* When no KPIs match selected team */}
      {displayedKpis.length === 0 && (
        <div className="bg-white rounded-xl p-8 border border-dashed border-slate-300 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <div className="text-slate-800 font-bold text-base">
            {isVi
              ? `Không tìm thấy chỉ số KPI nào cho team "${selectedTeam}" tại cấp này.`
              : `No KPIs found for team "${selectedTeam}" at this level.`}
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isVi
              ? 'Vui lòng chọn team khác trên thanh công cụ hoặc nhấn nút bên dưới để xem dữ liệu toàn công ty.'
              : 'Please select another team on the toolbar or click below to view all company data.'}
          </p>
          {onSelectTeam && (
            <button
              type="button"
              onClick={() => onSelectTeam('ALL')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              {isVi ? 'Xem tất cả các team' : 'View All Teams'}
            </button>
          )}
        </div>
      )}
      {/* Executive KPI Summary Cards — mirrors the Excel Dashboard sheet headline (all 3 levels, 5% tolerance) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2 px-1">
          <span className="text-[11px] uppercase font-bold tracking-widest text-slate-500">
            {isVi ? 'Bức tranh tổng thể (L1+L2+L3)' : 'Company-wide headline (L1+L2+L3)'}
          </span>
          <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-full pl-3 pr-1 py-1 shadow-2xs">
            <span>{isVi ? 'Tháng báo cáo' : 'Reporting month'}</span>
            <span className="relative inline-flex items-center">
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value as MonthKey)}
                className="appearance-none bg-[#FFFACD] hover:bg-[#FFF4B3] text-slate-900 text-[11px] font-bold border border-amber-300 rounded-full pl-3 pr-7 py-1 outline-none cursor-pointer"
                aria-label={isVi ? 'Tháng báo cáo' : 'Reporting month'}
                title={isVi ? 'Chọn tháng (khớp sheet Dashboard)' : 'Reporting month (matches the Excel Dashboard sheet)'}
              >
                {HEADLINE_MONTHS.map((m) => (
                  <option key={m} value={m}>{MONTH_LABEL[m] ?? m}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 text-[8px] text-slate-700">▼</span>
            </span>
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Card 1: KPIs Tracked */}
          <div className="bg-[#1F3864] rounded-xl p-4 border border-[#162a4e] shadow-sm flex flex-col justify-between text-white min-h-[132px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider leading-tight">
                {isVi ? 'KPIs Theo Dõi' : 'KPIs Tracked'}
              </span>
              <ClipboardList className="w-4 h-4 text-blue-300" />
            </div>
            <div className="text-3xl font-black tracking-tight mt-1">{headline.total}</div>
            <span className="text-[10px] text-blue-200/80 font-medium mt-1 leading-tight">
              {isVi ? 'L1+L2+L3 · cả 3 cấp' : 'L1+L2+L3 · all levels'}
            </span>
          </div>

          {/* Card 2: On Track */}
          <div className="bg-[#C6EFCE] rounded-xl p-4 border border-[#7fbf93] shadow-sm flex flex-col justify-between min-h-[132px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider leading-tight">
                {isVi ? 'Đạt Chỉ Tiêu' : 'On Track'}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-3xl font-black tracking-tight text-emerald-950 mt-1">{headline.onTrack}</div>
            <span className="text-[10px] text-emerald-800/90 font-semibold mt-1 leading-tight">
              {headline.total > 0 ? `${Math.round((headline.onTrack / headline.total) * 100)}% of tracked` : '—'}
            </span>
          </div>

          {/* Card 3: At Risk */}
          <div className="bg-[#FFEB9C] rounded-xl p-4 border border-[#e8c85a] shadow-sm flex flex-col justify-between min-h-[132px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider leading-tight">
                {isVi ? 'Cận Ngưỡng' : 'At Risk'}
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-3xl font-black tracking-tight text-amber-950 mt-1">{headline.atRisk}</div>
            <span className="text-[10px] text-amber-800/90 font-semibold mt-1 leading-tight">
              {headline.total > 0 ? `${Math.round((headline.atRisk / headline.total) * 100)}% · within 5% band` : '—'}
            </span>
          </div>

          {/* Card 4: Off Track */}
          <div className="bg-[#FFC7CE] rounded-xl p-4 border border-[#e79aa5] shadow-sm flex flex-col justify-between min-h-[132px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-red-900 uppercase tracking-wider leading-tight">
                {isVi ? 'Lệch / Không Đạt' : 'Off Track'}
              </span>
              <XCircle className="w-4 h-4 text-red-700" />
            </div>
            <div className="text-3xl font-black tracking-tight text-red-950 mt-1">{headline.offTrack}</div>
            <span className="text-[10px] text-red-800/90 font-semibold mt-1 leading-tight">
              {headline.total > 0 ? `${Math.round((headline.offTrack / headline.total) * 100)}% · beyond 5% gap` : '—'}
            </span>
          </div>

          {/* Card 5: No Data */}
          <div className="bg-[#EDEDED] rounded-xl p-4 border border-[#c9c9c9] shadow-sm flex flex-col justify-between min-h-[132px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider leading-tight">
                {isVi ? 'Chưa Có Dữ Liệu' : 'No Data'}
              </span>
              <MinusCircle className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-3xl font-black tracking-tight text-slate-800 mt-1">{headline.noData}</div>
            <span className="text-[10px] text-slate-600/90 font-semibold mt-1 leading-tight">
              {headline.total > 0 ? `${Math.round((headline.noData / headline.total) * 100)}% · actual missing` : '—'}
            </span>
          </div>

          {/* Card 6: On-track Rate */}
          <div className="bg-[#D9E1F2] rounded-xl p-4 border border-[#b3c4de] shadow-sm flex flex-col justify-between min-h-[132px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider leading-tight">
                {isVi ? 'Tỷ Lệ Đạt (Có DL)' : 'On-Track Rate'}
              </span>
              <TrendingUp className="w-4 h-4 text-blue-800" />
            </div>
            <div className="text-3xl font-black tracking-tight text-blue-950 mt-1">{onTrackRateDisplay}</div>
            <span className="text-[10px] text-blue-900/80 font-semibold mt-1 leading-tight">
              {headlineWithData > 0 ? `${headline.onTrack}/${headlineWithData} with data` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Red Flag Alert Section */}
      {redFlagKpis.length > 0 && (
        <div className="bg-red-50/80 rounded-xl border border-red-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-red-800 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 animate-bounce" />
            <span>
              {isVi
                ? `CẢNH BÁO ĐỎ: CÓ ${redFlagKpis.length} CHỈ SỐ CẦN LẬP KẾ HOẠCH HÀNH ĐỘNG KHẮC PHỤC 8D`
                : `RED ALERT: ${redFlagKpis.length} METRICS REQUIRE 8D CORRECTIVE ACTION PLAN`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {redFlagKpis.map((kpi) => {
              const teamColor = getTeamColorConfig(kpi.department);
              const kpiDisplayName = getLocalizedPureText(kpi.name, kpi.nameVi, language);

              return (
                <div
                  key={kpi.id}
                  onClick={() => onSelectKpi(kpi)}
                  className="bg-white p-3.5 rounded-lg border border-red-200 shadow-xs hover:border-red-400 transition cursor-pointer flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono font-bold text-[11px]">
                        {kpi.code}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${teamColor.badge}`}>
                        {kpi.department}
                      </span>
                    </div>
                    <h4 className={`font-bold text-sm mt-1.5 ${teamColor.text}`}>
                      {kpiDisplayName}
                    </h4>
                    <p className="text-xs text-red-700 mt-1 bg-red-50 p-1.5 rounded border border-red-100 font-medium">
                      {kpi.problemDescription ||
                        (isVi
                          ? 'Chưa đạt chỉ tiêu đề ra'
                          : 'Significant performance gap')}
                    </p>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Owner: <strong>{kpi.owner}</strong>
                    </span>
                  </div>

                  <button className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition self-center whitespace-nowrap">
                    <span>{isVi ? 'Lập Kế Hoạch 8D' : '8D Plan'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Monthly On-Track Rate Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                {isVi
                  ? 'Tỷ Lệ Đạt Chỉ Tiêu Hàng Tháng (%)'
                  : 'Monthly Target On-Track Rate (%)'}
              </h3>
              <p className="text-xs text-slate-500">
                {isVi ? 'Xu hướng từ Tháng 1 đến Tháng 6 năm 2026' : 'Trend Jan - Jun 2026'}
              </p>
            </div>
          </div>

          <ChartBoundary heightClass="h-64" label={isVi ? 'Đang tải biểu đồ...' : 'Loading chart...'}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Tỷ lệ đạt']}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="OnTrackRate"
                  stroke="#059669"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#059669' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartBoundary>
        </div>

        {/* Chart 2: Department Performance Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600" />
              {isVi
                ? 'Phân Bố Tình Trạng KPI Theo Bộ Phận'
                : 'KPI Status Breakdown by Department'}
            </h3>
            <p className="text-xs text-slate-500">
              {isVi
                ? 'So sánh số lượng Đạt, Cảnh báo, và Chưa đạt'
                : 'Count of On Track, Warning, and Off Track metrics'}
            </p>
          </div>

          <ChartBoundary heightClass="h-64" label={isVi ? 'Đang tải biểu đồ...' : 'Loading chart...'}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="department" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Đạt (On Track)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Cảnh Báo (Warning)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Vượt Ngưỡng Lỗi (Off Track)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBoundary>
        </div>
      </div>
    </div>
  );
};
