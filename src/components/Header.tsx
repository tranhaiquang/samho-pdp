import React from 'react';
import { PolicyLevel, ViewMode, Language, SyncStateInfo, KpiItem, ResourcePerson, CompanySettings } from '../types';
import { SamhoLogo } from './SamhoLogo';
import {
  Target,
  Table,
  BarChart3,
  Bot,
  RotateCcw,
  Plus,
  Globe,
  Download,
  Building2,
  Cloud,
  CloudOff,
  RefreshCw,
  FileSpreadsheet,
  Save,
  Upload,
  Settings,
} from 'lucide-react';

interface HeaderProps {
  currentLevel: PolicyLevel;
  onLevelChange: (level: PolicyLevel) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onResetData: () => void;
  onOpenAddKpi: () => void;
  onExportCsv: () => void;
  onExportBackup?: () => void;
  onRestoreBackup?: (file: File) => void;
  onOpenExcelImport?: () => void;
  syncInfo?: SyncStateInfo;
  onManualSync?: () => void;
  selectedTeam?: string;
  onSelectTeam?: (team: string) => void;
  kpis?: KpiItem[];
  resources?: ResourcePerson[];
  companySettings?: CompanySettings;
}

export const Header: React.FC<HeaderProps> = ({
  currentLevel,
  onLevelChange,
  viewMode,
  onViewModeChange,
  language,
  onLanguageChange,
  onResetData,
  onOpenAddKpi,
  onExportCsv,
  onExportBackup,
  onRestoreBackup,
  onOpenExcelImport,
  syncInfo,
  onManualSync,
  selectedTeam = 'ALL',
  onSelectTeam,
  kpis = [],
  resources = [],
  companySettings,
}) => {
  const isVi = language === 'vi';
  const isKo = language === 'ko';

  const displayCompanyName = companySettings?.companyName || 'Vietnam Samho Co. Ltd';
  const displayFiscalYear = companySettings?.fiscalYear || '2026';
  const displayTitle = isVi
    ? companySettings?.systemTitleVi || 'Hệ thống Hoạch định & Triển khai Chính sách (Hoshin Kanri)'
    : isKo
    ? companySettings?.systemTitleKo || '방침관리 전개 시스템 (Hoshin Kanri)'
    : companySettings?.systemTitleEn || 'Policy Deployment System (Hoshin Kanri)';

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      {/* Top Meta Bar */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <SamhoLogo variant="badge" className="w-11 h-11" title={displayCompanyName} />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-800/50">
                  {displayCompanyName}
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  • {displayFiscalYear} Policy Deployment
                </span>
              </div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                {displayTitle}
              </h1>
            </div>
          </div>

          {/* Quick Actions & Config */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Live Multi-User Cloud Sync Badge */}
            {syncInfo && (
              <button
                type="button"
                onClick={onManualSync}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition cursor-pointer ${
                  syncInfo.status === 'saving'
                    ? 'bg-amber-950/70 border-amber-800 text-amber-300'
                    : syncInfo.status === 'offline'
                    ? 'bg-slate-800 border-slate-700 text-slate-400'
                    : 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60'
                }`}
                title={
                  syncInfo.status === 'saving'
                    ? isVi
                      ? 'Đang lưu lên máy chủ tập trung...'
                      : isKo
                      ? '중앙 서버에 저장 중...'
                      : 'Saving changes to central server...'
                    : syncInfo.status === 'offline'
                    ? isVi
                      ? 'Mất kết nối máy chủ - Đang dùng bộ nhớ cục bộ'
                      : isKo
                      ? '서버 오프라인 - 로컬 캐시 사용 중'
                      : 'Server offline - Using local storage cache'
                    : isVi
                    ? `Đã đồng bộ thời gian thực (Phiên bản ${syncInfo.version}) - Nhấn để làm mới ngay`
                    : isKo
                    ? `실시간 동기화 완료 (버전 ${syncInfo.version}) - 클릭하여 즉시 새로고침`
                    : `Real-time synced (v${syncInfo.version}) - Click to refresh now`
                }
              >
                {syncInfo.status === 'saving' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span className="hidden sm:inline">
                      {isVi ? 'Đang lưu...' : isKo ? '저장 중...' : 'Saving...'}
                    </span>
                  </>
                ) : syncInfo.status === 'offline' ? (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">
                      {isVi ? 'Cục bộ' : isKo ? '오프라인' : 'Offline'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline font-semibold">
                      {isVi ? 'Đồng bộ Đám mây' : isKo ? '클라우드 동기화' : 'Live Sync'}
                    </span>
                    <span className="text-[10px] text-emerald-400/80 font-mono hidden md:inline">
                      v{syncInfo.version}
                    </span>
                  </>
                )}
              </button>
            )}

            {/* Trilingual Switcher (VI, EN, KO) */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => onLanguageChange('vi')}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition flex items-center space-x-1 ${
                  language === 'vi'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tiếng Việt (Vietnamese)"
              >
                <span>🇻🇳</span>
                <span>VI</span>
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition flex items-center space-x-1 ${
                  language === 'en'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="English"
              >
                <span>🇺🇸</span>
                <span>EN</span>
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('ko')}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition flex items-center space-x-1 ${
                  language === 'ko'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="한국어 (Korean)"
              >
                <span>🇰🇷</span>
                <span>KO</span>
              </button>
            </div>

            <button
              onClick={onResetData}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition"
              title={
                isVi
                  ? 'Khôi phục dữ liệu gốc Vietnam Samho 2026'
                  : isKo
                  ? '안장삼호 2026 기준 데이터 초기화'
                  : 'Reset to Benchmark Data'
              }
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">
                {isVi ? 'Đặt lại Dữ liệu' : isKo ? '데이터 초기화' : 'Reset Data'}
              </span>
            </button>

            <button
              onClick={onExportCsv}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition"
              title={
                isVi
                  ? 'Xuất toàn bộ chỉ số KPI ra tệp CSV'
                  : isKo
                  ? '전체 KPI 데이터를 CSV로 내보내기'
                  : 'Export all KPIs to CSV'
              }
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">
                {isVi ? 'Xuất CSV' : isKo ? 'CSV 내보내기' : 'Export CSV'}
              </span>
            </button>

            {onExportBackup && (
              <button
                onClick={onExportBackup}
                className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition cursor-pointer"
                title={
                  isVi
                    ? 'Tải tệp sao lưu toàn bộ dữ liệu hệ thống (.json) - An toàn 100%'
                    : isKo
                    ? '전체 시스템 데이터 JSON 백업 다운로드'
                    : 'Download full system JSON backup'
                }
              >
                <Save className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">
                  {isVi ? 'Sao lưu' : isKo ? '백업' : 'Backup'}
                </span>
              </button>
            )}

            {onRestoreBackup && (
              <label
                className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition cursor-pointer"
                title={
                  isVi
                    ? 'Nạp lại dữ liệu từ tệp sao lưu JSON - Không bị mất dữ liệu khi publish'
                    : isKo
                    ? 'JSON 백업 파일에서 복구하기'
                    : 'Restore all data from JSON backup file'
                }
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">
                  {isVi ? 'Khôi phục' : isKo ? '복구' : 'Restore'}
                </span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onRestoreBackup(file);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            )}

            {onOpenExcelImport && (
              <button
                onClick={onOpenExcelImport}
                className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 rounded-md border border-emerald-700/80 transition shadow-xs cursor-pointer"
                title={
                  isVi
                    ? 'Đọc & Nhập dữ liệu chỉ số từ tệp Excel (.xlsx, .xls, .csv) - Tự động dịch AI song ngữ'
                    : isKo
                    ? '엑셀 파일(.xlsx, .xls) 가져오기 - 한국어/베트남어 AI 자동 번역'
                    : 'Import KPI data from Excel file - Trilingual auto-translation'
                }
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold">
                  {isVi ? 'Nhập Excel' : isKo ? '엑셀 가져오기' : 'Import Excel'}
                </span>
              </button>
            )}

            <button
              onClick={onOpenAddKpi}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isVi ? 'Thêm Chỉ số KPI' : isKo ? 'KPI 추가' : 'Add KPI'}</span>
            </button>
          </div>
        </div>

        {/* Level & View Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-800 py-2 gap-2">
          {/* Level Switcher */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-400 px-2 font-medium">
              {isVi ? 'Cấp Độ:' : isKo ? '레벨:' : 'Level:'}
            </span>
            <button
              onClick={() => onLevelChange('L1')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                currentLevel === 'L1'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              L1 (Top Level)
            </button>
            <button
              onClick={() => onLevelChange('L2')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                currentLevel === 'L2'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              L2 (2nd Level)
            </button>
            <button
              onClick={() => onLevelChange('L3')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                currentLevel === 'L3'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              L3 (3rd Level)
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => onViewModeChange('xmatrix')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                viewMode === 'xmatrix'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>{isVi ? 'Sơ đồ X-Matrix' : isKo ? 'X-매트릭스' : 'X-Matrix'}</span>
            </button>

            <button
              onClick={() => onViewModeChange('bowling')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                viewMode === 'bowling'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>{isVi ? 'Bảng Bowling Chart' : isKo ? '볼링 차트' : 'Bowling Chart'}</span>
            </button>

            <button
              onClick={() => onViewModeChange('dashboard')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                viewMode === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{isVi ? 'Tổng quan Dashboard' : isKo ? '대시보드' : 'Dashboard'}</span>
            </button>

            <button
              onClick={() => onViewModeChange('ai')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${
                viewMode === 'ai'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{isVi ? 'Cố vấn AI' : isKo ? 'AI 어드바이저' : 'AI Advisor'}</span>
            </button>

            <button
              onClick={() => onViewModeChange('settings')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${
                viewMode === 'settings'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{isVi ? 'Cài Đặt' : isKo ? '설정' : 'Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
