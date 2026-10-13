import React, { useState } from 'react';
import {
  LevelPolicyData,
  Language,
  KpiItem,
  MonthKey,
  Department,
  PolicyLevel,
} from '../types';
import {
  getMonthStatus,
  getKpiOverallStatus,
  StatusColor,
  matchesTeam,
  normalizeTeamName,
} from '../lib/kpiUtils';
import { getTeamColorConfig } from '../lib/teamUtils';
import { EditKpiModal } from './EditKpiModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Edit2,
  Trash2,
  Check,
  X,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';

interface BowlingChartProps {
  data: LevelPolicyData;
  language: Language;
  onUpdateKpiMonthly: (
    kpiId: string,
    month: MonthKey,
    field: 'target' | 'actual',
    value: string | number | null
  ) => void;
  onSelectKpi: (kpi: KpiItem) => void;
  onUpdateKpi?: (updatedKpi: KpiItem) => void;
  onDeleteKpi?: (kpiId: string) => void;
  onUpdateLevelMeta?: (
    level: PolicyLevel,
    meta: { owner?: string; revDate?: string; title?: string }
  ) => void;
  selectedTeam?: string;
  onSelectTeam?: (team: string) => void;
}

const MONTHS: MonthKey[] = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const BowlingChart: React.FC<BowlingChartProps> = ({
  data,
  language,
  onUpdateKpiMonthly,
  onSelectKpi,
  onUpdateKpi,
  onDeleteKpi,
  selectedTeam = 'ALL',
  onSelectTeam,
}) => {
  const isVi = language === 'vi';
  const isKo = language === 'ko';
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Effective active team from global or local filter
  const activeTeam = selectedTeam !== 'ALL' ? selectedTeam : selectedDept;

  // Full KPI editing state
  const [editingKpiItem, setEditingKpiItem] = useState<KpiItem | null>(null);
  const [deletingKpiItem, setDeletingKpiItem] = useState<KpiItem | null>(null);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{
    kpiId: string;
    month: MonthKey;
    field: 'target' | 'actual';
    currentVal: string | number | null;
  } | null>(null);

  const [editInputValue, setEditInputValue] = useState<string>('');

  const { kpis, level, title, titleVi, year } = data;

  // Filter logic
  // Helper to get the responsible party / owner from X-Matrix for a KPI according to the current level
  const getKpiOwnerFromXMatrix = (kpi: KpiItem): string => {
    // 1. If kpi has an owner specified and it's not a generic level title (like 'Team Leader/Staff', 'Department heads', or 'SYKim')
    if (kpi.owner && kpi.owner.trim() !== '') {
      const trimmed = kpi.owner.trim();
      // If it contains a specific person format like "Lean: Quang" or doesn't match generic level owner
      if (trimmed !== data.owner || trimmed.includes(':')) {
        return trimmed;
      }
    }

    // 2. Lookup primary resource in X-Matrix data for this level
    if (kpi.resourceRoles && data.resources && data.resources.length > 0) {
      const primaryRes = data.resources.find(
        (r) => kpi.resourceRoles?.[r.key] === 'primary'
      );
      if (primaryRes) {
        return primaryRes.fullTitle || `${primaryRes.department}: ${primaryRes.name}`;
      }

      // Check secondary if no primary
      const secondaryRes = data.resources.find(
        (r) => kpi.resourceRoles?.[r.key] === 'secondary'
      );
      if (secondaryRes) {
        return secondaryRes.fullTitle || `${secondaryRes.department}: ${secondaryRes.name}`;
      }
    }

    // 3. Lookup resource by department in X-Matrix data for this level
    if (data.resources && data.resources.length > 0) {
      const deptRes = data.resources.find(
        (r) => matchesTeam(r.department, kpi.department) || matchesTeam(r.key, kpi.department)
      );
      if (deptRes) {
        return deptRes.fullTitle || `${deptRes.department}: ${deptRes.name}`;
      }
    }

    // 4. Fallback to kpi.owner if exists, otherwise kpi.department
    return kpi.owner || kpi.department || '';
  };

  const filteredKpis = kpis.filter((kpi) => {
    // Dept/Team filter using matchesTeam for robust normalization
    if (activeTeam !== 'ALL' && !matchesTeam(kpi.department, activeTeam)) return false;

    // Status filter
    const status = getKpiOverallStatus(kpi);
    if (selectedStatus === 'green' && status !== 'green') return false;
    if (selectedStatus === 'yellow' && status !== 'yellow') return false;
    if (selectedStatus === 'red' && status !== 'red') return false;
    if (selectedStatus === 'gray' && status !== 'gray') return false;

    // Search
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const kpiOwner = getKpiOwnerFromXMatrix(kpi);
      const matchCode = kpi.code.toLowerCase().includes(q);
      const matchName = kpi.name.toLowerCase().includes(q);
      const matchNameVi = kpi.nameVi?.toLowerCase().includes(q);
      const matchNameKo = kpi.nameKo?.toLowerCase().includes(q);
      const matchOwner = (kpi.owner?.toLowerCase().includes(q) || kpiOwner.toLowerCase().includes(q));
      if (!matchCode && !matchName && !matchNameVi && !matchNameKo && !matchOwner) return false;
    }

    return true;
  });

  // Unique departments for filter (normalized, CSR and Responsible Leadership merged)
  const departments = Array.from(
    new Set(kpis.map((k) => normalizeTeamName(k.department)).filter(Boolean))
  );

  const handleStartEdit = (
    e: React.MouseEvent,
    kpiId: string,
    month: MonthKey,
    field: 'target' | 'actual',
    val: string | number | null
  ) => {
    e.stopPropagation(); // prevent opening modal
    setEditingCell({ kpiId, month, field, currentVal: val });
    setEditInputValue(val !== null && val !== undefined ? String(val) : '');
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;
    const trimmed = editInputValue.trim();
    let finalVal: string | number | null = trimmed;
    if (trimmed === '') {
      finalVal = null;
    } else if (!isNaN(Number(trimmed)) && !trimmed.includes('%')) {
      finalVal = Number(trimmed);
    }
    onUpdateKpiMonthly(
      editingCell.kpiId,
      editingCell.month,
      editingCell.field,
      finalVal
    );
    setEditingCell(null);
  };

  const renderStatusBadge = (status: StatusColor) => {
    switch (status) {
      case 'green':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{isVi ? 'Đạt' : isKo ? '달성' : 'On Track'}</span>
          </span>
        );
      case 'yellow':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>{isVi ? 'Cảnh báo' : isKo ? '경고' : 'Warning'}</span>
          </span>
        );
      case 'red':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800 border border-red-300 animate-pulse">
            <XCircle className="w-3 h-3 text-red-600" />
            <span>{isVi ? 'Chưa Đạt' : isKo ? '미달' : 'Off Track'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{isVi ? 'Chưa Có' : isKo ? '대기' : 'Pending'}</span>
          </span>
        );
    }
  };

  const getCellBgClass = (
    target: number | string,
    actual: number | string | null,
    direction: any
  ) => {
    if (actual === null || actual === undefined || actual === '') {
      return 'bg-white text-slate-400';
    }
    const st = getMonthStatus(target, actual, direction);
    if (st === 'green') return 'bg-emerald-500 text-white font-bold';
    if (st === 'yellow') return 'bg-amber-400 text-slate-950 font-bold';
    if (st === 'red') return 'bg-red-600 text-white font-bold shadow-inner';
    return 'bg-white text-slate-700';
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              {level} Bowling Chart / KPI Scorecards
            </span>
            <span className="text-xs text-slate-500 font-mono flex items-center gap-1 flex-wrap">
              <span>YEAR: {year}</span>
              <span>|</span>
              <span className="text-slate-700">
                {isVi ? 'Phụ trách cấp (X-Matrix):' : 'Level Owner:'}{' '}
                <strong className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                  {data.owner}
                </strong>
              </span>
              <span>|</span>
              <span>VIETNAM SAMHO CO. LTD</span>
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            {isVi ? `Bảng Theo Dõi KPI (Bowling Chart) ${level}` : `Policy Deployment ${level} Bowling Chart`}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isVi
              ? 'Theo dõi Chỉ tiêu (Target) vs Thực tế (Actual) hàng tháng năm 2026. Nhấp vào bất kỳ ô nào để chỉnh sửa trực tiếp.'
              : 'Monthly KPI tracking chart. Click any target or actual cell to edit values directly.'}
          </p>
        </div>

        {/* Quick Filter Bar */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isVi ? 'Tìm kiếm mã KPI...' : 'Search KPI code...'}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none w-44"
            />
          </div>

          {/* Department / Team Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-300 px-2 py-1.5 rounded-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={activeTeam}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDept(val);
                if (onSelectTeam) onSelectTeam(val);
              }}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-300 px-2 py-1.5 rounded-lg text-xs">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">{isVi ? 'Tất cả Trạng thái' : 'All Status'}</option>
              <option value="green">🟢 {isVi ? 'Đạt' : 'On Track'}</option>
              <option value="yellow">🟡 {isVi ? 'Cảnh báo' : 'Warning'}</option>
              <option value="red">🔴 {isVi ? 'Chưa Đạt' : 'Off Track'}</option>
              <option value="gray">⚪ {isVi ? 'Chưa Nhập' : 'Pending'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Bowling Chart Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[1200px]">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold">
                <th className="p-3 w-36 border-r border-slate-800 text-center">
                  <div>{isVi ? 'Bộ phận' : isKo ? '부서' : 'Dept.'}</div>
                  <div className="text-[10px] text-emerald-400 font-normal mt-0.5 font-mono truncate" title={isVi ? `Bộ phận chịu trách nhiệm theo X-Matrix (${data.level})` : `Responsible Dept. / Owner in X-Matrix (${data.level})`}>
                    {isVi ? 'Phụ trách (X-Matrix)' : isKo ? '담당 (X-Matrix)' : 'Owner (X-Matrix)'}
                  </div>
                </th>
                <th className="p-3 min-w-[220px] border-r border-slate-800">
                  {isVi ? 'Chỉ Số Cần Cải Thiện' : 'TARGET TO IMPROVE'}
                </th>
                <th className="p-3 w-24 border-r border-slate-800">
                  {isVi ? 'Mã Guide' : 'Guide No.'}
                </th>
                <th className="p-3 w-20 border-r border-slate-800 text-center">
                  Unit
                </th>
                <th className="p-3 w-24 border-r border-slate-800 text-center">
                  Jump Off
                </th>
                <th className="p-3 w-16 border-r border-slate-800 text-center">
                  Type
                </th>

                {MONTHS.map((m) => (
                  <th
                    key={m}
                    className="p-2 w-16 text-center border-r border-slate-800 font-mono text-[11px]"
                  >
                    {m}
                  </th>
                ))}
                <th className="p-3 w-24 text-center border-r border-slate-800">
                  {isVi ? 'Đánh Giá' : 'Status'}
                </th>
                <th className="p-3 w-24 text-center">
                  {isVi ? 'Thao Tác' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredKpis.length === 0 ? (
                <tr>
                  <td
                    colSpan={19}
                    className="p-8 text-center text-slate-500 font-medium bg-slate-50"
                  >
                    {isVi
                      ? 'Không tìm thấy chỉ số KPI nào khớp với bộ lọc.'
                      : 'No KPI metrics found matching the current filter.'}
                  </td>
                </tr>
              ) : (
                filteredKpis.map((kpi) => {
                  const overallStatus = getKpiOverallStatus(kpi);
                  const ownerDisplay = getKpiOwnerFromXMatrix(kpi);
                  const teamColor = getTeamColorConfig(kpi.department);

                  return (
                    <React.Fragment key={kpi.id}>
                      {/* ROW 1: Target Row */}
                      <tr
                        onClick={() => onSelectKpi(kpi)}
                        className="bg-slate-50/80 hover:bg-slate-100 transition cursor-pointer border-t-2 border-slate-300"
                      >
                        <td
                          rowSpan={2}
                          className="p-2.5 font-bold text-slate-800 border-r border-slate-200 align-top bg-slate-100/90 text-center"
                        >
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[11px] block text-center mb-1 font-bold ${teamColor.badge}`}
                          >
                            {kpi.department}
                          </span>
                          <span
                            className={`text-[11px] font-bold block text-center px-1.5 py-0.5 rounded border shadow-2xs mt-0.5 font-mono break-words leading-tight ${teamColor.bg} ${teamColor.text} ${teamColor.border}`}
                            title={
                              isVi
                                ? `Bộ phận & Người phụ trách (X-Matrix cấp ${data.level}): ${ownerDisplay}`
                                : `Responsible Owner (X-Matrix ${data.level}): ${ownerDisplay}`
                            }
                          >
                            {ownerDisplay}
                          </span>
                        </td>
                        <td
                          rowSpan={2}
                          className="p-3 font-semibold text-slate-900 border-r border-slate-200 align-top bg-white"
                        >
                          <div className={`text-sm font-bold ${teamColor.text}`}>
                            {isVi && kpi.nameVi
                              ? kpi.nameVi
                              : isKo && kpi.nameKo
                              ? kpi.nameKo
                              : kpi.name}
                          </div>
                        </td>
                        <td
                          rowSpan={2}
                          className="p-3 font-mono font-bold text-red-600 border-r border-slate-200 align-top text-center bg-slate-50/50"
                        >
                          {kpi.code}
                        </td>
                        <td
                          rowSpan={2}
                          className="p-3 text-slate-600 border-r border-slate-200 text-center align-middle font-medium"
                        >
                          {kpi.unit}
                        </td>
                        <td
                          rowSpan={2}
                          className="p-3 text-slate-500 border-r border-slate-200 text-center align-middle font-mono text-[11px]"
                        >
                          {kpi.jumpingOffPoint}
                        </td>

                        {/* TYPE: Target */}
                        <td className="p-2 text-center font-bold text-slate-600 border-r border-slate-200 bg-slate-200/60 font-mono text-[11px]">
                          Target
                        </td>

                        {/* Monthly Target Cells */}
                        {MONTHS.map((m) => {
                          const val = kpi.monthly[m]?.target;
                          return (
                            <td
                              key={m}
                              onClick={(e) =>
                                handleStartEdit(
                                  e,
                                  kpi.id,
                                  m,
                                  'target',
                                  val
                                )
                              }
                              className="p-1.5 text-center font-mono border-r border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer relative group"
                              title="Click to edit target"
                            >
                              <span>
                                {val !== null && val !== undefined
                                  ? String(val)
                                  : '-'}
                              </span>
                              <Edit2 className="w-2.5 h-2.5 text-slate-400 absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-100" />
                            </td>
                          );
                        })}

                        {/* Overall Status */}
                        <td
                          rowSpan={2}
                          className="p-3 text-center align-middle bg-white border-r border-slate-200"
                        >
                          {renderStatusBadge(overallStatus)}
                        </td>

                        {/* Actions */}
                        <td
                          rowSpan={2}
                          className="p-2 text-center align-middle bg-white"
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingKpiItem(kpi);
                              }}
                              className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                              title={isVi ? 'Chỉnh sửa thông tin KPI' : 'Edit KPI metadata'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {onDeleteKpi && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingKpiItem(kpi);
                                }}
                                className="p-1.5 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition cursor-pointer"
                                title={isVi ? 'Xóa chỉ số KPI' : 'Delete KPI'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ROW 2: Actual Row */}
                      <tr
                        onClick={() => onSelectKpi(kpi)}
                        className="hover:bg-slate-50 transition cursor-pointer"
                      >
                        {/* TYPE: Actual */}
                        <td className="p-2 text-center font-bold text-slate-800 border-r border-slate-200 bg-slate-300/50 font-mono text-[11px]">
                          Actual
                        </td>

                        {/* Monthly Actual Cells */}
                        {MONTHS.map((m) => {
                          const tVal = kpi.monthly[m]?.target;
                          const aVal = kpi.monthly[m]?.actual;
                          const bgClass = getCellBgClass(
                            tVal,
                            aVal,
                            kpi.targetDirection
                          );

                          return (
                            <td
                              key={m}
                              onClick={(e) =>
                                handleStartEdit(
                                  e,
                                  kpi.id,
                                  m,
                                  'actual',
                                  aVal
                                )
                              }
                              className={`p-1.5 text-center font-mono border-r border-slate-200 transition cursor-pointer relative group ${bgClass}`}
                              title="Click to edit actual value"
                            >
                              <span>
                                {aVal !== null && aVal !== undefined
                                  ? String(aVal)
                                  : '-'}
                              </span>
                              <Edit2 className="w-2.5 h-2.5 text-slate-300 absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-100" />
                            </td>
                          );
                        })}
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Cell Edit Modal / Popup */}
      {editingCell && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 max-w-sm w-full space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="font-bold text-slate-900 text-sm">
                {isVi ? 'Cập Nhật Giá Trị Monthly' : 'Update Monthly Value'}
              </h4>
              <button
                onClick={() => setEditingCell(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Month: <strong>{editingCell.month}</strong></span>
                <span>Type: <strong className="uppercase">{editingCell.field}</strong></span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isVi ? 'Nhập giá trị mới:' : 'Enter new value:'}
                </label>
                <input
                  type="text"
                  value={editInputValue}
                  onChange={(e) => setEditInputValue(e.target.value)}
                  placeholder="e.g. 1.01 or 21% or 28000 or Y"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {isVi
                    ? 'Nhập số, phần trăm (ví dụ: 85%), hoặc Y/N cho chỉ số Boolean.'
                    : 'Enter numbers, percentages (e.g. 85%), or Y/N for Boolean metrics.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingCell(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                {isVi ? 'Hủy' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center space-x-1 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isVi ? 'Lưu Cập Nhật' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit KPI Metadata Modal */}
      {editingKpiItem && (
        <EditKpiModal
          kpi={editingKpiItem}
          language={language}
          onClose={() => setEditingKpiItem(null)}
          onUpdateKpi={(updated) => {
            if (onUpdateKpi) onUpdateKpi(updated);
            setEditingKpiItem(null);
          }}
          onDeleteKpi={(id) => {
            if (onDeleteKpi) onDeleteKpi(id);
            setEditingKpiItem(null);
          }}
        />
      )}

      {/* Confirm Delete KPI Modal */}
      {deletingKpiItem && (
        <ConfirmDeleteModal
          title={isVi ? 'Xác Nhận Xóa KPI' : 'Confirm Delete KPI'}
          message={
            isVi
              ? `Bạn có chắc chắn muốn xóa vĩnh viễn chỉ số KPI "${deletingKpiItem.code}: ${deletingKpiItem.nameVi || deletingKpiItem.name}" không? Hành động này không thể hoàn tác.`
              : `Are you sure you want to permanently delete KPI "${deletingKpiItem.code}: ${deletingKpiItem.name}"? This action cannot be undone.`
          }
          language={language}
          onConfirm={() => {
            if (onDeleteKpi) {
              onDeleteKpi(deletingKpiItem.id);
            }
            setDeletingKpiItem(null);
          }}
          onCancel={() => setDeletingKpiItem(null)}
        />
      )}
    </div>
  );
};
