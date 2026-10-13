import React from 'react';
import { LevelPolicyData, Language, KpiItem, MonthKey } from '../types';
import {
  computeLevelSummary,
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
  Building,
  UserCheck,
  ArrowRight,
  Filter,
  X,
} from 'lucide-react';
import { getTeamColorConfig, getLocalizedPureText } from '../lib/teamUtils';

interface DashboardProps {
  data: LevelPolicyData;
  language: Language;
  onSelectKpi: (kpi: KpiItem) => void;
  selectedTeam?: string;
  onSelectTeam?: (team: string) => void;
}

const MONTHS: MonthKey[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

export const Dashboard: React.FC<DashboardProps> = ({
  data,
  language,
  onSelectKpi,
  selectedTeam = 'ALL',
  onSelectTeam,
}) => {
  const isVi = language === 'vi';
  const { kpis, level, title, titleVi } = data;

  const isTeamFiltered = Boolean(selectedTeam && selectedTeam !== 'ALL');
  const displayedKpis = isTeamFiltered
    ? kpis.filter((k) => matchesTeam(k.department, selectedTeam))
    : kpis;

  const summary = computeLevelSummary(displayedKpis);
  const onTrackPct = summary.total > 0 ? Math.round((summary.onTrack / summary.total) * 100) : 0;
  const warningPct = summary.total > 0 ? Math.round((summary.warning / summary.total) * 100) : 0;
  const offTrackPct = summary.total > 0 ? Math.round((summary.offTrack / summary.total) * 100) : 0;

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
      {/* Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Metrics */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isVi ? 'Tổng Số KPI' : 'Total Metrics'}
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {summary.total} <span className="text-xs text-slate-500 font-normal">KPIs</span>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              {level} Policy Level
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Building className="w-6 h-6 text-slate-700" />
          </div>
        </div>

        {/* Card 2: On Track */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              {isVi ? 'Đạt Chỉ Tiêu' : 'On Track'}
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {summary.onTrack}{' '}
              <span className="text-xs font-semibold text-emerald-600">
                ({onTrackPct}%)
              </span>
            </div>
            <span className="text-xs text-emerald-600/80 mt-1 block">
              {isVi ? 'Hoàn thành đúng tiến độ' : 'Meeting or exceeding target'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

        {/* Card 3: Warning */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
              {isVi ? 'Cần Chú Ý' : 'Warning'}
            </span>
            <div className="text-2xl font-bold text-amber-700 mt-1">
              {summary.warning}{' '}
              <span className="text-xs font-semibold text-amber-600">
                ({warningPct}%)
              </span>
            </div>
            <span className="text-xs text-amber-600/80 mt-1 block">
              {isVi ? 'Chênh lệch nhẹ so với mục tiêu' : 'Minor gap detected'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        {/* Card 4: Off Track */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">
              {isVi ? 'Cảnh Báo Đỏ (Off Track)' : 'Critical Gap'}
            </span>
            <div className="text-2xl font-bold text-red-700 mt-1">
              {summary.offTrack}{' '}
              <span className="text-xs font-semibold text-red-600">
                ({offTrackPct}%)
              </span>
            </div>
            <span className="text-xs text-red-600/80 mt-1 block font-medium">
              {isVi ? 'Cần hành động 8D khẩn cấp' : 'Requires urgent action plan'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-600" />
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
