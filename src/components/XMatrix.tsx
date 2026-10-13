import React, { Suspense, lazy, useState } from 'react';
import {
  LevelPolicyData,
  Language,
  KpiItem,
  BreakthroughObjective,
  ImprovementPriority,
  ResourcePerson,
  PolicyLevel,
} from '../types';
import {
  Info,
  UserCheck,
  ShieldCheck,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Sliders,
  Target,
  BarChart3,
  ChevronRight,
  Filter,
  X,
  Link2,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { matchesTeam } from '../lib/kpiUtils';
import { ObjectiveModal } from './ObjectiveModal';
import { PriorityModal } from './PriorityModal';
import { ResourceModal } from './ResourceModal';
import { SamhoLogo } from './SamhoLogo';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { INITIAL_LEVEL_1_DATA, INITIAL_LEVEL_2_DATA } from '../data/samhoData';
import { LayoutGrid, Table } from 'lucide-react';

// The Amplon grid is the single heaviest component in the app (~128 KB of
// source) and is only one of two X-Matrix layouts. Splitting it out keeps it out
// of the entry chunk, and classic-layout users never download it at all.
const AmplonXMatrix = lazy(() =>
  import('./AmplonXMatrix').then((m) => ({ default: m.AmplonXMatrix }))
);
const AddKpiModal = lazy(() =>
  import('./AddKpiModal').then((m) => ({ default: m.AddKpiModal }))
);

interface XMatrixProps {
  data: LevelPolicyData;
  language: Language;
  onSelectKpi: (kpi: KpiItem) => void;
  onUpdateKpi?: (updatedKpi: KpiItem) => void;
  onAddKpi?: (newKpi: KpiItem) => void;
  onAddObjective?: (obj: BreakthroughObjective, isThreeYear?: boolean, targetLevel?: PolicyLevel) => void;
  onUpdateObjective?: (obj: BreakthroughObjective, isThreeYear?: boolean, targetLevel?: PolicyLevel) => void;
  onDeleteObjective?: (id: string, isThreeYear?: boolean, targetLevel?: PolicyLevel) => void;
  onAddPriority?: (priority: ImprovementPriority, targetLevel?: PolicyLevel) => void;
  onUpdatePriority?: (priority: ImprovementPriority, targetLevel?: PolicyLevel) => void;
  onDeletePriority?: (id: string, targetLevel?: PolicyLevel) => void;
  onAddResource?: (resource: ResourcePerson) => void;
  onUpdateResource?: (resource: ResourcePerson) => void;
  onDeleteResource?: (key: string) => void;
  selectedTeam?: string;
  onSelectTeam?: (team: string) => void;
  l1Data?: LevelPolicyData;
  l2Data?: LevelPolicyData;
  l3Data?: LevelPolicyData;
  onNavigateLevel?: (level: PolicyLevel) => void;
  onUpdateCorrelation?: (key: string, value: 'primary' | 'secondary' | 'none') => void;
}

export const XMatrix: React.FC<XMatrixProps> = ({
  data,
  language,
  onSelectKpi,
  onUpdateKpi,
  onAddKpi,
  onAddObjective,
  onUpdateObjective,
  onDeleteObjective,
  onAddPriority,
  onUpdatePriority,
  onDeletePriority,
  onAddResource,
  onUpdateResource,
  onDeleteResource,
  selectedTeam = 'ALL',
  onSelectTeam,
  l1Data,
  l2Data,
  l3Data,
  onNavigateLevel,
  onUpdateCorrelation,
}) => {
  const isVi = language === 'vi';
  const isKo = language === 'ko';
  const [isAddKpiOpen, setIsAddKpiOpen] = useState(false);
  const [hoveredPriorityId, setHoveredPriorityId] = useState<string | null>(null);
  const [hoveredResourceKey, setHoveredResourceKey] = useState<string | null>(null);

  // Objective management state
  const [addObjectiveConfig, setAddObjectiveConfig] = useState<{
    type: 'annual' | 'threeYear';
    targetLevel: PolicyLevel;
  } | null>(null);
  const [editingObjective, setEditingObjective] = useState<{
    obj: BreakthroughObjective;
    isThreeYear: boolean;
    targetLevel?: PolicyLevel;
  } | null>(null);
  const [deletingObjective, setDeletingObjective] = useState<{
    obj: BreakthroughObjective;
    isThreeYear: boolean;
    targetLevel?: PolicyLevel;
  } | null>(null);

  // Priority management state
  const [isAddPriorityOpen, setIsAddPriorityOpen] = useState(false);
  const [addPriorityConfig, setAddPriorityConfig] = useState<{
    targetLevel: PolicyLevel;
  } | null>(null);
  const [editingPriority, setEditingPriority] = useState<{
    priority: ImprovementPriority;
    targetLevel?: PolicyLevel;
  } | null>(null);
  const [deletingPriority, setDeletingPriority] = useState<{
    priority: ImprovementPriority;
    targetLevel?: PolicyLevel;
  } | null>(null);

  // Resource management state
  const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourcePerson | null>(null);
  const [deletingResource, setDeletingResource] = useState<ResourcePerson | null>(null);

  // View mode state: default to 'amplon' layout
  const [matrixViewMode, setMatrixViewMode] = useState<'amplon' | 'classic'>('amplon');

  const {
    annualObjectives = [],
    threeYearObjectives = [],
    priorities,
    resources,
    kpis,
    title,
    titleVi,
    owner,
    revDate,
  } = data;

  const isL1 = data.level === 'L1';
  const isL2 = data.level === 'L2';
  const isL3 = data.level === 'L3';

  const leftQuadrantTitleVi = isL2
    ? 'Ưu Tiên Cải Thiện Hàng Đầu (Level 2)'
    : isL3
    ? 'Ưu Tiên Cải Thiện Hàng Đầu (Level 3)'
    : 'Ưu Tiên Cải Thiện Hàng Đầu';

  const leftQuadrantTitleEn = isL2
    ? 'Top Improvement Priorities (Level 2)'
    : isL3
    ? 'Top Improvement Priorities (Level 3)'
    : 'Top Improvement Priorities';

  // Section 1 (Bottom 1):
  // L1: MỤC TIÊU ĐỘT PHÁ 3 NĂM (3-YEAR BREAKTHROUGH OBJECTIVES - 2026 ~ 2028)
  // L2: MỤC TIÊU ĐỘT PHÁ HÀNG NĂM (ANNUAL BREAKTHROUGH OBJECTIVES - 2026) được link từ top level qua
  // L3: ƯU TIÊN CẢI THIỆN HÀNG ĐẦU TOP LEVEL (lấy từ L1 priorities)
  const section1Config = (() => {
    if (isL2) {
      const items =
        data.annualObjectives && data.annualObjectives.length > 0
          ? data.annualObjectives
          : (l1Data?.annualObjectives?.filter(
              (o) => o.code?.includes('1.1') || o.id?.includes('lean') || o.id?.includes('sa2')
            ) || INITIAL_LEVEL_2_DATA.annualObjectives || []);
      return {
        titleVi: 'MỤC TIÊU ĐỘT PHÁ HÀNG NĂM (ANNUAL BREAKTHROUGH OBJECTIVES - 2026)',
        titleEn: 'ANNUAL POLICY BREAKTHROUGH OBJECTIVES (2026)',
        badgeVi: '🔗 Tự động liên kết từ Top Level (L1)',
        badgeEn: '🔗 Auto-linked from Top Level (L1)',
        sourceLevel: 'L1' as PolicyLevel,
        isLinked: true,
        itemType: 'objective' as const,
        items,
      };
    }
    if (isL3) {
      const allL1Priorities =
        l1Data?.priorities && l1Data.priorities.length > 0
          ? l1Data.priorities
          : INITIAL_LEVEL_1_DATA.priorities || [];
      const leanL1Priorities = allL1Priorities.filter(
        (p) =>
          p.code === 'L1 1.1' ||
          p.code === 'L1 1.2' ||
          p.code === 'L1 1.3' ||
          p.code === 'L1 1.4' ||
          p.id === 'p-l1-1' ||
          p.id === 'p-l1-2' ||
          p.id === 'p-l1-3' ||
          p.id === 'p-l1-4'
      );
      const items = leanL1Priorities.length > 0 ? leanL1Priorities : allL1Priorities.slice(0, 4);
      return {
        titleVi: 'ƯU TIÊN CẢI THIỆN HÀNG ĐẦU TOP LEVEL (L1)',
        titleEn: 'TOP LEVEL IMPROVEMENT PRIORITIES (L1)',
        badgeVi: '🔗 Tự động liên kết từ Top Level (L1)',
        badgeEn: '🔗 Auto-linked from Top Level (L1)',
        sourceLevel: 'L1' as PolicyLevel,
        isLinked: true,
        itemType: 'priority' as const,
        items,
      };
    }
    // L1 Default
    return {
      titleVi: 'MỤC TIÊU ĐỘT PHÁ 3 NĂM (3-YEAR BREAKTHROUGH OBJECTIVES - 2026 ~ 2028)',
      titleEn: '3-YEAR POLICY BREAKTHROUGH OBJECTIVES (2026 ~ 2028)',
      badgeVi: null,
      badgeEn: null,
      sourceLevel: 'L1' as PolicyLevel,
      isLinked: false,
      itemType: 'objective' as const,
      items: threeYearObjectives,
    };
  })();

  // Section 2 (Bottom 2):
  // L1: MỤC TIÊU ĐỘT PHÁ HÀNG NĂM (ANNUAL BREAKTHROUGH OBJECTIVES - 2026)
  // L2: ƯU TIÊN CẢI THIỆN HÀNG ĐẦU LEVEL 1 (tự động lấy từ 4 ưu tiên của Lean trong Level 1)
  // L3: ƯU TIÊN CẢI THIỆN HÀNG ĐẦU LEVEL 2 (lấy data từ Level 2 priorities)
  const section2Config = (() => {
    if (isL2) {
      const allL1Priorities =
        l1Data?.priorities && l1Data.priorities.length > 0
          ? l1Data.priorities
          : INITIAL_LEVEL_1_DATA.priorities || [];
      const leanL1Priorities = allL1Priorities.filter(
        (p) =>
          p.code === 'L1 1.1' ||
          p.code === 'L1 1.2' ||
          p.code === 'L1 1.3' ||
          p.code === 'L1 1.4' ||
          p.id === 'p-l1-1' ||
          p.id === 'p-l1-2' ||
          p.id === 'p-l1-3' ||
          p.id === 'p-l1-4'
      );
      const items = leanL1Priorities.length > 0 ? leanL1Priorities : allL1Priorities.slice(0, 4);
      return {
        titleVi: 'ƯU TIÊN CẢI THIỆN HÀNG ĐẦU LEVEL 1',
        titleEn: 'TOP LEVEL IMPROVEMENT PRIORITIES',
        badgeVi: '🔗 Tự động liên kết từ Level 1',
        badgeEn: '🔗 Auto-linked from Level 1',
        sourceLevel: 'L1' as PolicyLevel,
        isLinked: true,
        itemType: 'priority' as const,
        items,
      };
    }
    if (isL3) {
      const items =
        l2Data?.priorities && l2Data.priorities.length > 0
          ? l2Data.priorities
          : INITIAL_LEVEL_2_DATA.priorities || [];
      return {
        titleVi: 'ƯU TIÊN CẢI THIỆN HÀNG ĐẦU LEVEL 2',
        titleEn: 'TOP IMPROVEMENT PRIORITIES (LEVEL 2)',
        badgeVi: '🔗 Lấy dữ liệu tự động từ Level 2',
        badgeEn: '🔗 Auto-linked from Level 2',
        sourceLevel: 'L2' as PolicyLevel,
        isLinked: true,
        itemType: 'priority' as const,
        items,
      };
    }
    // L1 Default
    return {
      titleVi: 'MỤC TIÊU ĐỘT PHÁ HÀNG NĂM (ANNUAL BREAKTHROUGH OBJECTIVES - 2026)',
      titleEn: 'ANNUAL POLICY BREAKTHROUGH OBJECTIVES (2026)',
      badgeVi: null,
      badgeEn: null,
      sourceLevel: 'L1' as PolicyLevel,
      isLinked: false,
      itemType: 'objective' as const,
      items: annualObjectives,
    };
  })();

  const isTeamFiltered = Boolean(selectedTeam && selectedTeam !== 'ALL');

  const displayedKpis = isTeamFiltered
    ? kpis.filter((k) => matchesTeam(k.department, selectedTeam))
    : kpis;

  const teamResources = isTeamFiltered
    ? resources.filter(
        (r) => matchesTeam(r.department, selectedTeam) || matchesTeam(r.key, selectedTeam)
      )
    : resources;
  const displayedResources = isTeamFiltered ? teamResources : resources;
  const displayedTableResources =
    isTeamFiltered && teamResources.length > 0 ? teamResources : resources;

  const teamPriorities = isTeamFiltered
    ? priorities.filter(
        (p) =>
          matchesTeam(p.owner, selectedTeam) ||
          displayedKpis.some(
            (k) =>
              k.code.startsWith(p.code.split(' ')[0]) ||
              k.linkedPriorityIds?.includes(p.id) ||
              p.id === k.code
          )
      )
    : priorities;
  const displayedPriorities =
    isTeamFiltered && teamPriorities.length > 0 ? teamPriorities : priorities;

  return (
    <div className="space-y-6">
      {/* Top Banner & Info */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
              {data.level} Policy Deployment Matrix
            </span>
            <span className="text-xs text-slate-500">
              Owner: <strong className="text-slate-800">{owner}</strong> | Rev. Date: {revDate}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            {isVi ? titleVi : title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isVi
              ? 'Sơ đồ liên kết Mục tiêu Đột phá - Ưu tiên Cải thiện - Chỉ số KPI - Phân công Nguồn lực (Vietnam Samho Co. Ltd)'
              : 'Interactive Hoshin Kanri X-Matrix mapping Breakthroughs, Priorities, KPIs, and Ownership.'}
          </p>
        </div>

        {/* View Mode Toggle & Legend */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setMatrixViewMode('amplon')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                matrixViewMode === 'amplon'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>X-Matrix</span>
            </button>
            <button
              onClick={() => setMatrixViewMode('classic')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                matrixViewMode === 'classic'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>{isVi ? '📋 Chế Độ Thẻ & Bảng' : '📋 Cards & Table View'}</span>
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center space-x-3 text-xs font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-1.5" title={isVi ? 'Liên kết 4 trục Đông - Tây - Nam - Bắc qua tâm ma trận' : '4-Axis link'}>
              <span className="font-black text-slate-900 text-sm leading-none">✕</span>
              <span className="text-slate-700 font-semibold">
                {isVi ? 'Liên kết 4 trục: Dot "x"' : '4-Axis Link: Dot "x"'}
              </span>
            </div>
            <div className="w-px h-3.5 bg-slate-300"></div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-900 inline-block shadow-2xs"></span>
              <span className="text-slate-700">
                {isVi ? 'Phụ trách Chính (Tròn đậm ●)' : 'Primary (Solid ●)'}
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-slate-900 inline-block bg-white shadow-2xs"></span>
              <span className="text-slate-700">
                {isVi ? 'Phụ trách Phụ (Tròn khuyết ○)' : 'Secondary (Hollow ○)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conditional Rendering: Amplon Layout vs Classic Layout */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20 text-sm text-slate-500">
            <span className="w-4 h-4 mr-3 rounded-full border-2 border-slate-300 border-t-emerald-600 animate-spin" />
            {language === 'vi' ? 'Đang tải ma trận X...' : 'Loading X-Matrix...'}
          </div>
        }
      >
        {matrixViewMode === 'amplon' ? (
        <AmplonXMatrix
          data={data}
          language={language}
          section1Config={section1Config}
          section2Config={section2Config}
          displayedPriorities={displayedPriorities}
          displayedKpis={displayedKpis}
          displayedResources={displayedTableResources}
          onSelectKpi={onSelectKpi}
          onUpdateKpi={onUpdateKpi || (() => {})}
          onEditPriority={(priority, targetLevel) => {
            setEditingPriority({ priority, targetLevel: targetLevel || data.level });
          }}
          onDeletePriority={(priority, targetLevel) => {
            setDeletingPriority({ priority, targetLevel: targetLevel || data.level });
          }}
          onAddPriority={(targetLevel) => {
            setAddPriorityConfig({ targetLevel: targetLevel || data.level });
            setIsAddPriorityOpen(true);
          }}
          onEditObjective={(obj, isThreeYear, targetLevel) => {
            setEditingObjective({ obj, isThreeYear, targetLevel: targetLevel || data.level });
          }}
          onDeleteObjective={(obj, isThreeYear, targetLevel) => {
            setDeletingObjective({ obj, isThreeYear, targetLevel: targetLevel || data.level });
          }}
          onAddObjective={(isThreeYear, targetLevel) => {
            setAddObjectiveConfig({
              type: isThreeYear ? 'threeYear' : 'annual',
              targetLevel: targetLevel || data.level,
            });
          }}
          onEditResource={(r) => {
            setEditingResource(r);
          }}
          onDeleteResource={(r) => {
            setDeletingResource(r);
          }}
          onAddResource={() => {
            setIsAddResourceOpen(true);
          }}
          onAddKpi={() => {
            setIsAddKpiOpen(true);
          }}
          onNavigateLevel={onNavigateLevel}
          onUpdateCorrelation={onUpdateCorrelation}
        />
      ) : (
        /* Main Classic X-Matrix Visual Container */
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 overflow-x-auto">
        <div className="min-w-[980px]">
          {/* Top Section: Targets to Improve Header */}
          <div className="mb-4 bg-slate-900 text-white p-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm uppercase tracking-wide">
                {isVi ? 'MỤC TIÊU CẢI THIỆN (TARGET TO IMPROVE / KPIs)' : 'TARGET TO IMPROVE (KPIs)'}
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              {kpis.length} {isVi ? 'chỉ số đo lường' : 'metrics'}
            </span>
          </div>

          {/* X-MATRIX CORE GRID LAYOUT */}
          <div className="grid grid-cols-12 gap-2 text-xs">
            {/* Left 4 Columns: Improvement Priorities */}
            <div className="col-span-4 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 border-b border-slate-200 pb-1.5 flex justify-between items-center">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-slate-900">
                    {isVi ? leftQuadrantTitleVi : leftQuadrantTitleEn}
                  </span>
                  <button
                    onClick={() => setIsAddPriorityOpen(true)}
                    title={isVi ? `Thêm Ưu Tiên Cải Thiện Hàng Đầu (${data.level})` : `Add Top Improvement Priority (${data.level})`}
                    className="p-1 bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white rounded transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Code</span>
              </div>
              <div className="space-y-1.5">
                {displayedPriorities.map((p) => {
                  const isHovered = hoveredPriorityId === p.id;
                  return (
                    <div
                      key={p.id}
                      onMouseEnter={() => setHoveredPriorityId(p.id)}
                      onMouseLeave={() => setHoveredPriorityId(null)}
                      className={`p-2 rounded-md border transition cursor-pointer flex items-center justify-between gap-2 group ${
                        isHovered
                          ? 'bg-blue-50 border-blue-400 text-blue-900 font-semibold shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-slate-900 block font-mono text-[11px]">
                          {p.code}
                        </span>
                        <span className="text-slate-700 font-medium block">
                          {isVi && p.titleVi ? p.titleVi : isKo && p.titleKo ? p.titleKo : p.title}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                          {p.title}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPriority({ priority: p, targetLevel: data.level });
                          }}
                          title={isVi ? 'Chỉnh sửa ưu tiên này' : 'Edit priority'}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded transition cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingPriority({ priority: p, targetLevel: data.level });
                          }}
                          title={isVi ? 'Xóa ưu tiên này' : 'Delete priority'}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {displayedPriorities.length === 0 && (
                  <div className="text-center py-4 text-slate-400 text-xs italic bg-white rounded border border-dashed border-slate-300">
                    {isTeamFiltered
                      ? isVi
                        ? `Không có ưu tiên riêng biệt cho team ${selectedTeam}`
                        : `No specific priorities for team ${selectedTeam}`
                      : isVi
                      ? 'Chưa có ưu tiên nào'
                      : 'No priorities set'}
                  </div>
                )}
              </div>
            </div>

            {/* Center 4 Columns: Diamond Compass */}
            <div className="col-span-4 bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
              {/* Center Diamond Compass Graphic */}
              <div className="relative my-auto bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-xl p-6 shadow-md border border-slate-800 text-center">
                {/* Diamond Background Pattern */}
                <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                  <div className="w-48 h-48 rotate-45 border-4 border-white"></div>
                </div>

                <div className="relative z-10 space-y-4">
                  <div>
                    <SamhoLogo variant="badge" className="w-12 h-12 mx-auto mb-2 shadow-lg" title="Vietnam Samho Co. Ltd" />
                    <h4 className="font-extrabold text-sm text-red-400 uppercase tracking-widest">
                      VIETNAM SAMHO
                    </h4>
                    <span className="text-[11px] text-slate-300 font-medium">
                      2026 Policy Deployment ({data.level})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-left pt-2 border-t border-slate-800 text-[11px]">
                    <div className="bg-slate-800/80 p-2 rounded border border-slate-700">
                      <span className="text-[10px] text-amber-400 font-bold block uppercase truncate">
                        {isVi ? leftQuadrantTitleVi : leftQuadrantTitleEn}
                      </span>
                      <span className="text-slate-200 font-semibold">
                        {displayedPriorities.length} {isVi ? 'ưu tiên hàng đầu' : 'priorities'}
                      </span>
                    </div>

                    <div className="bg-slate-800/80 p-2 rounded border border-slate-700">
                      <span className="text-[10px] text-emerald-400 font-bold block uppercase truncate">
                        {isVi ? 'Mục tiêu cải thiện' : 'Targets to Improve'}
                      </span>
                      <span className="text-slate-200 font-semibold">
                        {displayedKpis.length} {isVi ? 'chỉ số KPI' : 'KPIs'}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Hierarchy Linking Summary */}
                  <div className="pt-2 border-t border-slate-800/90 text-[10px] text-slate-300 font-medium">
                    {isL2 ? (
                      <div className="flex items-center justify-center gap-1.5 text-sky-300 bg-sky-950/50 py-1 px-2 rounded border border-sky-800/40">
                        <Link2 className="w-3 h-3 shrink-0 text-sky-400" />
                        <span>
                          {isVi
                            ? `Liên kết: ${section1Config.items.length} Mục tiêu L1 & ${section2Config.items.length} Ưu tiên hàng đầu L1`
                            : `Linked: ${section1Config.items.length} L1 Goals & ${section2Config.items.length} L1 Priorities`}
                        </span>
                      </div>
                    ) : isL3 ? (
                      <div className="flex items-center justify-center gap-1.5 text-teal-300 bg-teal-950/50 py-1 px-2 rounded border border-teal-800/40">
                        <Link2 className="w-3 h-3 shrink-0 text-teal-400" />
                        <span>
                          {isVi
                            ? `Liên kết: ${section1Config.items.length} Ưu tiên hàng đầu L1 & ${section2Config.items.length} Ưu tiên hàng đầu L2`
                            : `Linked: ${section1Config.items.length} L1 Priorities & ${section2Config.items.length} L2 Priorities`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 text-amber-300 bg-amber-950/40 py-1 px-2 rounded border border-amber-800/40">
                        <Sparkles className="w-3 h-3 shrink-0 text-amber-400" />
                        <span>
                          {isVi
                            ? `Cấp gốc: ${threeYearObjectives.length} Mục tiêu 3 năm & ${annualObjectives.length} Mục tiêu năm`
                            : `Base Level: ${threeYearObjectives.length} 3Y & ${annualObjectives.length} Annual Goals`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right 4 Columns: Resources & Responsibility Owners */}
            <div className="col-span-4 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 border-b border-slate-200 pb-1.5 flex justify-between items-center">
                <div className="flex items-center space-x-1.5">
                  <span>{isVi ? 'Nguồn Lực & Nhân Sự' : 'Resources & Owners'}</span>
                  <button
                    onClick={() => setIsAddResourceOpen(true)}
                    title={isVi ? 'Thêm Nguồn Lực / Nhân Sự Mới' : 'Add Personnel Resource'}
                    className="p-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Department</span>
              </div>
              <div className="space-y-1.5">
                {displayedResources.map((r) => {
                  const isHovered = hoveredResourceKey === r.key;
                  return (
                    <div
                      key={r.key}
                      onMouseEnter={() => setHoveredResourceKey(r.key)}
                      onMouseLeave={() => setHoveredResourceKey(null)}
                      className={`p-2 rounded-md border transition cursor-pointer flex items-center justify-between gap-2 group ${
                        isHovered
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{r.fullTitle}</span>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {r.department}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingResource(r);
                          }}
                          title={isVi ? 'Chỉnh sửa nhân sự này' : 'Edit resource'}
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-100 rounded transition cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingResource(r);
                          }}
                          title={isVi ? 'Xóa nhân sự này' : 'Delete resource'}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {displayedResources.length === 0 && (
                  <div className="text-center py-4 text-slate-400 text-xs italic bg-white rounded border border-dashed border-slate-300">
                    {isTeamFiltered
                      ? isVi
                        ? `Không có nhân sự được phân loại riêng cho team ${selectedTeam}`
                        : `No personnel recorded for team ${selectedTeam}`
                      : isVi
                      ? 'Chưa có nhân sự nào'
                      : 'No personnel assigned'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section 1 */}
          <div className="mt-4 bg-slate-900 text-white p-4 rounded-lg border border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <h3 className="font-bold text-sm uppercase tracking-wide text-amber-300">
                  {isVi ? section1Config.titleVi : section1Config.titleEn}
                </h3>
                {section1Config.isLinked && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-950/90 text-sky-300 border border-sky-700/60 shadow-xs">
                    <Link2 className="w-3 h-3 text-sky-400" />
                    {isVi ? section1Config.badgeVi : section1Config.badgeEn}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {section1Config.isLinked && onNavigateLevel && (
                  <button
                    onClick={() => onNavigateLevel(section1Config.sourceLevel)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-lg transition cursor-pointer"
                    title={isVi ? `Chuyển tới ${section1Config.sourceLevel} để xem hoặc chỉnh sửa` : `Switch to ${section1Config.sourceLevel}`}
                  >
                    <span>{isVi ? `Quản lý tại ${section1Config.sourceLevel}` : `Manage at ${section1Config.sourceLevel}`}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                {section1Config.isLinked ? (
                  section1Config.itemType === 'objective' ? (
                    <button
                      onClick={() => setAddObjectiveConfig({ type: 'annual', targetLevel: section1Config.sourceLevel })}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isVi ? `Thêm Mục Tiêu (${section1Config.sourceLevel})` : `Add Objective (${section1Config.sourceLevel})`}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setAddPriorityConfig({ targetLevel: section1Config.sourceLevel })}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isVi ? `Thêm Ưu Tiên Hàng Đầu (${section1Config.sourceLevel})` : `Add Priority (${section1Config.sourceLevel})`}</span>
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => setAddObjectiveConfig({ type: 'threeYear', targetLevel: 'L1' })}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isVi ? 'Thêm Mục Tiêu 3 Năm' : 'Add 3-Year Objective'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {section1Config.items.map((rawItem: any) => {
                const isObj = section1Config.itemType === 'objective';
                const code = rawItem.code;
                const titleText = isVi && rawItem.titleVi ? rawItem.titleVi : isKo && rawItem.titleKo ? rawItem.titleKo : rawItem.title;
                return (
                  <div
                    key={rawItem.id}
                    className={`p-3 rounded-lg border flex items-start justify-between gap-3 group transition ${
                      section1Config.isLinked
                        ? 'bg-slate-800/90 border-sky-900/50 hover:border-sky-500/60'
                        : 'bg-slate-800/80 border-amber-900/40 hover:border-amber-600/60'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className={`px-2 py-0.5 rounded text-white font-mono font-bold text-xs shrink-0 mt-0.5 ${
                        section1Config.isLinked ? 'bg-sky-600' : 'bg-amber-600'
                      }`}>
                        {code}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h5 className="font-bold text-sm text-slate-100">
                            {titleText}
                          </h5>
                          {section1Config.isLinked && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-sky-900/80 text-sky-300 border border-sky-700/50">
                              {section1Config.sourceLevel}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                          <span>🇺🇸 {rawItem.title}</span>
                          {isVi && rawItem.titleKo && (
                            <span className="text-indigo-300 bg-indigo-950/60 border border-indigo-800/40 px-1.5 py-0.5 rounded text-[10px]">
                              🇰🇷 {rawItem.titleKo}
                            </span>
                          )}
                          {isKo && rawItem.titleVi && (
                            <span className="text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded text-[10px]">
                              🇻🇳 {rawItem.titleVi}
                            </span>
                          )}
                        </div>
                        {isObj ? (
                          <span className="text-[11px] text-amber-300/80 font-mono block mt-1">
                            Target Period: {rawItem.period || (section1Config.isLinked ? '2026' : '2026 - 2028')}
                          </span>
                        ) : (
                          <span className="text-[11px] text-sky-300/80 font-mono block mt-1">
                            Owner: {rawItem.owner || 'Samho Operations'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => {
                          if (isObj) {
                            setEditingObjective({
                              obj: rawItem,
                              isThreeYear: !section1Config.isLinked,
                              targetLevel: section1Config.sourceLevel,
                            });
                          } else {
                            setEditingPriority({
                              priority: rawItem,
                              targetLevel: section1Config.sourceLevel,
                            });
                          }
                        }}
                        title={isVi ? `Chỉnh sửa (${section1Config.sourceLevel})` : `Edit (${section1Config.sourceLevel})`}
                        className="p-1.5 text-blue-300 hover:text-white bg-slate-700/80 hover:bg-slate-700 rounded-md transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (isObj) {
                            setDeletingObjective({
                              obj: rawItem,
                              isThreeYear: !section1Config.isLinked,
                              targetLevel: section1Config.sourceLevel,
                            });
                          } else {
                            setDeletingPriority({
                              priority: rawItem,
                              targetLevel: section1Config.sourceLevel,
                            });
                          }
                        }}
                        title={isVi ? `Xóa (${section1Config.sourceLevel})` : `Delete (${section1Config.sourceLevel})`}
                        className="p-1.5 text-red-300 hover:text-white bg-slate-700/80 hover:bg-slate-700 rounded-md transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {section1Config.items.length === 0 && (
                <div className="col-span-2 text-center py-5 text-slate-400 text-xs italic bg-slate-800/40 rounded-lg border border-dashed border-slate-700">
                  {section1Config.isLinked
                    ? isVi
                      ? `Chưa có dữ liệu liên kết từ ${section1Config.sourceLevel}. Dữ liệu sẽ tự động xuất hiện khi có tại ${section1Config.sourceLevel}.`
                      : `No data linked from ${section1Config.sourceLevel} yet.`
                    : isVi
                    ? 'Chưa có mục tiêu đột phá 3 năm nào. Hãy nhấn "Thêm Mục Tiêu 3 Năm" để tạo mới.'
                    : 'No 3-year breakthrough objectives configured yet.'}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section 2 */}
          <div className="mt-4 bg-slate-900 text-white p-4 rounded-lg border border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <h3 className="font-bold text-sm uppercase tracking-wide text-emerald-300">
                  {isVi ? section2Config.titleVi : section2Config.titleEn}
                </h3>
                {section2Config.isLinked && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 shadow-xs">
                    <Link2 className="w-3 h-3 text-emerald-400" />
                    {isVi ? section2Config.badgeVi : section2Config.badgeEn}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {section2Config.isLinked && onNavigateLevel && (
                  <button
                    onClick={() => onNavigateLevel(section2Config.sourceLevel)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-lg transition cursor-pointer"
                    title={isVi ? `Chuyển tới ${section2Config.sourceLevel} để xem hoặc chỉnh sửa` : `Switch to ${section2Config.sourceLevel}`}
                  >
                    <span>{isVi ? `Quản lý tại ${section2Config.sourceLevel}` : `Manage at ${section2Config.sourceLevel}`}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                {section2Config.isLinked ? (
                  <button
                    onClick={() => setAddPriorityConfig({ targetLevel: section2Config.sourceLevel })}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isVi ? `Thêm Ưu Tiên Hàng Đầu (${section2Config.sourceLevel})` : `Add Priority (${section2Config.sourceLevel})`}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setAddObjectiveConfig({ type: 'annual', targetLevel: 'L1' })}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isVi ? 'Thêm Mục Tiêu Hàng Năm' : 'Add Annual Objective'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {section2Config.items.map((rawItem: any) => {
                const isObj = section2Config.itemType === 'objective';
                const code = rawItem.code;
                const titleText = isVi && rawItem.titleVi ? rawItem.titleVi : isKo && rawItem.titleKo ? rawItem.titleKo : rawItem.title;
                return (
                  <div
                    key={rawItem.id}
                    className={`p-3 rounded-lg border flex items-start justify-between gap-3 group transition ${
                      section2Config.isLinked
                        ? 'bg-slate-800/90 border-emerald-900/50 hover:border-emerald-500/60'
                        : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className={`px-2 py-0.5 rounded text-white font-mono font-bold text-xs shrink-0 mt-0.5 ${
                        section2Config.isLinked ? 'bg-emerald-700' : 'bg-red-600'
                      }`}>
                        {code}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h5 className="font-bold text-sm text-slate-100">
                            {titleText}
                          </h5>
                          {section2Config.isLinked && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-700/50">
                              {section2Config.sourceLevel}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                          <span>🇺🇸 {rawItem.title}</span>
                          {isVi && rawItem.titleKo && (
                            <span className="text-indigo-300 bg-indigo-950/60 border border-indigo-800/40 px-1.5 py-0.5 rounded text-[10px]">
                              🇰🇷 {rawItem.titleKo}
                            </span>
                          )}
                          {isKo && rawItem.titleVi && (
                            <span className="text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded text-[10px]">
                              🇻🇳 {rawItem.titleVi}
                            </span>
                          )}
                        </div>
                        {isObj ? (
                          <span className="text-[11px] text-slate-400 block mt-1">
                            Target Period: {rawItem.period || '2026'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-300/80 font-mono block mt-1">
                            Owner / Department: {rawItem.owner || 'Samho Operations'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => {
                          if (isObj) {
                            setEditingObjective({
                              obj: rawItem,
                              isThreeYear: false,
                              targetLevel: section2Config.sourceLevel,
                            });
                          } else {
                            setEditingPriority({
                              priority: rawItem,
                              targetLevel: section2Config.sourceLevel,
                            });
                          }
                        }}
                        title={isVi ? `Chỉnh sửa (${section2Config.sourceLevel})` : `Edit (${section2Config.sourceLevel})`}
                        className="p-1.5 text-blue-300 hover:text-white bg-slate-700/80 hover:bg-slate-700 rounded-md transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (isObj) {
                            setDeletingObjective({
                              obj: rawItem,
                              isThreeYear: false,
                              targetLevel: section2Config.sourceLevel,
                            });
                          } else {
                            setDeletingPriority({
                              priority: rawItem,
                              targetLevel: section2Config.sourceLevel,
                            });
                          }
                        }}
                        title={isVi ? `Xóa (${section2Config.sourceLevel})` : `Delete (${section2Config.sourceLevel})`}
                        className="p-1.5 text-red-300 hover:text-white bg-slate-700/80 hover:bg-slate-700 rounded-md transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {section2Config.items.length === 0 && (
                <div className="col-span-2 text-center py-5 text-slate-400 text-xs italic bg-slate-800/40 rounded-lg border border-dashed border-slate-700">
                  {section2Config.isLinked
                    ? isVi
                      ? `Chưa có dữ liệu liên kết từ ${section2Config.sourceLevel}. Dữ liệu sẽ tự động xuất hiện khi có tại ${section2Config.sourceLevel}.`
                      : `No data linked from ${section2Config.sourceLevel} yet.`
                    : isVi
                    ? 'Chưa có mục tiêu đột phá hàng năm nào. Hãy nhấn "Thêm Mục Tiêu Hàng Năm" để tạo mới.'
                    : 'No annual breakthrough objectives configured yet.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
      </Suspense>

      {/* Add New Breakthrough Objective Modal */}
      {addObjectiveConfig && (
        <ObjectiveModal
          language={language}
          level={addObjectiveConfig.targetLevel}
          isThreeYear={addObjectiveConfig.type === 'threeYear'}
          defaultPeriod={addObjectiveConfig.type === 'threeYear' ? '2026 - 2028' : '2026'}
          nextCode={
            addObjectiveConfig.type === 'threeYear'
              ? `3Y.${threeYearObjectives.length + 1}`
              : `${addObjectiveConfig.targetLevel}.${annualObjectives.length + 1}`
          }
          onClose={() => setAddObjectiveConfig(null)}
          onSave={(newObj) => {
            if (onAddObjective) {
              onAddObjective(newObj, addObjectiveConfig.type === 'threeYear', addObjectiveConfig.targetLevel);
            }
            setAddObjectiveConfig(null);
          }}
        />
      )}

      {/* Edit Breakthrough Objective Modal */}
      {editingObjective && (
        <ObjectiveModal
          objective={editingObjective.obj}
          language={language}
          level={editingObjective.targetLevel || data.level}
          isThreeYear={editingObjective.isThreeYear}
          onClose={() => setEditingObjective(null)}
          onSave={(updatedObj) => {
            if (onUpdateObjective) {
              onUpdateObjective(updatedObj, editingObjective.isThreeYear, editingObjective.targetLevel || data.level);
            }
            setEditingObjective(null);
          }}
          onDelete={(id) => {
            if (onDeleteObjective) {
              onDeleteObjective(id, editingObjective.isThreeYear, editingObjective.targetLevel || data.level);
            }
            setEditingObjective(null);
          }}
        />
      )}

      {/* Confirm Delete Objective Modal */}
      {deletingObjective && (
        <ConfirmDeleteModal
          title={
            deletingObjective.isThreeYear
              ? isVi
                ? `Xác Nhận Xóa Mục Tiêu 3 Năm (${deletingObjective.targetLevel || data.level})`
                : `Confirm Delete 3-Year Objective (${deletingObjective.targetLevel || data.level})`
              : isVi
              ? `Xác Nhận Xóa Mục Tiêu Hàng Năm (${deletingObjective.targetLevel || data.level})`
              : `Confirm Delete Annual Objective (${deletingObjective.targetLevel || data.level})`
          }
          message={
            isVi
              ? `Bạn có chắc chắn muốn xóa vĩnh viễn mục tiêu đột phá "${deletingObjective.obj.code}: ${deletingObjective.obj.titleVi || deletingObjective.obj.title}" tại cấp ${deletingObjective.targetLevel || data.level} không? Hành động này không thể hoàn tác.`
              : `Are you sure you want to permanently delete breakthrough objective "${deletingObjective.obj.code}: ${deletingObjective.obj.title}" from ${deletingObjective.targetLevel || data.level}?`
          }
          language={language}
          onConfirm={() => {
            if (onDeleteObjective) {
              onDeleteObjective(deletingObjective.obj.id, deletingObjective.isThreeYear, deletingObjective.targetLevel || data.level);
            }
            setDeletingObjective(null);
          }}
          onCancel={() => setDeletingObjective(null)}
        />
      )}

      {/* Add Priority Modal */}
      {(isAddPriorityOpen || addPriorityConfig) && (
        <PriorityModal
          language={language}
          level={addPriorityConfig?.targetLevel || data.level}
          nextCode={`${addPriorityConfig?.targetLevel || data.level} 1.${priorities.length + 1}.1`}
          onClose={() => {
            setIsAddPriorityOpen(false);
            setAddPriorityConfig(null);
          }}
          onSave={(newPriority) => {
            const targetLvl = addPriorityConfig?.targetLevel || data.level;
            if (onAddPriority) onAddPriority(newPriority, targetLvl);
            setIsAddPriorityOpen(false);
            setAddPriorityConfig(null);
          }}
        />
      )}

      {/* Edit Priority Modal */}
      {editingPriority && (
        <PriorityModal
          priority={editingPriority.priority}
          language={language}
          level={editingPriority.targetLevel || data.level}
          onClose={() => setEditingPriority(null)}
          onSave={(updatedPriority) => {
            if (onUpdatePriority) {
              onUpdatePriority(updatedPriority, editingPriority.targetLevel || data.level);
            }
            setEditingPriority(null);
          }}
          onDelete={(id) => {
            if (onDeletePriority) {
              onDeletePriority(id, editingPriority.targetLevel || data.level);
            }
            setEditingPriority(null);
          }}
        />
      )}

      {/* Confirm Delete Priority Modal */}
      {deletingPriority && (
        <ConfirmDeleteModal
          title={
            isVi
              ? `Xác Nhận Xóa Ưu Tiên Cải Thiện Hàng Đầu (${deletingPriority.targetLevel || data.level})`
              : `Confirm Delete Top Improvement Priority (${deletingPriority.targetLevel || data.level})`
          }
          message={
            isVi
              ? `Bạn có chắc chắn muốn xóa ưu tiên cải thiện hàng đầu "${deletingPriority.priority.code}: ${deletingPriority.priority.titleVi || deletingPriority.priority.title}" tại cấp ${deletingPriority.targetLevel || data.level} không?`
              : `Are you sure you want to delete priority "${deletingPriority.priority.code}: ${deletingPriority.priority.title}" from ${deletingPriority.targetLevel || data.level}?`
          }
          language={language}
          onConfirm={() => {
            if (onDeletePriority) {
              onDeletePriority(deletingPriority.priority.id, deletingPriority.targetLevel || data.level);
            }
            setDeletingPriority(null);
          }}
          onCancel={() => setDeletingPriority(null)}
        />
      )}

      {/* Add Resource Modal */}
      {isAddResourceOpen && (
        <ResourceModal
          language={language}
          onClose={() => setIsAddResourceOpen(false)}
          onSave={(newResource) => {
            if (onAddResource) onAddResource(newResource);
            setIsAddResourceOpen(false);
          }}
        />
      )}

      {/* Edit Resource Modal */}
      {editingResource && (
        <ResourceModal
          resource={editingResource}
          language={language}
          onClose={() => setEditingResource(null)}
          onSave={(updatedResource) => {
            if (onUpdateResource) onUpdateResource(updatedResource);
            setEditingResource(null);
          }}
          onDelete={(key) => {
            if (onDeleteResource) onDeleteResource(key);
            setEditingResource(null);
          }}
        />
      )}

      {/* Confirm Delete Resource Modal */}
      {deletingResource && (
        <ConfirmDeleteModal
          title={isVi ? 'Xác Nhận Xóa Nguồn Lực' : 'Confirm Delete Personnel Resource'}
          message={
            isVi
              ? `Bạn có chắc chắn muốn xóa nhân sự/nguồn lực "${deletingResource.key}" không?`
              : `Are you sure you want to delete personnel resource "${deletingResource.key}"?`
          }
          language={language}
          onConfirm={() => {
            if (onDeleteResource) onDeleteResource(deletingResource.key);
            setDeletingResource(null);
          }}
          onCancel={() => setDeletingResource(null)}
        />
      )}

      {/* Add KPI Metric Modal */}
      <Suspense fallback={null}>
        {isAddKpiOpen && (
        <AddKpiModal
          currentLevel={data.level}
          language={language}
          onClose={() => setIsAddKpiOpen(false)}
          onAddKpi={(newKpi) => {
            if (onAddKpi) {
              onAddKpi(newKpi);
            } else if (onUpdateKpi) {
              onUpdateKpi(newKpi);
            }
            setIsAddKpiOpen(false);
          }}
        />
        )}
      </Suspense>
    </div>
  );
};
