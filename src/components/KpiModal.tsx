import React, { useState } from 'react';
import { KpiItem, Language, MonthKey } from '../types';
import { getKpiOverallStatus } from '../lib/kpiUtils';
import { EditKpiModal } from './EditKpiModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ChartBoundary,
} from './lazyCharts';
import {
  X,
  Bot,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Building2,
  HelpCircle,
  Edit2,
  Trash2,
} from 'lucide-react';

interface KpiModalProps {
  kpi: KpiItem;
  language: Language;
  onClose: () => void;
  onSaveKpiDetails: (
    kpiId: string,
    problemDescription: string,
    rootCause: string,
    actionPlan: string
  ) => void;
  onUpdateKpi?: (updatedKpi: KpiItem) => void;
  onDeleteKpi?: (kpiId: string) => void;
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

export const KpiModal: React.FC<KpiModalProps> = ({
  kpi,
  language,
  onClose,
  onSaveKpiDetails,
  onUpdateKpi,
  onDeleteKpi,
}) => {
  const isVi = language === 'vi';
  const status = getKpiOverallStatus(kpi);

  const [problemDescription, setProblemDescription] = useState(
    kpi.problemDescription || ''
  );
  const [rootCause, setRootCause] = useState(kpi.rootCause || '');
  const [actionPlan, setActionPlan] = useState(kpi.actionPlan || '');

  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Prepare chart data
  const chartData = MONTHS.map((m) => {
    const rec = kpi.monthly[m];
    const parseNum = (val: any) => {
      if (val === null || val === undefined || val === '') return null;
      if (typeof val === 'number') return val;
      const clean = String(val).replace(/[%,\s]/g, '');
      const n = parseFloat(clean);
      return isNaN(n) ? null : n;
    };

    return {
      month: m,
      Target: parseNum(rec?.target),
      Actual: parseNum(rec?.actual),
    };
  });

  const handleRunAiAnalysis = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiAnalysisResult(null);

    try {
      const res = await fetch('/api/analyze-kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpi: {
            ...kpi,
            problemDescription,
            rootCause,
          },
          level: kpi.level,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to call Gemini API');
      }

      setAiAnalysisResult(data.analysis);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Error executing AI analysis');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = () => {
    onSaveKpiDetails(kpi.id, problemDescription, rootCause, actionPlan);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex justify-end p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl h-full sm:h-[95vh] sm:rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="bg-slate-900 text-white p-5 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded bg-red-600 text-white font-mono font-bold text-xs">
                {kpi.code}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {kpi.department} | Owner: {kpi.owner}
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-100 mt-1">
              {isVi && kpi.nameVi ? kpi.nameVi : kpi.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{kpi.name}</p>
          </div>

          <div className="flex items-center space-x-2">
            {onUpdateKpi && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                title={isVi ? 'Chỉnh sửa thông tin KPI' : 'Edit KPI metadata'}
                className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg transition border border-slate-700"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{isVi ? 'Sửa' : 'Edit'}</span>
              </button>
            )}

            {onDeleteKpi && (
              <button
                onClick={() => setShowConfirmDelete(true)}
                title={isVi ? 'Xóa chỉ số KPI này' : 'Delete this KPI'}
                className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-red-950/80 hover:bg-red-900 text-red-300 rounded-lg transition border border-red-800 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isVi ? 'Xóa' : 'Delete'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Status & Metadata Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Unit:</span>
              <strong className="text-slate-800">{kpi.unit}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Direction:</span>
              <strong className="text-slate-800 capitalize">
                {kpi.targetDirection}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Jumping Off:</span>
              <strong className="text-slate-800">{kpi.jumpingOffPoint}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Status:</span>
              {status === 'green' && (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> On Track
                </span>
              )}
              {status === 'yellow' && (
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Warning
                </span>
              )}
              {status === 'red' && (
                <span className="text-red-600 font-bold flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Off Track
                </span>
              )}
              {status === 'gray' && (
                <span className="text-slate-500 font-bold">Pending</span>
              )}
            </div>
          </div>

          {/* Department Responsibility Breakdown */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                {isVi ? 'Phân Công Trách Nhiệm Bộ Phận' : 'Department Responsibility Assignment'}
              </span>
              {onUpdateKpi && (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  {isVi ? 'Thay đổi' : 'Edit roles'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px] font-medium mb-1">
                  {isVi ? '● Trách Nhiệm Chính (Primary):' : '● Primary Responsibility:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(kpi.resourceRoles || {})
                    .filter(([_, role]) => role === 'primary')
                    .map(([key]) => (
                      <span
                        key={key}
                        className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold text-xs uppercase shadow-xs"
                      >
                        {key}
                      </span>
                    ))}
                  {(!kpi.resourceRoles ||
                    !Object.values(kpi.resourceRoles).includes('primary')) && (
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold text-xs shadow-xs">
                      {kpi.department}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px] font-medium mb-1">
                  {isVi ? '○ Trách Nhiệm Phụ (Secondary):' : '○ Secondary Responsibility:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(kpi.resourceRoles || {})
                    .filter(([_, role]) => role === 'secondary')
                    .map(([key]) => (
                      <span
                        key={key}
                        className="px-2 py-0.5 rounded bg-white text-slate-900 border border-slate-700 font-bold text-xs uppercase shadow-xs"
                      >
                        {key}
                      </span>
                    ))}
                  {(!kpi.resourceRoles ||
                    !Object.values(kpi.resourceRoles).includes('secondary')) && (
                    <span className="text-slate-400 italic text-xs">
                      {isVi ? 'Chưa phân công bộ phận phụ' : 'None assigned'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 12-Month Performance Curve */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              {isVi ? 'Biểu Đồ Xu Hướng Target vs Actual' : 'Target vs Actual Trend Curve'}
            </h4>

            <ChartBoundary heightClass="h-56" label={isVi ? 'Đang tải biểu đồ...' : 'Loading chart...'}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line
                    type="monotone"
                    dataKey="Target"
                    stroke="#2563eb"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="Actual"
                    stroke="#dc2626"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartBoundary>
          </div>

          {/* Problem Statement & Root Cause Form (5-Why & 8D) */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                {isVi ? 'Phân Tích Nguyên Nhân & Kế Hoạch Khắc Phục (8D)' : '8D Problem Solving & Action Plan'}
              </h4>

              <button
                onClick={handleRunAiAnalysis}
                disabled={aiLoading}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition shadow-sm disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>{isVi ? 'AI Đang Phân Tích...' : 'Analyzing...'}</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5" />
                    <span>{isVi ? 'AI Lập Kế Hoạch 8D' : 'Generate AI Plan'}</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Result Box if available */}
            {aiAnalysisResult && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-2 text-xs text-purple-950 animate-in fade-in duration-200">
                <div className="flex items-center space-x-2 font-bold text-purple-900 border-b border-purple-200 pb-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>
                    {isVi ? 'Cố Vấn AI Policy Deployment' : 'AI Strategic Action Plan'}
                  </span>
                </div>
                <div className="whitespace-pre-line leading-relaxed text-slate-800">
                  {aiAnalysisResult}
                </div>
                <button
                  onClick={() => {
                    setActionPlan((prev) => `${prev}\n\n[AI Plan]:\n${aiAnalysisResult}`);
                  }}
                  className="mt-2 text-xs font-semibold text-purple-700 underline hover:text-purple-900 block"
                >
                  + {isVi ? 'Chèn Đề Xuất AI vào Kế Hoạch Khắc Phục' : 'Append AI Recommendations to Action Plan'}
                </button>
              </div>
            )}

            {aiError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-xs">
                {aiError}
              </div>
            )}

            {/* Inputs */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isVi ? 'Mô tả Vấn đề / Sai lệch (Problem Description):' : 'Problem Description:'}
                </label>
                <textarea
                  rows={2}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder={
                    isVi
                      ? 'Ví dụ: Tỷ lệ DPPM tháng 5 vượt ngưỡng 20,873 PPM so với chỉ tiêu 11,000 PPM...'
                      : 'e.g. DPPM spike in May exceeding threshold...'
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isVi ? 'Phân tích Nguyên nhân Gốc rễ (5-Why Root Cause):' : '5-Why Root Cause Analysis:'}
                </label>
                <textarea
                  rows={2}
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder={
                    isVi
                      ? 'Ví dụ: Lỗi bong keo công đoạn ép đế do kiểm soát nhiệt độ lò sấy chưa đạt...'
                      : 'e.g. Inconsistent heating oven temp during sole bonding...'
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isVi ? 'Kế hoạch Hành động Khắc phục (8D Action Plan):' : '8D Corrective Action Plan:'}
                </label>
                <textarea
                  rows={3}
                  value={actionPlan}
                  onChange={(e) => setActionPlan(e.target.value)}
                  placeholder={
                    isVi
                      ? 'Ví dụ: Lắp sensor cảnh báo nhiệt độ tự động, kiểm định lại hóa chất keo dán...'
                      : 'e.g. Install auto-temp sensors, audit adhesive chemicals...'
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Vietnam Samho Policy System
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white hover:bg-slate-200 border border-slate-300 rounded-lg"
            >
              {isVi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              <span>{isVi ? 'Lưu Kế Hoạch' : 'Save Details'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit KPI Modal Popup */}
      {isEditModalOpen && (
        <EditKpiModal
          kpi={kpi}
          language={language}
          onClose={() => setIsEditModalOpen(false)}
          onUpdateKpi={(updated) => {
            if (onUpdateKpi) onUpdateKpi(updated);
            setIsEditModalOpen(false);
          }}
          onDeleteKpi={(id) => {
            if (onDeleteKpi) onDeleteKpi(id);
            setIsEditModalOpen(false);
            onClose();
          }}
        />
      )}

      {/* Confirm Delete Modal */}
      {showConfirmDelete && (
        <ConfirmDeleteModal
          title={isVi ? 'Xác Nhận Xóa KPI' : 'Confirm Delete KPI'}
          message={
            isVi
              ? `Bạn có chắc chắn muốn xóa vĩnh viễn chỉ số KPI "${kpi.code}: ${kpi.nameVi || kpi.name}" không? Hành động này không thể hoàn tác.`
              : `Are you sure you want to permanently delete KPI "${kpi.code}: ${kpi.name}"? This action cannot be undone.`
          }
          language={language}
          onConfirm={() => {
            if (onDeleteKpi) {
              onDeleteKpi(kpi.id);
            }
            setShowConfirmDelete(false);
            onClose();
          }}
          onCancel={() => setShowConfirmDelete(false)}
        />
      )}
    </div>
  );
};
