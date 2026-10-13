import React, { useState, useMemo, useEffect } from 'react';
import {
  LevelPolicyData,
  Language,
  KpiItem,
  BreakthroughObjective,
  ImprovementPriority,
  ResourcePerson,
  PolicyLevel,
  MonthKey,
} from '../types';
import {
  Info,
  Plus,
  Edit2,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Printer,
  Maximize2,
  Minimize2,
  Scan,
  Sliders,
  Target,
  Users,
  Award,
  Link2,
  ChevronLeft,
  ChevronRight,
  Minus,
} from 'lucide-react';
import { getKpiOverallStatus } from '../lib/kpiUtils';
import { getTeamColorConfig, getLocalizedPureText } from '../lib/teamUtils';
import {
  sortContiguousByTeam,
  getCompassItemTextColor,
  extractItemTeam,
  getTeamPalette,
} from '../utils/matrixGrouping';

interface AmplonXMatrixProps {
  data: LevelPolicyData;
  language: Language;
  section1Config: {
    titleVi: string;
    titleEn: string;
    badgeVi: string | null;
    badgeEn: string | null;
    sourceLevel: PolicyLevel;
    isLinked: boolean;
    itemType: 'objective' | 'priority';
    items: any[];
  };
  section2Config: {
    titleVi: string;
    titleEn: string;
    badgeVi: string | null;
    badgeEn: string | null;
    sourceLevel: PolicyLevel;
    isLinked: boolean;
    itemType: 'objective' | 'priority';
    items: any[];
  };
  displayedPriorities: ImprovementPriority[];
  displayedKpis: KpiItem[];
  displayedResources: ResourcePerson[];
  onSelectKpi: (kpi: KpiItem) => void;
  onUpdateKpi: (updatedKpi: KpiItem) => void;
  onEditPriority: (p: ImprovementPriority, targetLevel?: PolicyLevel) => void;
  onDeletePriority: (p: ImprovementPriority, targetLevel?: PolicyLevel) => void;
  onAddPriority: (targetLevel?: PolicyLevel) => void;
  onEditObjective: (obj: BreakthroughObjective, isThreeYear: boolean, targetLevel?: PolicyLevel) => void;
  onDeleteObjective: (obj: BreakthroughObjective, isThreeYear: boolean, targetLevel?: PolicyLevel) => void;
  onAddObjective: (isThreeYear: boolean, targetLevel?: PolicyLevel) => void;
  onEditResource: (r: ResourcePerson) => void;
  onDeleteResource: (r: ResourcePerson) => void;
  onAddResource: () => void;
  onAddKpi?: () => void;
  onNavigateLevel?: (level: PolicyLevel) => void;
  onUpdateCorrelation?: (key: string, value: 'primary' | 'secondary' | 'none') => void;
}

export const AmplonXMatrix: React.FC<AmplonXMatrixProps> = ({
  data,
  language,
  section1Config,
  section2Config,
  displayedPriorities,
  displayedKpis,
  displayedResources,
  onSelectKpi,
  onUpdateKpi,
  onEditPriority,
  onDeletePriority,
  onAddPriority,
  onEditObjective,
  onDeleteObjective,
  onAddObjective,
  onEditResource,
  onDeleteResource,
  onAddResource,
  onAddKpi,
  onNavigateLevel,
  onUpdateCorrelation,
}) => {
  const isVi = language === 'vi';
  const isKo = language === 'ko';

  // Zoom & View state
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [compassSquareSize, setCompassSquareSize] = useState<number>(380);
  const [kpiColWidth, setKpiColWidth] = useState<number>(44);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollToLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const scrollToCenterX = () => {
    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      el.scrollTo({ left: (el.scrollWidth - el.clientWidth) / 2, behavior: 'smooth' });
    }
  };

  const scrollToRight = () => {
    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    }
  };

  const fitToScreen = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const containerWidth = container.clientWidth - 48; // padding
    const tableEl = container.querySelector('table');
    if (tableEl && containerWidth > 0) {
      const currentScale = zoomScale || 1.0;
      const nativeTableWidth = (tableEl.offsetWidth || tableEl.scrollWidth) / currentScale;
      if (nativeTableWidth > 100) {
        const optimal = +(containerWidth / nativeTableWidth).toFixed(2);
        const bounded = Math.min(1.25, Math.max(0.55, optimal));
        setZoomScale(bounded);
        // Also scroll to left after fitting
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          }
        }, 50);
      }
    }
  };

  // Automatically adapt zoom scale to fit available screen width if table is wider than viewport
  useEffect(() => {
    const handleInitialFit = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const containerWidth = container.clientWidth - 48;
        const tableEl = container.querySelector('table');
        if (tableEl && containerWidth > 300) {
          const nativeWidth = tableEl.offsetWidth || tableEl.scrollWidth;
          if (nativeWidth > containerWidth) {
            const optimal = +(containerWidth / nativeWidth).toFixed(2);
            setZoomScale(Math.min(1.0, Math.max(0.65, optimal)));
          }
        }
      }
    };
    const timer = setTimeout(handleInitialFit, 150);
    return () => clearTimeout(timer);
  }, [data.level]);

  // Crosshair highlighting state (Row & Column highlights like Amplon)
  const [hoveredTopRowIndex, setHoveredTopRowIndex] = useState<number | null>(null);
  const [hoveredLeftColIndex, setHoveredLeftColIndex] = useState<number | null>(null);
  const [hoveredBottomRowIndex, setHoveredBottomRowIndex] = useState<number | null>(null);
  const [hoveredRightColIndex, setHoveredRightColIndex] = useState<number | null>(null);

  // Selected item state for locking highlight
  const [selectedTopRowId, setSelectedTopRowId] = useState<string | null>(null);
  const [selectedLeftColId, setSelectedLeftColId] = useState<string | null>(null);
  const [selectedBottomRowId, setSelectedBottomRowId] = useState<string | null>(null);
  const [selectedRightColId, setSelectedRightColId] = useState<string | null>(null);

  // Level detection for dynamic labels
  const isL1 = data.level === 'L1';
  const isL2 = data.level === 'L2';
  const isL3 = data.level === 'L3';

  // Dynamic Compass & Quadrant labels reflecting exact 2nd level and 3rd level logic
  const compassLabels = useMemo(() => {
    if (isL2) {
      return {
        topVi: 'Ưu tiên cải thiện Cấp 2',
        topEn: '2nd Level Improvement Priorities',
        topKo: '2nd Level 개선 우선순위',
        topBadgeVi: 'Dữ liệu nhập',
        topBadgeEn: 'Direct Input',
        rightVi: 'Mục tiêu cải thiện',
        rightEn: 'Target to Improve',
        rightKo: '개선 목표',
        rightBadgeVi: 'Chỉ số đo lường',
        rightBadgeEn: 'KPI Metrics',
        bottomVi: 'Mục tiêu đột phá chính sách hàng năm',
        bottomEn: 'Annual Policy Breakthrough Objectives',
        bottomKo: '연간 방침 혁신 목표',
        bottomBadgeVi: 'Link từ Top Level (L1)',
        bottomBadgeEn: 'Link from Top Level (L1)',
        leftVi: 'Ưu tiên cải thiện Top Level',
        leftEn: 'Top Level Improvement Priorities',
        leftKo: 'Top Level 최우선 개선 과제',
        leftBadgeVi: 'Link từ Level 1',
        leftBadgeEn: 'Link from Level 1',
      };
    }
    if (isL3) {
      return {
        topVi: 'Ưu tiên cải thiện 3rd Level',
        topEn: '3rd Level Improvement Priorities',
        topKo: '3rd Level 개선 우선순위',
        topBadgeVi: 'Dữ liệu nhập',
        topBadgeEn: 'Direct Input',
        rightVi: 'Mục tiêu cải thiện LV3',
        rightEn: 'Targets to Improve LV3',
        rightKo: 'LV3 개선 목표',
        rightBadgeVi: 'Chỉ số đo lường',
        rightBadgeEn: 'KPI Metrics',
        bottomVi: 'Ưu tiên cải thiện hàng đầu',
        bottomEn: 'Top Improvement Priorities',
        bottomKo: '최우선 개선 과제',
        bottomBadgeVi: 'Link từ Top Level',
        bottomBadgeEn: 'Link from Top Level',
        leftVi: 'Ưu tiên cải thiện 2nd Level',
        leftEn: '2nd Level Improvement Priorities',
        leftKo: '2nd Level 개선 우선순위',
        leftBadgeVi: 'Link từ Level 2',
        leftBadgeEn: 'Link from Level 2',
      };
    }
    // L1 Default
    return {
      topVi: 'Ưu tiên cải thiện hàng đầu',
      topEn: 'Top Improvement Priorities',
      topKo: '최우선 개선 과제',
      topBadgeVi: 'Dữ liệu nhập',
      topBadgeEn: 'Direct Input',
      rightVi: 'Mục tiêu cải thiện (KPIs)',
      rightEn: 'Targets to Improve (KPIs)',
      rightKo: '개선 목표 (KPI)',
      rightBadgeVi: 'Chỉ số đo lường',
      rightBadgeEn: 'KPI Metrics',
      bottomVi: 'Mục tiêu đột phá 3 năm',
      bottomEn: '3-Year Breakthrough Objectives',
      bottomKo: '3개년 혁신 목표',
      bottomBadgeVi: 'Chiến lược dài hạn',
      bottomBadgeEn: 'Long-term Strategy',
      leftVi: 'Mục tiêu hàng năm',
      leftEn: 'Annual Objectives',
      leftKo: '연간 목표',
      leftBadgeVi: 'Mục tiêu 1 năm',
      leftBadgeEn: '1-Year Target',
    };
  }, [isL2, isL3]);

  // Northwest (Top - Left) Correlations: Top Priorities (rows) vs Left (cols)
  // Southwest (Bottom - Left) Correlations: Bottom (rows) vs Left (cols)
  // Northeast (Top - Right) Correlations: Top Priorities (rows) vs Right KPIs & Resources (cols)
  const [manualCorrelations, setManualCorrelations] = useState<Record<string, 'primary' | 'secondary' | 'none'>>(() => {
    return data.correlations || {};
  });

  useEffect(() => {
    if (data.correlations) {
      setManualCorrelations((prev) => ({
        ...data.correlations,
        ...prev,
      }));
    }
  }, [data.correlations]);

  // 1. Top Items (North Arm): Improvement Priorities (Dữ liệu nhập của Level)
  // Sắp xếp liên tục theo Functional Team
  const topItems: ImprovementPriority[] = useMemo(() => {
    return sortContiguousByTeam(displayedPriorities);
  }, [displayedPriorities]);

  // 2. Left Items (West Arm): Section 2 Items
  // L1: Annual Objectives (Mục Tiêu Hàng Năm)
  // L2: Link từ 2nd level / L1 Top Priorities (Ưu Tiên Cải Thiện Hàng Đầu)
  // L3: Link từ 2nd level / L2 Priorities (Ưu Tiên Cải Thiện 2nd Level)
  // Sắp xếp liên tục theo Functional Team
  const leftItems = useMemo(() => {
    const raw = (section2Config.items as any[]).map((it) => ({
      id: it.id,
      code: it.code,
      title: it.title,
      titleVi: it.titleVi,
      titleKo: it.titleKo,
      period: it.period || '2026',
      department: it.department,
      owner: it.owner,
      rawItem: it,
    }));
    return sortContiguousByTeam(raw);
  }, [section2Config]);

  // 3. Bottom Items (South Arm): Section 1 Items
  // L1: 3-Year Objectives (Mục Tiêu Đột Phá 3 Năm)
  // L2: Link từ top level / Annual Objectives (Mục Tiêu Hàng Năm)
  // L3: Link từ top level / L1 Top Priorities (Ưu Tiên Cải Thiện Hàng Đầu)
  // Sắp xếp liên tục theo Functional Team
  const bottomItems = useMemo(() => {
    return sortContiguousByTeam(section1Config.items);
  }, [section1Config]);

  // 4. Right Items (East Arm): Divided into KPIs + Resources
  // Sắp xếp liên tục theo Functional Team
  const rightKpiItems = useMemo(() => {
    return sortContiguousByTeam(displayedKpis);
  }, [displayedKpis]);

  const rightResourceItems = useMemo(() => {
    return sortContiguousByTeam(displayedResources);
  }, [displayedResources]);

  // Color palette for status dots (Orange, Red, Green, Blue like in Amplon)
  const statusColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const getStatusDotColor = (index: number, kpi?: KpiItem) => {
    if (kpi) {
      const st = getKpiOverallStatus(kpi);
      if (st === 'green') return '#10b981'; // green
      if (st === 'yellow') return '#f59e0b'; // amber
      if (st === 'red') return '#ef4444'; // red
      return '#64748b'; // slate
    }
    return statusColors[index % statusColors.length];
  };

  const getDepartmentResourceColor = (department: string) => {
    const d = (department || '').toLowerCase();
    if (d.includes('biz')) return '#9333ea'; // purple
    if (d.includes('quality') || d.includes('qa')) return '#16a34a'; // green
    if (d.includes('csr')) return '#dc2626'; // red
    if (d.includes('lean')) return '#0f172a'; // slate/black
    if (d.includes('dev')) return '#2563eb'; // blue
    if (d.includes('prod')) return '#c026d3'; // magenta/purple
    if (d.includes('plan')) return '#db2777'; // pink
    if (d.includes('it')) return '#ea580c'; // orange
    return '#475569';
  };

  // Helper to determine correlation state for Northwest Grid (Top Priorities vs Left Objectives)
  const getNorthwestCorrelation = (p: ImprovementPriority, obj: any, rowIndex: number, colIndex: number) => {
    const cellKey = `nw_${p.id}_${obj.id}`;
    if (manualCorrelations[cellKey]) return manualCorrelations[cellKey];

    const hasExplicitLinks =
      (p.linkedObjectiveIds && p.linkedObjectiveIds.length > 0) ||
      (obj.linkedPriorityIds && obj.linkedPriorityIds.length > 0) ||
      (p.linkedPriorityIds && p.linkedPriorityIds.length > 0) ||
      (obj.linkedObjectiveIds && obj.linkedObjectiveIds.length > 0);

    if (hasExplicitLinks) {
      if (p.linkedObjectiveIds?.includes(obj.id) || obj.linkedPriorityIds?.includes(p.id)) {
        return 'primary';
      }
      if (p.linkedPriorityIds?.includes(obj.id) || obj.linkedObjectiveIds?.includes(p.id)) {
        return 'primary';
      }
      return 'none';
    }

    // Fallback to code prefix matching only when no explicit links are defined
    const pCodeClean = (p.code || '').replace(/[^0-9]/g, '');
    const objCodeClean = (obj.code || '').replace(/[^0-9]/g, '');
    if (pCodeClean && objCodeClean && (pCodeClean.startsWith(objCodeClean) || objCodeClean.startsWith(pCodeClean))) {
      return 'primary';
    }
    return 'none';
  };

  // Helper to determine correlation state for Southwest Grid (Bottom Objectives vs Left Objectives)
  const getSouthwestCorrelation = (bObj: any, lObj: any, bIndex: number, lIndex: number) => {
    const cellKey = `sw_${bObj.id}_${lObj.id}`;
    if (manualCorrelations[cellKey]) return manualCorrelations[cellKey];

    const hasExplicitLinks =
      (bObj.linkedObjectiveIds && bObj.linkedObjectiveIds.length > 0) ||
      (lObj.linkedPriorityIds && lObj.linkedPriorityIds.length > 0) ||
      (bObj.linkedPriorityIds && bObj.linkedPriorityIds.length > 0) ||
      (lObj.linkedObjectiveIds && lObj.linkedObjectiveIds.length > 0);

    if (hasExplicitLinks) {
      if (bObj.linkedObjectiveIds?.includes(lObj.id) || lObj.linkedObjectiveIds?.includes(bObj.id)) {
        return 'primary';
      }
      if (bObj.linkedPriorityIds?.includes(lObj.id) || lObj.linkedPriorityIds?.includes(bObj.id)) {
        return 'primary';
      }
      return 'none';
    }

    const bCodeClean = (bObj.code || '').replace(/[^0-9]/g, '');
    const lCodeClean = (lObj.code || '').replace(/[^0-9]/g, '');
    if (bCodeClean && lCodeClean && (bCodeClean === lCodeClean || bCodeClean.startsWith(lCodeClean) || lCodeClean.startsWith(bCodeClean))) {
      return 'primary';
    }
    return 'none';
  };

  // Helper to determine correlation state for Northeast Grid (Top Priorities vs Right KPIs & Resources)
  const getNortheastKpiCorrelation = (p: ImprovementPriority, kpi: KpiItem, pIndex: number, kIndex: number) => {
    const cellKey = `nekpi_${p.id}_${kpi.id}`;
    if (manualCorrelations[cellKey]) return manualCorrelations[cellKey];

    if (kpi.linkedPriorityIds && kpi.linkedPriorityIds.length > 0) {
      return kpi.linkedPriorityIds.includes(p.id) ? 'primary' : 'none';
    }

    if (kpi.code === p.code || p.id === kpi.id) {
      return 'primary';
    }
    const pCodeClean = (p.code || '').replace(/[^0-9]/g, '');
    const kpiCodeClean = (kpi.code || '').replace(/[^0-9]/g, '');
    if (pCodeClean && kpiCodeClean && (pCodeClean.startsWith(kpiCodeClean) || kpiCodeClean.startsWith(pCodeClean))) {
      return 'primary';
    }
    return 'none';
  };

  const getNortheastResourceCorrelation = (p: ImprovementPriority, res: ResourcePerson, pIndex: number, rIndex: number) => {
    const cellKey = `neres_${p.id}_${res.key}`;
    if (manualCorrelations[cellKey]) return manualCorrelations[cellKey];

    // Priority explicit resource roles
    if (p.resourceRoles && p.resourceRoles[res.key]) {
      const role = p.resourceRoles[res.key];
      if (role && role !== 'none') return role;
    }

    // Check if any KPI correlated with p has this resource as primary/secondary
    const matchedKpis = rightKpiItems.filter(
      (k) => k.linkedPriorityIds?.includes(p.id) || k.code === p.code || p.id === k.id
    );
    for (const k of matchedKpis) {
      const role = k.resourceRoles?.[res.key];
      if (role === 'primary') return 'primary';
      if (role === 'secondary') return 'secondary';
    }

    // Priority owner match
    if (p.owner) {
      const ownerLower = p.owner.toLowerCase();
      const resNameLower = res.name.toLowerCase();
      const resDeptLower = res.department.toLowerCase();
      const resKeyLower = res.key.toLowerCase();
      if (ownerLower.includes(resNameLower) || ownerLower.includes(resDeptLower) || ownerLower.includes(resKeyLower)) {
        return 'primary';
      }
    }

    return 'none';
  };

  // Helper to determine Primary Responsible Persons/Depts (calculated from Dot tròn đậm ●)
  const getPrimaryPicList = (kpi: KpiItem) => {
    const allResources = (displayedResources && displayedResources.length > 0) ? displayedResources : (data.resources || []);
    const allPriorities = (displayedPriorities && displayedPriorities.length > 0) ? displayedPriorities : (data.priorities || []);
    const pics: { key: string; department: string; name: string; fullTitle?: string }[] = [];

    // 1. Find linked priorities from the top arm (via links, codes, or matrix cell)
    const linkedPriorities = allPriorities.filter((p) => {
      if (manualCorrelations[`nekpi_${p.id}_${kpi.id}`] === 'primary') return true;
      if (kpi.linkedPriorityIds?.includes(p.id)) return true;
      if (p.id === kpi.id || p.code === kpi.code) return true;
      const pCodeClean = (p.code || '').replace(/[^0-9]/g, '');
      const kpiCodeClean = (kpi.code || '').replace(/[^0-9]/g, '');
      if (pCodeClean && kpiCodeClean && (pCodeClean.startsWith(kpiCodeClean) || kpiCodeClean.startsWith(pCodeClean))) {
        return true;
      }
      return false;
    });

    // 2. Check each linked priority's row in the Northeast grid (amber area) for Dot tròn đậm ●
    linkedPriorities.forEach((p) => {
      const pIdx = topItems.findIndex((item) => item.id === p.id);
      allResources.forEach((res, rIdx) => {
        const corr = getNortheastResourceCorrelation(p, res, pIdx >= 0 ? pIdx : 0, rIdx);
        if (corr === 'primary' && !pics.some((pic) => pic.key.toLowerCase() === res.key.toLowerCase())) {
          pics.push({
            key: res.key,
            department: res.department,
            name: res.name,
            fullTitle: res.fullTitle || `${res.department}: ${res.name}`,
          });
        }
      });
    });

    // 3. Check direct primary in kpi.resourceRoles
    if (kpi.resourceRoles) {
      Object.entries(kpi.resourceRoles).forEach(([resKey, role]) => {
        if (role === 'primary') {
          const res = allResources.find((r) => r.key.toLowerCase() === resKey.toLowerCase());
          if (res && !pics.some((pic) => pic.key.toLowerCase() === res.key.toLowerCase())) {
            pics.push({
              key: res.key,
              department: res.department,
              name: res.name,
              fullTitle: res.fullTitle || `${res.department}: ${res.name}`,
            });
          } else if (!res && !pics.some((pic) => pic.key.toLowerCase() === resKey.toLowerCase())) {
            pics.push({
              key: resKey,
              department: resKey.toUpperCase(),
              name: resKey.toUpperCase(),
              fullTitle: resKey.toUpperCase(),
            });
          }
        }
      });
    }

    // 4. Fallback to kpi.owner
    if (pics.length === 0 && kpi.owner) {
      const ownerLower = kpi.owner.toLowerCase();
      const matchedRes = allResources.find(
        (r) =>
          ownerLower.includes(r.name.toLowerCase()) ||
          ownerLower.includes(r.department.toLowerCase()) ||
          ownerLower.includes(r.key.toLowerCase())
      );
      if (matchedRes) {
        pics.push({
          key: matchedRes.key,
          department: matchedRes.department,
          name: matchedRes.name,
          fullTitle: matchedRes.fullTitle || `${matchedRes.department}: ${matchedRes.name}`,
        });
      } else {
        pics.push({
          key: 'owner',
          department: kpi.department || 'PIC',
          name: kpi.owner,
          fullTitle: kpi.owner,
        });
      }
    }

    return pics;
  };

  // Interactive toggle cell state with full persistence to server and local state
  const handleToggleCell = (
    key: string,
    currentValue: 'primary' | 'secondary' | 'none',
    kpiToUpdate?: KpiItem,
    priorityId?: string,
    priorityToUpdate?: ImprovementPriority,
    resourceKey?: string,
    objectiveToUpdate?: BreakthroughObjective,
    targetObjId?: string
  ) => {
    let nextValue: 'primary' | 'secondary' | 'none' = 'none';
    if (currentValue === 'none') nextValue = 'primary';
    else if (currentValue === 'primary') nextValue = 'secondary';
    else nextValue = 'none';

    setManualCorrelations((prev) => ({
      ...prev,
      [key]: nextValue,
    }));

    if (onUpdateCorrelation) {
      onUpdateCorrelation(key, nextValue);
    }

    // 1. If toggling a Resource Role (Amber Northeast cell)
    if (priorityToUpdate && resourceKey) {
      const updatedRoles = {
        ...(priorityToUpdate.resourceRoles || {}),
        [resourceKey]: nextValue,
      };
      const updatedP: ImprovementPriority = {
        ...priorityToUpdate,
        resourceRoles: updatedRoles,
      };
      onEditPriority(updatedP, data.level);

      // If user marks resource as primary for this priority, also sync to linked KPIs if applicable
      if (nextValue === 'primary') {
        const linkedKpis = (data.kpis || []).filter(
          (k) => k.linkedPriorityIds?.includes(priorityToUpdate.id) || k.id === priorityToUpdate.id || k.code === priorityToUpdate.code
        );
        linkedKpis.forEach((k) => {
          const kRoles = { ...(k.resourceRoles || {}), [resourceKey]: 'primary' };
          onUpdateKpi({ ...k, resourceRoles: kRoles });
        });
      }
    }

    // 2. If toggling a KPI link (Northeast KPI cell)
    if (kpiToUpdate && priorityId) {
      const currentLinks = kpiToUpdate.linkedPriorityIds || [];
      let updatedLinks = currentLinks;
      if (nextValue === 'primary') {
        if (!updatedLinks.includes(priorityId)) updatedLinks = [...updatedLinks, priorityId];
      } else if (nextValue === 'none') {
        updatedLinks = updatedLinks.filter((id) => id !== priorityId);
      }
      onUpdateKpi({
        ...kpiToUpdate,
        linkedPriorityIds: updatedLinks,
      });

      if (priorityToUpdate) {
        const pLinks = priorityToUpdate.linkedPriorityIds || [];
        let updatedPLinks = pLinks;
        if (nextValue === 'primary') {
          if (!updatedPLinks.includes(kpiToUpdate.id)) updatedPLinks = [...updatedPLinks, kpiToUpdate.id];
        } else if (nextValue === 'none') {
          updatedPLinks = updatedPLinks.filter((id) => id !== kpiToUpdate.id);
        }
        onEditPriority({ ...priorityToUpdate, linkedPriorityIds: updatedPLinks }, data.level);
      }
    }

    // 3. If toggling a Northwest Priority vs Objective link
    if (priorityToUpdate && targetObjId && !resourceKey) {
      const links = priorityToUpdate.linkedObjectiveIds || [];
      let updatedLinks = links;
      if (nextValue === 'primary') {
        if (!updatedLinks.includes(targetObjId)) updatedLinks = [...updatedLinks, targetObjId];
      } else if (nextValue === 'none') {
        updatedLinks = updatedLinks.filter((id) => id !== targetObjId);
      }
      onEditPriority({ ...priorityToUpdate, linkedObjectiveIds: updatedLinks }, data.level);
    }

    // 4. If toggling a Southwest Objective link
    if (objectiveToUpdate && targetObjId) {
      const links = objectiveToUpdate.linkedObjectiveIds || [];
      let updatedLinks = links;
      if (nextValue === 'primary') {
        if (!updatedLinks.includes(targetObjId)) updatedLinks = [...updatedLinks, targetObjId];
      } else if (nextValue === 'none') {
        updatedLinks = updatedLinks.filter((id) => id !== targetObjId);
      }
      onEditObjective({ ...objectiveToUpdate, linkedObjectiveIds: updatedLinks }, true, data.level);
    }
  };

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  // =========================================================================
  // 4-AXIS ALIGNMENT ENGINE AROUND CENTER COMPASS BASED ON BOLD "X" LINKS
  // When hovering or clicking any item in any of the 4 arms, compute the entire
  // chain of linked items around the compass based on bold 'X' (and role dot) links.
  // =========================================================================
  const linkedElements = useMemo(() => {
    // 1. Identify active item(s) from direct hover or selection
    const activeTopItem =
      hoveredTopRowIndex !== null
        ? topItems[hoveredTopRowIndex]
        : selectedTopRowId
        ? topItems.find((p) => p.id === selectedTopRowId)
        : null;

    const activeLeftItem =
      hoveredLeftColIndex !== null
        ? leftItems[hoveredLeftColIndex]
        : selectedLeftColId
        ? leftItems.find((l) => l.id === selectedLeftColId)
        : null;

    const activeBottomItem =
      hoveredBottomRowIndex !== null
        ? bottomItems[hoveredBottomRowIndex]
        : selectedBottomRowId
        ? bottomItems.find((b: any) => b.id === selectedBottomRowId)
        : null;

    let activeRightKpi: KpiItem | null = null;
    let activeRightRes: ResourcePerson | null = null;
    if (hoveredRightColIndex !== null) {
      if (hoveredRightColIndex < rightKpiItems.length) {
        activeRightKpi = rightKpiItems[hoveredRightColIndex] || null;
      } else {
        activeRightRes = rightResourceItems[hoveredRightColIndex - rightKpiItems.length] || null;
      }
    } else if (selectedRightColId) {
      activeRightKpi = rightKpiItems.find((k) => k.id === selectedRightColId) || null;
      activeRightRes = rightResourceItems.find((r) => r.key === selectedRightColId) || null;
    }

    const linkedTopIds = new Set<string>();
    const linkedLeftIds = new Set<string>();
    const linkedBottomIds = new Set<string>();
    const linkedKpiIds = new Set<string>();
    const linkedResourceKeys = new Set<string>();
    const linkedCellKeys = new Set<string>();

    const hasActive = !!(activeTopItem || activeLeftItem || activeBottomItem || activeRightKpi || activeRightRes);

    if (!hasActive) {
      return {
        hasActive: false,
        topIds: linkedTopIds,
        leftIds: linkedLeftIds,
        bottomIds: linkedBottomIds,
        kpiIds: linkedKpiIds,
        resourceKeys: linkedResourceKeys,
        cellKeys: linkedCellKeys,
        activeTopId: null,
        activeLeftId: null,
        activeBottomId: null,
        activeRightKpiId: null,
        activeRightResKey: null,
        compassActiveBranches: { north: false, west: false, south: false, east: false },
      };
    }

    // --- CASE 1: Active item is in NORTH ARM (Top Improvement Priority) ---
    if (activeTopItem) {
      linkedTopIds.add(activeTopItem.id);
      const pIndex = topItems.findIndex((p) => p.id === activeTopItem.id);

      // Links to West Arm (Annual Objectives) via Northwest Grid (Bold X)
      leftItems.forEach((lObj, lIndex) => {
        const corr = getNorthwestCorrelation(activeTopItem, lObj, pIndex, lIndex);
        if (corr !== 'none') {
          linkedLeftIds.add(lObj.id);
          linkedCellKeys.add(`nw_${activeTopItem.id}_${lObj.id}`);

          // Trace through West Arm to South Arm (3-Year Objectives) via Southwest Grid (Bold X)
          bottomItems.forEach((bItem: any, bIndex: number) => {
            const swCorr = getSouthwestCorrelation(bItem, lObj, bIndex, lIndex);
            if (swCorr !== 'none') {
              linkedBottomIds.add(bItem.id);
              linkedCellKeys.add(`sw_${bItem.id}_${lObj.id}`);
            }
          });
        }
      });

      // Links to East Arm (KPIs) via Northeast Grid (Bold X)
      rightKpiItems.forEach((kpi, kIndex) => {
        const corr = getNortheastKpiCorrelation(activeTopItem, kpi, pIndex, kIndex);
        if (corr !== 'none') {
          linkedKpiIds.add(kpi.id);
          linkedCellKeys.add(`nekpi_${activeTopItem.id}_${kpi.id}`);
        }
      });

      // Links to East Arm (Resources) via Northeast Grid (Owner Dots)
      rightResourceItems.forEach((res, rIndex) => {
        const corr = getNortheastResourceCorrelation(activeTopItem, res, pIndex, rIndex);
        if (corr !== 'none') {
          linkedResourceKeys.add(res.key);
          linkedCellKeys.add(`neres_${activeTopItem.id}_${res.key}`);
        }
      });
    }

    // --- CASE 2: Active item is in WEST ARM (Left Annual Objective) ---
    if (activeLeftItem) {
      linkedLeftIds.add(activeLeftItem.id);
      const lIndex = leftItems.findIndex((l) => l.id === activeLeftItem.id);

      // Links to North Arm (Priorities) via Northwest Grid (Bold X)
      topItems.forEach((p, pIndex) => {
        const corr = getNorthwestCorrelation(p, activeLeftItem, pIndex, lIndex);
        if (corr !== 'none') {
          linkedTopIds.add(p.id);
          linkedCellKeys.add(`nw_${p.id}_${activeLeftItem.id}`);

          // Trace to East Arm (KPIs & Resources)
          rightKpiItems.forEach((kpi, kIndex) => {
            const kCorr = getNortheastKpiCorrelation(p, kpi, pIndex, kIndex);
            if (kCorr !== 'none') {
              linkedKpiIds.add(kpi.id);
              linkedCellKeys.add(`nekpi_${p.id}_${kpi.id}`);
            }
          });

          rightResourceItems.forEach((res, rIndex) => {
            const rCorr = getNortheastResourceCorrelation(p, res, pIndex, rIndex);
            if (rCorr !== 'none') {
              linkedResourceKeys.add(res.key);
              linkedCellKeys.add(`neres_${p.id}_${res.key}`);
            }
          });
        }
      });

      // Links to South Arm (3-Year Objectives) via Southwest Grid (Bold X)
      bottomItems.forEach((bItem: any, bIndex: number) => {
        const swCorr = getSouthwestCorrelation(bItem, activeLeftItem, bIndex, lIndex);
        if (swCorr !== 'none') {
          linkedBottomIds.add(bItem.id);
          linkedCellKeys.add(`sw_${bItem.id}_${activeLeftItem.id}`);
        }
      });
    }

    // --- CASE 3: Active item is in SOUTH ARM (Bottom 3-Year Objective) ---
    if (activeBottomItem) {
      linkedBottomIds.add(activeBottomItem.id);
      const bIndex = bottomItems.findIndex((b: any) => b.id === activeBottomItem.id);

      // Links to West Arm (Annual Objectives) via Southwest Grid (Bold X)
      leftItems.forEach((lObj, lIndex) => {
        const corr = getSouthwestCorrelation(activeBottomItem, lObj, bIndex, lIndex);
        if (corr !== 'none') {
          linkedLeftIds.add(lObj.id);
          linkedCellKeys.add(`sw_${activeBottomItem.id}_${lObj.id}`);

          // Trace through West Arm to North Arm (Priorities) via Northwest Grid (Bold X)
          topItems.forEach((p, pIndex) => {
            const nwCorr = getNorthwestCorrelation(p, lObj, pIndex, lIndex);
            if (nwCorr !== 'none') {
              linkedTopIds.add(p.id);
              linkedCellKeys.add(`nw_${p.id}_${lObj.id}`);

              // Trace to East Arm
              rightKpiItems.forEach((kpi, kIndex) => {
                const kCorr = getNortheastKpiCorrelation(p, kpi, pIndex, kIndex);
                if (kCorr !== 'none') {
                  linkedKpiIds.add(kpi.id);
                  linkedCellKeys.add(`nekpi_${p.id}_${kpi.id}`);
                }
              });

              rightResourceItems.forEach((res, rIndex) => {
                const rCorr = getNortheastResourceCorrelation(p, res, pIndex, rIndex);
                if (rCorr !== 'none') {
                  linkedResourceKeys.add(res.key);
                  linkedCellKeys.add(`neres_${p.id}_${res.key}`);
                }
              });
            }
          });
        }
      });
    }

    // --- CASE 4: Active item is in EAST ARM (KPI Target) ---
    if (activeRightKpi) {
      linkedKpiIds.add(activeRightKpi.id);
      const kIndex = rightKpiItems.findIndex((k) => k.id === activeRightKpi.id);

      // Links to North Arm (Priorities) via Northeast Grid (Bold X)
      topItems.forEach((p, pIndex) => {
        const corr = getNortheastKpiCorrelation(p, activeRightKpi, pIndex, kIndex);
        if (corr !== 'none') {
          linkedTopIds.add(p.id);
          linkedCellKeys.add(`nekpi_${p.id}_${activeRightKpi.id}`);

          // Trace to West Arm (Annual Objectives)
          leftItems.forEach((lObj, lIndex) => {
            const nwCorr = getNorthwestCorrelation(p, lObj, pIndex, lIndex);
            if (nwCorr !== 'none') {
              linkedLeftIds.add(lObj.id);
              linkedCellKeys.add(`nw_${p.id}_${lObj.id}`);

              // Trace to South Arm (3-Year Objectives)
              bottomItems.forEach((bItem: any, bIndex: number) => {
                const swCorr = getSouthwestCorrelation(bItem, lObj, bIndex, lIndex);
                if (swCorr !== 'none') {
                  linkedBottomIds.add(bItem.id);
                  linkedCellKeys.add(`sw_${bItem.id}_${lObj.id}`);
                }
              });
            }
          });

          // Trace to sibling Resources
          rightResourceItems.forEach((res, rIndex) => {
            const rCorr = getNortheastResourceCorrelation(p, res, pIndex, rIndex);
            if (rCorr !== 'none') {
              linkedResourceKeys.add(res.key);
              linkedCellKeys.add(`neres_${p.id}_${res.key}`);
            }
          });
        }
      });
    }

    // --- CASE 5: Active item is in EAST ARM (Resource / Owner) ---
    if (activeRightRes) {
      linkedResourceKeys.add(activeRightRes.key);
      const rIndex = rightResourceItems.findIndex((r) => r.key === activeRightRes.key);

      // Links to North Arm (Priorities)
      topItems.forEach((p, pIndex) => {
        const corr = getNortheastResourceCorrelation(p, activeRightRes, pIndex, rIndex);
        if (corr !== 'none') {
          linkedTopIds.add(p.id);
          linkedCellKeys.add(`neres_${p.id}_${activeRightRes.key}`);

          // Trace to West Arm
          leftItems.forEach((lObj, lIndex) => {
            const nwCorr = getNorthwestCorrelation(p, lObj, pIndex, lIndex);
            if (nwCorr !== 'none') {
              linkedLeftIds.add(lObj.id);
              linkedCellKeys.add(`nw_${p.id}_${lObj.id}`);

              bottomItems.forEach((bItem: any, bIndex: number) => {
                const swCorr = getSouthwestCorrelation(bItem, lObj, bIndex, lIndex);
                if (swCorr !== 'none') {
                  linkedBottomIds.add(bItem.id);
                  linkedCellKeys.add(`sw_${bItem.id}_${lObj.id}`);
                }
              });
            }
          });

          // Trace to KPIs
          rightKpiItems.forEach((kpi, kIndex) => {
            const kCorr = getNortheastKpiCorrelation(p, kpi, pIndex, kIndex);
            if (kCorr !== 'none') {
              linkedKpiIds.add(kpi.id);
              linkedCellKeys.add(`nekpi_${p.id}_${kpi.id}`);
            }
          });
        }
      });
    }

    return {
      hasActive: true,
      topIds: linkedTopIds,
      leftIds: linkedLeftIds,
      bottomIds: linkedBottomIds,
      kpiIds: linkedKpiIds,
      resourceKeys: linkedResourceKeys,
      cellKeys: linkedCellKeys,
      activeTopId: activeTopItem?.id || null,
      activeLeftId: activeLeftItem?.id || null,
      activeBottomId: activeBottomItem?.id || null,
      activeRightKpiId: activeRightKpi?.id || null,
      activeRightResKey: activeRightRes?.key || null,
      compassActiveBranches: {
        north: linkedTopIds.size > 0,
        west: linkedLeftIds.size > 0,
        south: linkedBottomIds.size > 0,
        east: linkedKpiIds.size > 0 || linkedResourceKeys.size > 0,
      },
    };
  }, [
    hoveredTopRowIndex,
    selectedTopRowId,
    hoveredLeftColIndex,
    selectedLeftColId,
    hoveredBottomRowIndex,
    selectedBottomRowId,
    hoveredRightColIndex,
    selectedRightColId,
    topItems,
    leftItems,
    bottomItems,
    rightKpiItems,
    rightResourceItems,
    manualCorrelations,
  ]);

  return (
    <div
      id="amplon-xmatrix-root"
      className={`bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 p-6 bg-slate-50 overflow-auto' : ''
      }`}
    >
      {/* Top Toolbar: Amplon Brand Info, Zoom & Action Controls */}
      <div className="bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none sticky top-14 z-30 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-extrabold text-sm text-slate-800 tracking-tight">
              AMPLON HOSHIN KANRI X-MATRIX
            </span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700">
            {data.level} Deployment
          </span>
          <span className="text-xs text-slate-500 hidden md:inline">
            Owner: <strong className="text-slate-800">{data.owner || 'Samho Management'}</strong> | Rev: {data.revDate || '2026-03'}
          </span>
        </div>

        {/* Legend Quick Reference: Dot 'x' for 4-axis, Solid circle for Primary Owner, Hollow circle for Secondary */}
        <div className="hidden xl:flex items-center space-x-3 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 shadow-2xs">
          <div className="flex items-center space-x-1.5" title={isVi ? 'Liên kết 4 trục (Đông - Tây - Nam - Bắc): Dot "x"' : '4-Axis Link (Dot "x")'}>
            <span className="font-black text-slate-900 text-sm leading-none">✕</span>
            <span className="text-[11px] font-medium">{isVi ? 'Liên kết 4 trục (Dot x)' : '4-Axis Link (Dot x)'}</span>
          </div>
          <div className="w-px h-3.5 bg-slate-200"></div>
          <div className="flex items-center space-x-1.5" title={isVi ? 'Người phụ trách: Trách nhiệm chính (Tròn đậm ●)' : 'Primary Owner (Solid circle ●)'}>
            <span className="w-3 h-3 rounded-full bg-slate-900 inline-block shadow-2xs"></span>
            <span className="text-[11px] font-medium">{isVi ? 'Chính (Tròn đậm)' : 'Primary (Solid)'}</span>
          </div>
          <div className="flex items-center space-x-1.5" title={isVi ? 'Người phụ trách: Trách nhiệm phụ (Tròn khuyết ○)' : 'Secondary / Support (Hollow circle ○)'}>
            <span className="w-3 h-3 rounded-full border-2 border-slate-900 bg-white inline-block"></span>
            <span className="text-[11px] font-medium">{isVi ? 'Phụ (Tròn khuyết)' : 'Support (Hollow)'}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Horizontal Quick Pan Buttons to easily navigate to Left, Center X, and Right */}
          <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-0.5 text-xs shadow-2xs">
            <button
              onClick={scrollToLeft}
              className="px-2 py-1 hover:bg-slate-100 rounded text-slate-700 font-medium transition cursor-pointer flex items-center gap-1"
              title={isVi ? 'Cuộn sang bên trái (Trục Tây & Liên kết)' : 'Scroll Left (West Arm)'}
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">{isVi ? 'Trục Tây (Trái)' : 'West'}</span>
            </button>
            <button
              onClick={scrollToCenterX}
              className="px-2 py-1 hover:bg-emerald-50 rounded text-emerald-800 font-bold transition cursor-pointer border-x border-slate-200"
              title={isVi ? 'Căn giữa tâm ma trận (X)' : 'Center X'}
            >
              🎯 X
            </button>
            <button
              onClick={scrollToRight}
              className="px-2 py-1 hover:bg-slate-100 rounded text-slate-700 font-medium transition cursor-pointer flex items-center gap-1"
              title={isVi ? 'Cuộn sang bên phải (Trục Đông & Nhân sự)' : 'Scroll Right (East Arm)'}
            >
              <span className="hidden sm:inline">{isVi ? 'Trục Đông (Phải)' : 'East'}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

          {/* Square Compass & Vertical Height Controller */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs p-0.5 text-xs">
            <span className="px-2 text-[11px] font-semibold text-emerald-800 hidden sm:inline flex items-center gap-1">
              <span>📐 {isVi ? 'La bàn vuông:' : 'Square Compass:'}</span>
            </span>
            <button
              onClick={() => setCompassSquareSize((s) => Math.max(280, s - 20))}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 transition cursor-pointer"
              title={isVi ? 'Thu nhỏ hình vuông (-20px)' : 'Smaller Square (-20px)'}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] font-bold text-emerald-800">
              {compassSquareSize}px
            </span>
            <button
              onClick={() => setCompassSquareSize((s) => Math.min(520, s + 20))}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 transition cursor-pointer"
              title={isVi ? 'Tăng chiều cao & ô vuông (+20px)' : 'Taller Square (+20px)'}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center border-l border-slate-200 ml-0.5 pl-0.5 space-x-0.5">
              <button
                onClick={() => setCompassSquareSize(340)}
                className={`px-1.5 py-0.5 text-[10px] font-semibold rounded transition cursor-pointer ${
                  compassSquareSize === 340 ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-100'
                }`}
                title={isVi ? 'Vuông 340px' : 'Compact 340px'}
              >
                340px
              </button>
              <button
                onClick={() => setCompassSquareSize(380)}
                className={`px-1.5 py-0.5 text-[10px] font-semibold rounded transition cursor-pointer ${
                  compassSquareSize === 380 ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-100'
                }`}
                title={isVi ? 'Vuông chuẩn 380px' : 'Standard 380px'}
              >
                {isVi ? 'Chuẩn (380px)' : '380px'}
              </button>
              <button
                onClick={() => setCompassSquareSize(420)}
                className={`px-1.5 py-0.5 text-[10px] font-semibold rounded transition cursor-pointer ${
                  compassSquareSize === 420 ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-100'
                }`}
                title={isVi ? 'Vuông thoáng 420px' : 'Large 420px'}
              >
                420px
              </button>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs p-0.5 text-xs">
            <button
              onClick={() => setZoomScale((s) => Math.max(0.65, +(s - 0.1).toFixed(2)))}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition cursor-pointer"
              title={isVi ? 'Thu nhỏ' : 'Zoom Out'}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] font-semibold text-slate-700">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={() => setZoomScale((s) => Math.min(1.35, +(s + 0.1).toFixed(2)))}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition cursor-pointer"
              title={isVi ? 'Phóng to' : 'Zoom In'}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomScale(1.0)}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition cursor-pointer border-l border-slate-200"
              title={isVi ? 'Tỷ lệ mặc định (100%)' : 'Reset Zoom'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={fitToScreen}
              className="px-2 py-1 hover:bg-blue-50 text-blue-700 font-semibold rounded transition cursor-pointer border-l border-slate-200 flex items-center gap-1 text-[11px]"
              title={isVi ? 'Tự động co giãn vừa vặn chiều rộng màn hình' : 'Fit to screen width'}
            >
              <Scan className="w-3 h-3 text-blue-600" />
              <span>{isVi ? 'Vừa màn hình' : 'Fit'}</span>
            </button>
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg shadow-2xs transition cursor-pointer"
            title={isVi ? 'In ấn / Xuất tài liệu' : 'Print / Export'}
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">{isVi ? 'In' : 'Print'}</span>
          </button>

          {/* Quick Jump to Target to Improve Table */}
          <a
            href="#amplon-targets-table"
            className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg shadow-2xs transition cursor-pointer"
            title={isVi ? 'Cuộn nhanh xuống Bảng Mục Tiêu Cải Thiện' : 'Jump to Targets to Improve table'}
          >
            <Target className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">{isVi ? 'Bảng Mục Tiêu' : 'Targets Table'}</span>
          </a>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition cursor-pointer"
            title={isFullscreen ? (isVi ? 'Thu nhỏ cửa sổ' : 'Exit Fullscreen') : (isVi ? 'Toàn màn hình' : 'Fullscreen')}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main X-Matrix Viewport with Horizontal scroll */}
      <div
        ref={scrollContainerRef}
        className="w-full overflow-x-auto p-3 sm:p-4 bg-slate-100/70"
      >
        <div
          style={{
            transform: `scale(${zoomScale})`,
            transformOrigin: 'top left',
            transition: 'transform 0.15s ease-out',
            width: zoomScale > 1 ? `${zoomScale * 100}%` : 'max-content',
          }}
          className="min-w-max mx-auto bg-white p-5 rounded-lg border border-slate-300 shadow-sm block"
        >
          {/* THE 3x3 AMPLON HOSHIN KANRI MATRIX TABLE */}
          <table className="border-collapse select-none text-slate-800">
            <thead>
              <tr className="bg-slate-50 text-slate-700 text-xs border-b border-slate-300">
                {/* 1. Above West Arm / Left Columns: Northwest correlation header */}
                <th
                  colSpan={Math.max(1, leftItems.length)}
                  className="p-2 border border-slate-300 bg-slate-100/90 text-center align-middle"
                >
                  <div className="flex items-center justify-center">
                    <span className="font-extrabold text-[11px] text-blue-700 uppercase tracking-wider bg-blue-50 border border-blue-200 px-2 py-0.5 rounded shadow-2xs flex items-center gap-1">
                      <span className="font-black text-xs leading-none">✕</span>
                      <span>{isVi ? 'Dot "x" liên kết' : 'Dot "x" Link'}</span>
                    </span>
                  </div>
                </th>

                {/* 2. Above North Arm / Top Priorities */}
                <th
                  style={{ width: `${compassSquareSize}px`, minWidth: `${compassSquareSize}px`, maxWidth: `${compassSquareSize}px` }}
                  className="p-2 border border-slate-300 bg-slate-800 text-white text-center align-middle"
                >
                  <span className="font-bold text-xs uppercase tracking-wide">
                    {compassLabels.topVi}
                  </span>
                </th>

                {/* 3. Above East Arm / KPIs (Target to Improve) */}
                <th
                  colSpan={Math.max(1, rightKpiItems.length)}
                  className="p-2 border border-slate-300 bg-slate-100/95 text-center align-middle"
                >
                  <div className="flex items-center justify-between gap-2 px-1">
                    <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wider">
                      {isVi ? 'Mục tiêu cải thiện (Target to improve / KPIs)' : 'Targets to Improve (KPIs)'}
                    </span>
                    <span className="font-extrabold text-[10px] text-blue-700 uppercase bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded shadow-2xs flex items-center gap-1">
                      <span className="font-black text-xs leading-none">✕</span>
                      <span>Link</span>
                    </span>
                  </div>
                </th>

                {/* 4. Above East Arm / Resources (PIC AREA - Distinct Amber / Warm Theme) */}
                <th
                  colSpan={Math.max(1, rightResourceItems.length)}
                  className="p-2 border-t border-b border-r border-amber-300 border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-100 to-amber-200/90 text-center align-middle shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded bg-amber-500 text-white shadow-2xs">
                        <Users className="w-3.5 h-3.5" />
                      </span>
                      <div className="text-left">
                        <span className="font-black text-xs text-amber-950 uppercase tracking-wider block">
                          {isVi ? 'KHU VỰC PIC (NGƯỜI PHỤ TRÁCH)' : 'PIC AREA (PERSON IN CHARGE)'}
                        </span>
                        <span className="text-[9px] text-amber-800 font-semibold hidden md:inline-block">
                          {isVi ? 'Phân công trách nhiệm theo phòng ban' : 'Responsibility Assignment'}
                        </span>
                      </div>
                      <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold text-amber-900 bg-white/90 border border-amber-300 px-1.5 py-0.5 rounded shadow-2xs">
                        <span className="inline-flex items-center gap-0.5">
                          <span className="w-2 h-2 rounded-full bg-slate-900 inline-block"></span>
                          <span>{isVi ? 'Chính' : 'Main'}</span>
                        </span>
                        <span className="text-amber-300">|</span>
                        <span className="inline-flex items-center gap-0.5">
                          <span className="w-2 h-2 rounded-full border border-slate-800 bg-white inline-block"></span>
                          <span>{isVi ? 'Phụ' : 'Sec'}</span>
                        </span>
                      </span>
                    </div>
                    <button
                      onClick={() => onAddResource()}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-950 bg-amber-300 hover:bg-amber-400 border border-amber-500 px-2 py-0.5 rounded shadow-2xs transition cursor-pointer shrink-0"
                      title={isVi ? 'Thêm nhân sự PIC' : 'Add PIC Resource'}
                    >
                      <Plus className="w-3 h-3 text-amber-950" />
                      <span>{isVi ? '+ PIC' : '+ Add'}</span>
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* ============================================================== */}
              {/* ROW 1: NORTHWEST GRID (NW) | NORTH ARM (TOP) | NORTHEAST GRID (NE) */}
              {/* ============================================================== */}
              {topItems.map((priority, pIndex) => {
                const isTopRowDirect = hoveredTopRowIndex === pIndex || selectedTopRowId === priority.id;
                const isTopRowLinked = linkedElements.topIds.has(priority.id);
                const isTopRowHovered = isTopRowDirect || isTopRowLinked;

                return (
                  <tr
                    key={`top_row_${priority.id}`}
                    onMouseEnter={() => setHoveredTopRowIndex(pIndex)}
                    onMouseLeave={() => setHoveredTopRowIndex(null)}
                    className={`transition-colors ${
                      isTopRowDirect
                        ? 'bg-sky-100/90'
                        : isTopRowLinked
                        ? 'bg-sky-50/90'
                        : pIndex % 2 === 0
                        ? 'bg-white'
                        : 'bg-slate-50/50'
                    }`}
                  >
                    {/* NORTHWEST GRID: Left Columns (Annual Objectives) intersect Top Rows (Priorities) */}
                    {leftItems.map((lObj, lIndex) => {
                      const isColDirect = hoveredLeftColIndex === lIndex || selectedLeftColId === lObj.id;
                      const isColLinked = linkedElements.leftIds.has(lObj.id);
                      const isColHovered = isColDirect || isColLinked;
                      const isIntersect = isTopRowDirect && isColDirect;
                      const cellKey = `nw_${priority.id}_${lObj.id}`;
                      const isCellLinked = linkedElements.cellKeys.has(cellKey);
                      const correlation = getNorthwestCorrelation(priority, lObj, pIndex, lIndex);

                      return (
                        <td
                          key={cellKey}
                          onClick={() => handleToggleCell(cellKey, correlation, undefined, undefined, priority, undefined, undefined, lObj.id)}
                          onMouseEnter={() => {
                            setHoveredTopRowIndex(pIndex);
                            setHoveredLeftColIndex(lIndex);
                          }}
                          onMouseLeave={() => {
                            setHoveredTopRowIndex(null);
                            setHoveredLeftColIndex(null);
                          }}
                          className={`w-11 h-9 border border-slate-200 text-center align-middle cursor-pointer transition-all p-0 ${
                            isIntersect
                              ? 'bg-amber-200/95 ring-2 ring-amber-500 shadow-xs z-10'
                              : isCellLinked
                              ? 'bg-sky-200/95 ring-1.5 ring-sky-500 shadow-xs z-10'
                              : isTopRowDirect || isColDirect
                              ? 'bg-sky-100/70'
                              : isTopRowHovered || isColHovered
                              ? 'bg-sky-50/70'
                              : 'hover:bg-slate-100'
                          }`}
                          title={`${priority.code} ↔ ${lObj.code}: ${
                            correlation === 'primary' ? (isVi ? 'Liên kết chính (●)' : 'Primary Alignment (●)') : correlation === 'secondary' ? (isVi ? 'Liên kết bổ trợ (○)' : 'Secondary Alignment (○)') : (isVi ? 'Chưa liên kết' : 'None')
                          } (${isVi ? 'Nhấp để đổi' : 'Click to toggle'})`}
                        >
                          <div className="flex items-center justify-center w-full h-full">
                            {correlation === 'primary' && (
                              <span
                                className={`select-none inline-block leading-none transition-transform ${
                                  isCellLinked || isIntersect
                                    ? 'text-slate-950 text-base scale-125'
                                    : 'text-slate-900 text-sm'
                                }`}
                              >
                                ●
                              </span>
                            )}
                            {correlation === 'secondary' && (
                              <span
                                className={`select-none inline-block leading-none transition-transform ${
                                  isCellLinked || isIntersect
                                    ? 'text-slate-900 text-sm scale-110'
                                    : 'text-slate-500 text-xs opacity-80'
                                }`}
                              >
                                ○
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* NORTH ARM: TOP SECTION ITEM (Row of Improvement Priority / Project) */}
                    {(() => {
                      const priorityColor = getCompassItemTextColor(priority, 'north', data.level);
                      const priorityTeam = extractItemTeam(priority);

                      return (
                        <td
                          onClick={() => setSelectedTopRowId(selectedTopRowId === priority.id ? null : priority.id)}
                          onMouseEnter={() => setHoveredTopRowIndex(pIndex)}
                          onMouseLeave={() => setHoveredTopRowIndex(null)}
                          style={{ width: `${compassSquareSize}px`, minWidth: `${compassSquareSize}px`, maxWidth: `${compassSquareSize}px` }}
                          className={`px-3 py-1.5 border border-slate-200 align-middle transition-all cursor-pointer group ${
                            isTopRowDirect
                              ? 'bg-sky-200/95 font-bold border-l-4 border-l-sky-600 shadow-xs ring-1 ring-sky-400'
                              : isTopRowLinked
                              ? 'bg-sky-100/90 font-semibold border-l-4 border-l-sky-400 shadow-2xs'
                              : 'hover:bg-slate-50'
                          }`}
                          title={isVi ? `Dòng [${priority.code}]: Rà chuột sang phải để xem Người phụ trách (Nhấp để ghim dòng)` : `Row [${priority.code}]: Trace right to view Resources (Click to pin)`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-2 min-w-0">
                              {/* Colored Status Dot */}
                              <span
                                style={{ backgroundColor: getStatusDotColor(pIndex) }}
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                                title={`Status: Active`}
                              ></span>

                              {/* Code Badge with Team Color */}
                              <span
                                style={{ borderColor: priorityColor, color: priorityColor }}
                                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-50 border shrink-0"
                              >
                                {priority.code}
                              </span>

                              {/* Department / Team indicator badge */}
                              {priorityTeam && priorityTeam !== 'GENERAL' && (
                                <span
                                  style={{ backgroundColor: `${priorityColor}15`, color: priorityColor }}
                                  className="text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 hidden sm:inline-block uppercase tracking-wider"
                                >
                                  {priority.department || priorityTeam}
                                </span>
                              )}

                              {/* Title with Team Color */}
                              <span
                                style={{ color: priorityColor }}
                                className="text-xs font-semibold truncate"
                                title={priority.titleVi || priority.title}
                              >
                                {isVi && priority.titleVi
                                  ? priority.titleVi
                                  : isKo && priority.titleKo
                                  ? priority.titleKo
                                  : priority.title}
                              </span>
                            </div>

                            {/* Action & Info Icons */}
                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditPriority(priority);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                                title={isVi ? 'Thông tin & Chỉnh sửa' : 'Inspect / Edit'}
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeletePriority(priority);
                                }}
                                className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer opacity-0 group-hover:opacity-100"
                                title={isVi ? 'Xóa ưu tiên này' : 'Delete'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                      );
                    })()}

                    {/* NORTHEAST GRID (PART 1): Intersects Top Rows (Priorities) with Right KPI Columns */}
                    {rightKpiItems.map((kpi, kIndex) => {
                      const isKpiColDirect = hoveredRightColIndex === kIndex || selectedRightColId === kpi.id;
                      const isKpiColLinked = linkedElements.kpiIds.has(kpi.id);
                      const isKpiColHovered = isKpiColDirect || isKpiColLinked;
                      const isIntersect = isTopRowDirect && isKpiColDirect;
                      const cellKey = `nekpi_${priority.id}_${kpi.id}`;
                      const isCellLinked = linkedElements.cellKeys.has(cellKey);
                      const correlation = getNortheastKpiCorrelation(priority, kpi, pIndex, kIndex);

                      return (
                        <td
                          key={cellKey}
                          onClick={() => handleToggleCell(cellKey, correlation, kpi, priority.id, priority)}
                          onMouseEnter={() => {
                            setHoveredTopRowIndex(pIndex);
                            setHoveredRightColIndex(kIndex);
                          }}
                          onMouseLeave={() => {
                            setHoveredTopRowIndex(null);
                            setHoveredRightColIndex(null);
                          }}
                          style={{ width: `${kpiColWidth}px`, minWidth: `${kpiColWidth}px` }}
                          className={`h-9 border border-slate-200 text-center align-middle cursor-pointer transition-all p-0 ${
                            isIntersect
                              ? 'bg-amber-200/95 ring-2 ring-amber-500 shadow-xs z-10'
                              : isCellLinked
                              ? 'bg-sky-200/95 ring-1.5 ring-sky-500 shadow-xs z-10'
                              : isTopRowDirect || isKpiColDirect
                              ? 'bg-sky-100/70'
                              : isTopRowHovered || isKpiColHovered
                              ? 'bg-sky-50/70'
                              : 'hover:bg-slate-100'
                          }`}
                          title={`${priority.code} ↔ ${kpi.code}: ${
                            correlation === 'primary' ? (isVi ? 'Liên kết chỉ số KPI (●)' : 'Primary Target (●)') : correlation === 'secondary' ? (isVi ? 'Liên kết bổ trợ (○)' : 'Secondary (○)') : (isVi ? 'Chưa liên kết' : 'None')
                          } (${isVi ? 'Nhấp để đổi' : 'Click to toggle'})`}
                        >
                          <div className="flex items-center justify-center w-full h-full">
                            {correlation === 'primary' && (
                              <span
                                className={`select-none inline-block leading-none transition-transform ${
                                  isCellLinked || isIntersect
                                    ? 'text-slate-950 text-base scale-125'
                                    : 'text-slate-900 text-sm'
                                }`}
                              >
                                ●
                              </span>
                            )}
                            {correlation === 'secondary' && (
                              <span
                                className={`select-none inline-block leading-none transition-transform ${
                                  isCellLinked || isIntersect
                                    ? 'text-slate-900 text-sm scale-110'
                                    : 'text-slate-500 text-xs opacity-80'
                                }`}
                              >
                                ○
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* NORTHEAST GRID (PART 2): Intersects Top Rows (Priorities) with Right Resource/Owner Columns */}
                    {/* "Vùng Người phụ trách rà theo dòng, phân biệt chính - tròn đậm, phụ - tròn khuyết" */}
                    {rightResourceItems.map((res, rIndex) => {
                      const colIdx = rightKpiItems.length + rIndex;
                      const isResColDirect = hoveredRightColIndex === colIdx || selectedRightColId === res.key;
                      const isResColLinked = linkedElements.resourceKeys.has(res.key);
                      const isResColHovered = isResColDirect || isResColLinked;
                      const isIntersect = isTopRowDirect && isResColDirect;
                      const cellKey = `neres_${priority.id}_${res.key}`;
                      const isCellLinked = linkedElements.cellKeys.has(cellKey);
                      const correlation = getNortheastResourceCorrelation(priority, res, pIndex, rIndex);
                      const resColor = getDepartmentResourceColor(res.department);

                      const isFirstPicCol = rIndex === 0;

                      return (
                        <td
                          key={cellKey}
                          onClick={() => handleToggleCell(cellKey, correlation, undefined, undefined, priority, res.key)}
                          onMouseEnter={() => {
                            setHoveredTopRowIndex(pIndex);
                            setHoveredRightColIndex(colIdx);
                          }}
                          onMouseLeave={() => {
                            setHoveredTopRowIndex(null);
                            setHoveredRightColIndex(null);
                          }}
                          className={`w-10 h-9 border-r border-b border-amber-200/80 ${
                            isFirstPicCol ? 'border-l-4 border-l-amber-500' : 'border-l border-l-amber-200/50'
                          } text-center align-middle cursor-pointer transition-all p-0 group/rescell ${
                            isIntersect
                              ? 'bg-amber-300/95 ring-2 ring-amber-600 shadow-xs z-10'
                              : isCellLinked
                              ? 'bg-amber-200/90 ring-1.5 ring-amber-500 shadow-xs z-10'
                              : isTopRowDirect || isResColDirect
                              ? 'bg-amber-100/90'
                              : isTopRowHovered || isResColHovered
                              ? 'bg-amber-100/60'
                              : 'bg-amber-50/50 hover:bg-amber-100/70'
                          }`}
                          title={`${isVi ? 'Dòng ưu tiên' : 'Priority Row'}: [${priority.code}] ${priority.titleVi || priority.title}\n${isVi ? 'Người phụ trách' : 'Resource'}: ${res.fullTitle} (${res.department})\n${isVi ? 'Vai trò' : 'Role'}: ${
                            correlation === 'primary'
                              ? isVi ? 'Trách nhiệm CHÍNH (Tròn đậm ●)' : 'Primary Owner (Solid circle ●)'
                              : correlation === 'secondary'
                              ? isVi ? 'Trách nhiệm PHỤ (Tròn khuyết ○)' : 'Secondary / Support (Hollow circle ○)'
                              : isVi ? 'Chưa phân công' : 'Unassigned'
                          }\n(${isVi ? 'Nhấp để đổi: Chính ● ➔ Phụ ○ ➔ Trống' : 'Click to cycle: Primary ● ➔ Secondary ○ ➔ Clear'})`}
                        >
                          <div className="flex items-center justify-center w-full h-full">
                            {correlation === 'primary' && (
                              <span
                                style={{ backgroundColor: resColor }}
                                className={`rounded-full inline-block shadow-2xs transition-transform ${
                                  isCellLinked || isIntersect ? 'w-4 h-4 scale-110' : 'w-3.5 h-3.5'
                                }`}
                                title={isVi ? 'Trách nhiệm chính (Tròn đậm ●)' : 'Primary (Solid ●)'}
                              ></span>
                            )}
                            {correlation === 'secondary' && (
                              <span
                                style={{ borderColor: resColor }}
                                className={`rounded-full border-2 bg-white inline-block shadow-2xs transition-transform ${
                                  isCellLinked || isIntersect ? 'w-4 h-4 scale-110' : 'w-3.5 h-3.5'
                                }`}
                                title={isVi ? 'Trách nhiệm phụ (Tròn khuyết ○)' : 'Secondary (Hollow ○)'}
                              ></span>
                            )}
                            {correlation === 'none' && (
                              <span className="w-2.5 h-2.5 rounded-full border border-dashed border-slate-300 opacity-0 group-hover/rescell:opacity-100 transition-opacity"></span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* ============================================================== */}
              {/* ROW 2: WEST ARM (LEFT) | CENTER "X" COMPASS | EAST ARM (RIGHT) */}
              {/* ============================================================== */}
              <tr style={{ height: `${compassSquareSize}px` }}>
                {/* WEST ARM: Annual Breakthrough Objectives or Prior Level Priorities (Rotated Vertical Columns) */}
                {leftItems.map((obj, lIndex) => {
                  const isColDirect = hoveredLeftColIndex === lIndex || selectedLeftColId === obj.id;
                  const isColLinked = linkedElements.leftIds.has(obj.id);
                  const isColHovered = isColDirect || isColLinked;
                  const leftItemColor = getCompassItemTextColor(obj.rawItem || obj, 'west', data.level);

                  return (
                    <td
                      key={`left_col_${obj.id}`}
                      onClick={() => setSelectedLeftColId(selectedLeftColId === obj.id ? null : obj.id)}
                      onMouseEnter={() => setHoveredLeftColIndex(lIndex)}
                      onMouseLeave={() => setHoveredLeftColIndex(null)}
                      style={{ height: `${compassSquareSize}px` }}
                      className={`w-11 min-w-[44px] max-w-[48px] border border-slate-200 align-bottom p-1.5 transition-all cursor-pointer group ${
                        isColDirect
                          ? 'bg-sky-200/95 font-bold ring-2 ring-sky-500 border-sky-400 shadow-xs text-sky-950'
                          : isColLinked
                          ? 'bg-sky-100/90 font-semibold ring-1 ring-sky-400 border-sky-300 shadow-2xs text-slate-900'
                          : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div style={{ height: `${compassSquareSize - 16}px` }} className="flex flex-col items-center justify-between space-y-2">
                        {/* Top: Status Dot & Code */}
                        <div className="flex flex-col items-center space-y-1">
                          <span
                            style={{ backgroundColor: getStatusDotColor(lIndex) }}
                            className="w-2.5 h-2.5 rounded-full shadow-2xs"
                          ></span>
                          <span
                            style={{ borderColor: leftItemColor, color: leftItemColor }}
                            className="text-[10px] font-mono font-bold px-1 py-0.5 rounded border bg-slate-50"
                          >
                            {obj.code}
                          </span>
                        </div>

                        {/* Middle: Rotated Vertical Text (Reads bottom-to-top, aligned to bottom) */}
                        <div className="flex-1 w-full flex flex-col items-center justify-end overflow-hidden pb-1 pt-1 px-0.5">
                          <div
                            style={{ maxHeight: `${compassSquareSize - 110}px`, color: leftItemColor }}
                            className="[writing-mode:vertical-rl] rotate-180 text-xs font-semibold tracking-tight whitespace-nowrap select-none overflow-hidden text-ellipsis text-left"
                            title={obj.titleVi || obj.title}
                          >
                            {isVi && obj.titleVi ? obj.titleVi : isKo && obj.titleKo ? obj.titleKo : obj.title}
                          </div>
                        </div>

                        {/* Bottom: Info Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (section2Config.itemType === 'objective') {
                              onEditObjective(obj.rawItem || obj, false, section2Config.sourceLevel);
                            } else {
                              onEditPriority(obj.rawItem || obj, section2Config.sourceLevel);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded transition cursor-pointer"
                          title={isVi ? 'Thông tin & Chỉnh sửa' : 'Inspect / Edit'}
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  );
                })}

                {/* CENTER "X" COMPASS: Iconic Amplon Square Green Box with Crossing Diagonals */}
                <td
                  style={{
                    width: `${compassSquareSize}px`,
                    minWidth: `${compassSquareSize}px`,
                    maxWidth: `${compassSquareSize}px`,
                    height: `${compassSquareSize}px`,
                    minHeight: `${compassSquareSize}px`,
                    maxHeight: `${compassSquareSize}px`,
                  }}
                  className={`p-0 border-2 align-middle relative overflow-hidden transition-all duration-300 group/compass ${
                    linkedElements.hasActive ? 'border-emerald-500 shadow-lg ring-2 ring-emerald-400/50' : 'border-emerald-700 shadow-inner'
                  }`}
                >
                  <svg
                    viewBox="0 0 400 400"
                    className="w-full h-full block"
                    preserveAspectRatio="none"
                  >
                    {/* Background Green Fill */}
                    <rect width="400" height="400" fill="#389654" />

                    {/* 4 Quadrant Triangles with Dynamic Highlighting based on active compass links */}
                    {/* NORTH (TOP) */}
                    <polygon
                      points="0,0 400,0 200,200"
                      fill={linkedElements.compassActiveBranches.north ? '#1e5e31' : '#389654'}
                      className="transition-colors duration-200 cursor-pointer hover:fill-[#2a7a42]"
                      onClick={() => onAddPriority()}
                    />
                    {/* WEST (LEFT) */}
                    <polygon
                      points="0,0 0,400 200,200"
                      fill={linkedElements.compassActiveBranches.west ? '#1e5e31' : '#389654'}
                      className="transition-colors duration-200 cursor-pointer hover:fill-[#2a7a42]"
                      onClick={() => {
                        if (section2Config.itemType === 'objective') {
                          onAddObjective(false, section2Config.sourceLevel);
                        } else {
                          onAddPriority(section2Config.sourceLevel);
                        }
                      }}
                    />
                    {/* SOUTH (BOTTOM) */}
                    <polygon
                      points="0,400 400,400 200,200"
                      fill={linkedElements.compassActiveBranches.south ? '#1e5e31' : '#389654'}
                      className="transition-colors duration-200 cursor-pointer hover:fill-[#2a7a42]"
                      onClick={() => {
                        if (section1Config.itemType === 'objective') {
                          onAddObjective(true, section1Config.sourceLevel);
                        } else {
                          onAddPriority(section1Config.sourceLevel);
                        }
                      }}
                    />
                    {/* EAST (RIGHT) */}
                    <polygon
                      points="400,0 400,400 200,200"
                      fill={linkedElements.compassActiveBranches.east ? '#1e5e31' : '#389654'}
                      className="transition-colors duration-200 cursor-pointer hover:fill-[#2a7a42]"
                      onClick={() => onAddKpi?.()}
                    />

                    {/* Diagonal Lines forming the bold "X" - perfect square 45 deg angles */}
                    <line
                      x1="0"
                      y1="0"
                      x2="400"
                      y2="400"
                      stroke="#ffffff"
                      strokeWidth={linkedElements.hasActive ? 4 : 2.5}
                      strokeOpacity={linkedElements.hasActive ? 1 : 0.85}
                      className="transition-all duration-200"
                    />
                    <line
                      x1="0"
                      y1="400"
                      x2="400"
                      y2="0"
                      stroke="#ffffff"
                      strokeWidth={linkedElements.hasActive ? 4 : 2.5}
                      strokeOpacity={linkedElements.hasActive ? 1 : 0.85}
                      className="transition-all duration-200"
                    />

                    {/* Center Subtle Glow */}
                    <circle
                      cx="200"
                      cy="200"
                      r={linkedElements.hasActive ? 34 : 28}
                      fill="#144222"
                      fillOpacity={linkedElements.hasActive ? 0.9 : 0.6}
                      className="transition-all duration-200"
                    />

                    {/* TOP TRIANGLE: Improvement Priorities (Dữ liệu nhập) */}
                    <g className="cursor-pointer">
                      <foreignObject
                        x="95"
                        y="14"
                        width="210"
                        height="102"
                        className="overflow-hidden"
                      >
                        <div className="w-full h-full flex flex-col items-center justify-center text-center px-2">
                          <span
                            className={`font-bold text-[11.5px] leading-tight line-clamp-2 max-w-[195px] drop-shadow-sm ${
                              linkedElements.compassActiveBranches.north ? 'text-amber-200 font-extrabold' : 'text-white'
                            }`}
                          >
                            {isVi ? compassLabels.topVi : isKo ? compassLabels.topKo : compassLabels.topEn}
                          </span>
                          <span className="text-[9px] text-emerald-200/90 font-semibold tracking-wider uppercase mt-0.5 drop-shadow-xs">
                            {isVi ? compassLabels.topBadgeVi : isKo ? compassLabels.topBadgeVi : compassLabels.topBadgeEn}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddPriority();
                            }}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 mt-1 rounded-full bg-emerald-950/80 hover:bg-emerald-800 border border-emerald-300/40 text-[9px] font-bold text-emerald-200 hover:text-white transition-colors cursor-pointer"
                            title={isVi ? `Thêm ${compassLabels.topVi}` : `Add ${compassLabels.topEn}`}
                          >
                            <Plus className="w-2.5 h-2.5 text-emerald-300" />
                            <span>{isVi ? 'Thêm' : isKo ? '추가' : 'Add'}</span>
                          </button>
                        </div>
                      </foreignObject>
                    </g>

                    {/* LEFT TRIANGLE: Link từ 2nd level */}
                    <g className="cursor-pointer">
                      <foreignObject
                        x="12"
                        y="146"
                        width="138"
                        height="108"
                        className="overflow-hidden"
                      >
                        <div className="w-full h-full flex flex-col items-center justify-center text-center px-1">
                          <span
                            className={`font-bold text-[10.5px] leading-tight line-clamp-2 max-w-[126px] drop-shadow-sm ${
                              linkedElements.compassActiveBranches.west ? 'text-amber-200 font-extrabold' : 'text-white'
                            }`}
                          >
                            {isVi ? compassLabels.leftVi : isKo ? compassLabels.leftKo : compassLabels.leftEn}
                          </span>
                          {compassLabels.leftBadgeVi && (
                            <span className="text-[8.5px] text-emerald-200/90 font-semibold tracking-wider uppercase mt-0.5 leading-tight drop-shadow-xs">
                              {isVi ? compassLabels.leftBadgeVi : isKo ? compassLabels.leftBadgeVi : compassLabels.leftBadgeEn}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (section2Config.itemType === 'objective') {
                                onAddObjective(false, section2Config.sourceLevel);
                              } else {
                                onAddPriority(section2Config.sourceLevel);
                              }
                            }}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 mt-1 rounded-full bg-emerald-950/80 hover:bg-emerald-800 border border-emerald-300/40 text-[9px] font-bold text-emerald-200 hover:text-white transition-colors cursor-pointer"
                            title={isVi ? `Thêm ${compassLabels.leftVi}` : `Add ${compassLabels.leftEn}`}
                          >
                            <Plus className="w-2.5 h-2.5 text-emerald-300" />
                            <span>{isVi ? 'Thêm' : isKo ? '추가' : 'Add'}</span>
                          </button>
                        </div>
                      </foreignObject>
                    </g>

                    {/* BOTTOM TRIANGLE: Link từ top level */}
                    <g className="cursor-pointer">
                      <foreignObject
                        x="95"
                        y="284"
                        width="210"
                        height="102"
                        className="overflow-hidden"
                      >
                        <div className="w-full h-full flex flex-col items-center justify-center text-center px-2">
                          <span className="text-[9px] text-emerald-200/90 font-semibold tracking-wider uppercase mb-0.5 drop-shadow-xs">
                            {isVi ? compassLabels.bottomBadgeVi : isKo ? compassLabels.bottomBadgeVi : compassLabels.bottomBadgeEn}
                          </span>
                          <span
                            className={`font-bold text-[11.5px] leading-tight line-clamp-2 max-w-[195px] drop-shadow-sm ${
                              linkedElements.compassActiveBranches.south ? 'text-amber-200 font-extrabold' : 'text-white'
                            }`}
                          >
                            {isVi ? compassLabels.bottomVi : isKo ? compassLabels.bottomKo : compassLabels.bottomEn}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (section1Config.itemType === 'objective') {
                                onAddObjective(true, section1Config.sourceLevel);
                              } else {
                                onAddPriority(section1Config.sourceLevel);
                              }
                            }}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 mt-1 rounded-full bg-emerald-950/80 hover:bg-emerald-800 border border-emerald-300/40 text-[9px] font-bold text-emerald-200 hover:text-white transition-colors cursor-pointer"
                            title={isVi ? `Thêm ${compassLabels.bottomVi}` : `Add ${compassLabels.bottomEn}`}
                          >
                            <Plus className="w-2.5 h-2.5 text-emerald-300" />
                            <span>{isVi ? 'Thêm' : isKo ? '추가' : 'Add'}</span>
                          </button>
                        </div>
                      </foreignObject>
                    </g>

                    {/* RIGHT TRIANGLE: Targets to Improve (KPIs) */}
                    <g className="cursor-pointer">
                      <foreignObject
                        x="250"
                        y="146"
                        width="138"
                        height="108"
                        className="overflow-hidden"
                      >
                        <div className="w-full h-full flex flex-col items-center justify-center text-center px-1">
                          <span
                            className={`font-bold text-[10.5px] leading-tight line-clamp-2 max-w-[126px] drop-shadow-sm ${
                              linkedElements.compassActiveBranches.east ? 'text-amber-200 font-extrabold' : 'text-white'
                            }`}
                          >
                            {isVi ? compassLabels.rightVi : isKo ? compassLabels.rightKo : compassLabels.rightEn}
                          </span>
                          {compassLabels.rightBadgeVi && (
                            <span className="text-[8.5px] text-emerald-200/90 font-semibold tracking-wider uppercase mt-0.5 leading-tight drop-shadow-xs">
                              {isVi ? compassLabels.rightBadgeVi : isKo ? compassLabels.rightBadgeVi : compassLabels.rightBadgeEn}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddKpi?.();
                            }}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 mt-1 rounded-full bg-emerald-950/80 hover:bg-emerald-800 border border-emerald-300/40 text-[9px] font-bold text-emerald-200 hover:text-white transition-colors cursor-pointer"
                            title={isVi ? `Thêm ${compassLabels.rightVi}` : `Add ${compassLabels.rightEn}`}
                          >
                            <Plus className="w-2.5 h-2.5 text-emerald-300" />
                            <span>{isVi ? 'Thêm' : isKo ? '추가' : 'Add'}</span>
                          </button>
                        </div>
                      </foreignObject>
                    </g>

                    {/* Center Logo Icon */}
                    <circle
                      cx="200"
                      cy="200"
                      r={linkedElements.hasActive ? 22 : 18}
                      fill="#ffffff"
                      stroke={linkedElements.hasActive ? '#15803d' : '#2d7c45'}
                      strokeWidth={linkedElements.hasActive ? 3.5 : 2.5}
                      className="transition-all duration-200 shadow-sm"
                    />
                    <text
                      x="200"
                      y="200"
                      dominantBaseline="central"
                      textAnchor="middle"
                      fill={linkedElements.hasActive ? '#15803d' : '#2d7c45'}
                      fontWeight="900"
                      fontSize={linkedElements.hasActive ? 18 : 15}
                      className="transition-all duration-200 select-none pointer-events-none"
                    >
                      X
                    </text>
                  </svg>
                </td>

                {/* EAST ARM (PART 1): TARGETS TO IMPROVE (KPIs) - Rotated Columns */}
                {rightKpiItems.map((kpi, kIndex) => {
                  const isKpiColDirect = hoveredRightColIndex === kIndex || selectedRightColId === kpi.id;
                  const isKpiColLinked = linkedElements.kpiIds.has(kpi.id);
                  const isKpiColHovered = isKpiColDirect || isKpiColLinked;
                  const kpiDisplayName = getLocalizedPureText(kpi.name, kpi.nameVi, language);
                  const kpiTextColor = getCompassItemTextColor(kpi, 'east', data.level);

                  return (
                    <td
                      key={`right_kpi_${kpi.id}`}
                      onClick={() => {
                        setSelectedRightColId(selectedRightColId === kpi.id ? null : kpi.id);
                        onSelectKpi(kpi);
                      }}
                      onMouseEnter={() => setHoveredRightColIndex(kIndex)}
                      onMouseLeave={() => setHoveredRightColIndex(null)}
                      style={{ width: `${kpiColWidth}px`, minWidth: `${kpiColWidth}px`, maxWidth: `${kpiColWidth}px`, height: `${compassSquareSize}px` }}
                      className={`border border-slate-200 align-bottom p-1.5 transition-all cursor-pointer group ${
                        isKpiColDirect
                          ? 'bg-sky-200/95 font-bold ring-2 ring-sky-500 border-sky-400 shadow-xs text-sky-950'
                          : isKpiColLinked
                          ? 'bg-sky-100/90 font-semibold ring-1 ring-sky-400 border-sky-300 shadow-2xs text-slate-900'
                          : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div style={{ height: `${compassSquareSize - 16}px` }} className="flex flex-col items-center justify-between space-y-1.5">
                        {/* Top: Status Dot + Code Badge */}
                        <div className="flex flex-col items-center space-y-1">
                          <span
                            style={{ backgroundColor: getStatusDotColor(kIndex, kpi) }}
                            className="w-2.5 h-2.5 rounded-full shadow-2xs"
                            title={`Status: ${getKpiOverallStatus(kpi)}`}
                          ></span>
                          <span
                            style={{ borderColor: kpiTextColor, color: kpiTextColor }}
                            className="text-[9px] font-mono font-bold px-1 py-0.5 rounded border bg-slate-50 text-center leading-tight max-w-[38px] truncate"
                            title={kpi.code}
                          >
                            {kpi.code}
                          </span>
                        </div>

                        {/* Middle: Rotated Vertical KPI Title (Aligned to bottom) */}
                        <div className="flex-1 w-full flex flex-col items-center justify-end overflow-hidden pb-1 pt-1 px-0.5">
                          <div
                            style={{ maxHeight: `${compassSquareSize - 80}px`, color: kpiTextColor }}
                            className="[writing-mode:vertical-rl] rotate-180 text-xs font-semibold tracking-tight whitespace-nowrap select-none overflow-hidden text-ellipsis text-left"
                            title={`${kpi.code}: ${kpiDisplayName}`}
                          >
                            {kpiDisplayName}
                          </div>
                        </div>

                        {/* Bottom: Info Button to view 8D details */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectKpi(kpi);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded transition cursor-pointer"
                          title={isVi ? 'Xem chi tiết & Kế hoạch 8D' : 'Inspect KPI Details'}
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  );
                })}

                {/* EAST ARM (PART 2): OWNERS / RESOURCES (PIC AREA) - Rotated Columns */}
                {rightResourceItems.map((res, rIndex) => {
                  const colIdx = rightKpiItems.length + rIndex;
                  const isResColDirect = hoveredRightColIndex === colIdx || selectedRightColId === res.key;
                  const isResColLinked = linkedElements.resourceKeys.has(res.key);
                  const isResColHovered = isResColDirect || isResColLinked;
                  const resTeamColor = getTeamColorConfig(res.department);
                  const isFirstPicCol = rIndex === 0;

                  return (
                    <td
                      key={`right_res_${res.key}`}
                      onClick={() => setSelectedRightColId(selectedRightColId === res.key ? null : res.key)}
                      onMouseEnter={() => setHoveredRightColIndex(colIdx)}
                      onMouseLeave={() => setHoveredRightColIndex(null)}
                      style={{ height: `${compassSquareSize}px` }}
                      className={`w-10 min-w-[40px] max-w-[44px] border-r border-b border-amber-300/80 ${
                        isFirstPicCol ? 'border-l-4 border-l-amber-500' : 'border-l border-l-amber-200/50'
                      } align-bottom p-1.5 transition-all cursor-pointer group ${
                        isResColDirect
                          ? 'bg-amber-200/95 font-bold border-amber-400 ring-2 ring-amber-500 shadow-xs text-amber-950'
                          : isResColLinked
                          ? 'bg-amber-100/90 font-semibold border-amber-300 ring-1 ring-amber-400 shadow-2xs text-slate-900'
                          : 'bg-amber-50/60 hover:bg-amber-100/70'
                      }`}
                    >
                      <div style={{ height: `${compassSquareSize - 16}px` }} className="flex flex-col items-center justify-between space-y-1">
                        {/* Top: Department tag */}
                        <span className="text-[8.5px] font-mono font-extrabold px-1 py-0.5 rounded border border-amber-400 bg-white/95 text-amber-950 shadow-2xs">
                          {res.department}
                        </span>

                        {/* Middle: Rotated Owner Name (Aligned to bottom) */}
                        <div className="flex-1 w-full flex flex-col items-center justify-end overflow-hidden pb-1 pt-1 px-0.5">
                          <div
                            style={{ maxHeight: `${compassSquareSize - 110}px` }}
                            className={`[writing-mode:vertical-rl] rotate-180 text-xs font-semibold tracking-tight whitespace-nowrap select-none overflow-hidden text-ellipsis text-left ${resTeamColor.text}`}
                            title={res.fullTitle}
                          >
                            {res.name}
                          </div>
                        </div>

                        {/* Bottom: Edit Resource */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditResource(res);
                          }}
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-100 rounded transition cursor-pointer"
                          title={isVi ? 'Chỉnh sửa nhân sự' : 'Edit Resource'}
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* ============================================================== */}
              {/* ROW 3: SOUTHWEST GRID (SW) | SOUTH ARM (BOTTOM) | SOUTHEAST (SE) */}
              {/* ============================================================== */}
              {bottomItems.map((bItem: any, bIndex: number) => {
                const isRowDirect = hoveredBottomRowIndex === bIndex || selectedBottomRowId === bItem.id;
                const isRowLinked = linkedElements.bottomIds.has(bItem.id);
                const isBottomRowHovered = isRowDirect || isRowLinked;
                const isObj = section1Config.itemType === 'objective';

                return (
                  <tr
                    key={`bottom_row_${bItem.id}`}
                    onMouseEnter={() => setHoveredBottomRowIndex(bIndex)}
                    onMouseLeave={() => setHoveredBottomRowIndex(null)}
                    className={`transition-colors ${
                      isRowDirect ? 'bg-sky-100/80' : isRowLinked ? 'bg-sky-50/70' : bIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    {/* SOUTHWEST GRID: Left Columns (Annual Objectives) intersect Bottom Rows (Long-term / L1 Priorities) */}
                    {leftItems.map((lObj, lIndex) => {
                      const isColDirect = hoveredLeftColIndex === lIndex || selectedLeftColId === lObj.id;
                      const isColLinked = linkedElements.leftIds.has(lObj.id);
                      const isColHovered = isColDirect || isColLinked;
                      const cellKey = `sw_${bItem.id}_${lObj.id}`;
                      const isCellLinked = linkedElements.cellKeys.has(cellKey);
                      const isIntersect = (isRowDirect && isColDirect) || (isCellLinked && linkedElements.hasActive);
                      const correlation = getSouthwestCorrelation(bItem, lObj, bIndex, lIndex);

                      return (
                        <td
                          key={cellKey}
                          onClick={() => handleToggleCell(cellKey, correlation, undefined, undefined, undefined, undefined, bItem, lObj.id)}
                          onMouseEnter={() => {
                            setHoveredBottomRowIndex(bIndex);
                            setHoveredLeftColIndex(lIndex);
                          }}
                          onMouseLeave={() => {
                            setHoveredBottomRowIndex(null);
                            setHoveredLeftColIndex(null);
                          }}
                          className={`w-11 h-9 border border-slate-200 text-center align-middle cursor-pointer transition-all p-0 group/swcell ${
                            isCellLinked || isIntersect
                              ? 'bg-emerald-100/90 ring-1 ring-emerald-500 font-bold'
                              : isColDirect && isRowDirect
                              ? 'bg-sky-200/90 ring-1 ring-sky-400'
                              : isColHovered
                              ? 'bg-sky-100/70'
                              : isBottomRowHovered
                              ? 'bg-sky-100/50'
                              : 'hover:bg-slate-100'
                          }`}
                          title={`${bItem.code} ↔ ${lObj.code}: ${
                            correlation === 'primary' ? (isVi ? 'Liên kết chính (●)' : 'Primary Alignment (●)') : correlation === 'secondary' ? (isVi ? 'Liên kết bổ trợ (○)' : 'Secondary Alignment (○)') : (isVi ? 'Chưa liên kết' : 'None')
                          } (${isVi ? 'Nhấp để đổi' : 'Click to toggle'})`}
                        >
                          <div className="flex items-center justify-center w-full h-full">
                            {correlation === 'primary' && (
                              <span
                                className={`leading-none select-none inline-block transition-transform ${
                                  isCellLinked || isIntersect ? 'text-emerald-950 text-base scale-125' : 'text-slate-900 text-sm'
                                }`}
                                title={isVi ? 'Liên kết chính (●)' : 'Primary Alignment (●)'}
                              >
                                ●
                              </span>
                            )}
                            {correlation === 'secondary' && (
                              <span
                                className={`leading-none select-none inline-block transition-transform ${
                                  isCellLinked || isIntersect ? 'text-emerald-800 text-sm scale-110 opacity-100' : 'text-slate-500 text-xs opacity-80'
                                }`}
                                title={isVi ? 'Liên kết bổ trợ (○)' : 'Secondary Alignment (○)'}
                              >
                                ○
                              </span>
                            )}
                            {correlation === 'none' && (
                              <span className="w-2 h-2 rounded-full border border-dashed border-slate-300 opacity-0 group-hover/swcell:opacity-100 transition-opacity"></span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* SOUTH ARM: BOTTOM SECTION ITEM (Long-Term Objectives / L1 Priorities) */}
                    {(() => {
                      const bottomItemColor = getCompassItemTextColor(bItem, 'south', data.level);
                      const bottomTeam = extractItemTeam(bItem);

                      return (
                        <td
                          onClick={() => setSelectedBottomRowId(selectedBottomRowId === bItem.id ? null : bItem.id)}
                          style={{ width: `${compassSquareSize}px`, minWidth: `${compassSquareSize}px`, maxWidth: `${compassSquareSize}px` }}
                          className={`px-3 py-1.5 border border-slate-200 align-middle transition-all cursor-pointer group ${
                            isRowDirect
                              ? 'bg-sky-200/95 font-bold ring-2 ring-sky-500 border-sky-400 shadow-xs'
                              : isRowLinked
                              ? 'bg-sky-100/90 font-semibold ring-1 ring-sky-400 border-sky-300 shadow-2xs'
                              : bIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-2 min-w-0">
                              {/* Colored Status Dot */}
                              <span
                                style={{ backgroundColor: getStatusDotColor(bIndex) }}
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                              ></span>

                              {/* Code Badge */}
                              <span
                                style={{ borderColor: bottomItemColor, color: bottomItemColor }}
                                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-50 border shrink-0"
                              >
                                {bItem.code}
                              </span>

                              {/* Level badge */}
                              {compassLabels.bottomBadgeVi && (
                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                                  isL2 || isL3 ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {compassLabels.bottomBadgeVi}
                                </span>
                              )}

                              {/* Department / Team badge if team-specific */}
                              {bottomTeam && bottomTeam !== 'GENERAL' && (
                                <span
                                  style={{ backgroundColor: `${bottomItemColor}15`, color: bottomItemColor }}
                                  className="text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 hidden sm:inline-block uppercase tracking-wider"
                                >
                                  {bItem.department || bottomTeam}
                                </span>
                              )}

                              {/* Title */}
                              <span
                                style={{ color: bottomItemColor }}
                                className="text-xs font-semibold truncate"
                                title={bItem.titleVi || bItem.title}
                              >
                                {isVi && bItem.titleVi ? bItem.titleVi : isKo && bItem.titleKo ? bItem.titleKo : bItem.title}
                              </span>
                            </div>

                            {/* Action & Info Icons */}
                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isObj) {
                                    onEditObjective(bItem, true, section1Config.sourceLevel);
                                  } else {
                                    onEditPriority(bItem, section1Config.sourceLevel);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                                title={isVi ? 'Thông tin & Chỉnh sửa' : 'Inspect / Edit'}
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isObj) {
                                    onDeleteObjective(bItem, true, section1Config.sourceLevel);
                                  } else {
                                    onDeletePriority(bItem, section1Config.sourceLevel);
                                  }
                                }}
                                className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer opacity-0 group-hover:opacity-100"
                                title={isVi ? 'Xóa mục này' : 'Delete'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                      );
                    })()}

                    {/* SOUTHEAST CORNER: Split into Target to improve area and distinct PIC area */}
                    {bIndex === 0 && (
                      <>
                        {/* 1. Under Targets to improve (KPIs) */}
                        <td
                          rowSpan={bottomItems.length}
                          colSpan={Math.max(1, rightKpiItems.length)}
                          className="border border-slate-200 bg-slate-50/40 p-2 text-center align-middle"
                        >
                          <div className="text-[10px] text-slate-400 italic">
                            {isVi ? 'Vùng Mục tiêu cải thiện' : 'Target to improve area'}
                          </div>
                        </td>

                        {/* 2. Under PIC Area: Distinct Amber Quadrant */}
                        <td
                          rowSpan={bottomItems.length}
                          colSpan={Math.max(1, rightResourceItems.length)}
                          className="border-t border-r border-b border-amber-300 border-l-4 border-l-amber-500 bg-amber-50/70 p-2 align-middle text-center"
                        >
                          <div className="flex flex-col items-center justify-center text-center p-1.5 space-y-1.5">
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-950 bg-amber-200/90 border border-amber-300 px-2 py-0.5 rounded-full shadow-2xs">
                              <Users className="w-3 h-3 text-amber-800" />
                              <span>{isVi ? 'KHU VỰC PIC' : 'PIC ZONE'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[9px] text-amber-900 font-semibold">
                              <span className="flex items-center gap-0.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block"></span>
                                <span>{isVi ? 'Chính' : 'Main'}</span>
                              </span>
                              <span className="text-amber-300">|</span>
                              <span className="flex items-center gap-0.5">
                                <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-800 bg-white inline-block"></span>
                                <span>{isVi ? 'Phụ' : 'Sec'}</span>
                              </span>
                            </div>
                            <button
                              onClick={() => onAddResource()}
                              className="inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 border border-amber-400 px-2 py-0.5 rounded shadow-2xs transition cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>{isVi ? '+ Thêm PIC' : '+ Add PIC'}</span>
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}

            </tbody>
          </table>

          {/* Bottom Footnote Legend & Quick Guide */}
          <div className="mt-3 flex flex-col space-y-2 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Correlation dots */}
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1 text-slate-800 font-semibold">
                  <span className="text-base leading-none">●</span>
                  <span>{isVi ? 'Liên kết chính (Primary)' : 'Primary correlation'}</span>
                </span>
                <span className="flex items-center space-x-1 text-slate-800 font-semibold">
                  <span className="text-base leading-none">○</span>
                  <span>{isVi ? 'Liên kết phụ (Secondary)' : 'Complementary correlation'}</span>
                </span>
              </div>

              {/* Team color badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-500 font-medium">{isVi ? 'Màu sắc Team:' : 'Team Colors:'}</span>
                <span className="inline-flex items-center gap-1 font-bold text-slate-900 bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-black inline-block"></span>
                  <span>{isVi ? 'Mục tiêu 3N / 1N (Chung - Đen)' : '3Y / 1Y Goals (Common)'}</span>
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-teal-700 inline-block"></span>
                  <span>Lean / CI</span>
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-purple-700 inline-block"></span>
                  <span>Business / KD</span>
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-sky-800 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-sky-700 inline-block"></span>
                  <span>Production / SX</span>
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-red-800 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-red-700 inline-block"></span>
                  <span>Quality / CL</span>
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-amber-950 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-amber-600 inline-block"></span>
                  <span>{isVi ? 'Khu vực PIC (Vàng cam)' : 'PIC Area'}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-slate-400 italic">
              <div>
                {isVi
                  ? '💡 Các nội dung được tự động gom nhóm liên tục theo Functional Team ở cả 4 hướng la bàn. Thêm mới sẽ tự động sắp xếp cạnh team tương ứng.'
                  : '💡 Items are automatically grouped contiguously by team across all 4 compass arms.'}
              </div>
              <div>
                {isVi
                  ? 'Nhấp vào bất kỳ ô giao điểm để đổi liên kết (● ↔ ○ ↔ Trống).'
                  : 'Click any grid cell to toggle correlation (● ↔ ○ ↔ None).'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TARGETS TO IMPROVE (KPIs) DETAILED TABLE                       */}
      {/* ============================================================== */}
      <div id="amplon-targets-table" className="border-t border-slate-300 bg-white p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 text-white rounded-lg">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-wide flex items-center gap-2">
                <span>{isVi ? 'BẢNG MỤC TIÊU CẢI THIỆN (TARGET TO IMPROVE / KPIs)' : 'TARGET TO IMPROVE (KPIs) TABLE'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {rightKpiItems.length} {isVi ? 'chỉ số' : 'metrics'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isVi
                  ? 'Theo dõi mục tiêu 2026, xuất phát điểm, thực tế mới nhất và kế hoạch hành động 8D theo từng phòng ban'
                  : 'Track 2026 targets, baseline, latest actuals and 8D action plans by department'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onAddKpi?.()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isVi ? 'Thêm KPI' : 'Add KPI'}</span>
            </button>
            <button
              onClick={() => {
                const root = document.getElementById('amplon-xmatrix-root');
                root?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
              title={isVi ? 'Cuộn lên Ma trận X' : 'Scroll up to X-Matrix'}
            >
              <span>↑ {isVi ? 'Về Ma Trận X' : 'Back to Matrix'}</span>
            </button>
          </div>
        </div>

        {/* Targets Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-3 w-16 text-center">#</th>
                <th className="py-3 px-3 w-28">{isVi ? 'Bộ phận' : 'Department'}</th>
                <th className="py-3 px-3 w-24">{isVi ? 'Mã số' : 'Code'}</th>
                <th className="py-3 px-4">{isVi ? 'Tên Chỉ Số Mục Tiêu' : 'KPI Name'}</th>
                <th className="py-3 px-3 min-w-[190px]">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block shadow-2xs shrink-0"></span>
                    <span>{isVi ? 'Người chịu trách nhiệm chính' : 'Primary PIC'}</span>
                  </div>
                </th>
                <th className="py-3 px-3 w-20 text-center">{isVi ? 'Đơn vị' : 'Unit'}</th>
                <th className="py-3 px-3 w-24 text-right">{isVi ? 'Xuất phát' : 'Baseline'}</th>
                <th className="py-3 px-3 w-28 text-right bg-emerald-50/70 text-emerald-950 font-bold">{isVi ? 'Mục tiêu 2026' : 'Target 2026'}</th>
                <th className="py-3 px-3 w-28 text-right">{isVi ? 'Mới nhất' : 'Latest'}</th>
                <th className="py-3 px-3 w-24 text-center">{isVi ? 'Trạng thái' : 'Status'}</th>
                <th className="py-3 px-3 w-28 text-center">{isVi ? 'Kế hoạch 8D' : '8D Plan'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rightKpiItems.map((kpi: any, idx: number) => {
                const teamColor = getTeamColorConfig(kpi.department);
                const MONTHS_ORDER: MonthKey[] = ['Dec', 'Nov', 'Oct', 'Sep', 'Aug', 'Jul', 'Jun', 'May', 'Apr', 'Mar', 'Feb', 'Jan'];
                let latestActualVal: string | number | null = null;
                if (kpi.monthly) {
                  for (const m of MONTHS_ORDER) {
                    const act = kpi.monthly[m]?.actual;
                    if (act !== null && act !== undefined && act !== '') {
                      latestActualVal = act;
                      break;
                    }
                  }
                }
                const status = getKpiOverallStatus(kpi);
                const kpiDisplayName = getLocalizedPureText(kpi.name, kpi.nameVi, language);

                return (
                  <tr
                    key={kpi.id}
                    onClick={() => onSelectKpi(kpi)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-semibold">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${teamColor.badge}`}>
                        {kpi.department}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {kpi.code}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center space-x-2">
                        <span className={teamColor.text}>{kpiDisplayName}</span>
                        {kpi.actionPlan8D && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 font-bold border border-amber-300">
                            8D Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {(() => {
                        const primaryPics = getPrimaryPicList(kpi);
                        if (primaryPics.length > 0) {
                          return (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {primaryPics.map((pic) => {
                                const picTeamColor = getTeamColorConfig(pic.department);
                                const cleanName = pic.name.replace(new RegExp(`^${pic.department}:?\\s*`, 'i'), '');
                                return (
                                  <span
                                    key={pic.key}
                                    className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${picTeamColor.badge} shadow-2xs`}
                                    title={`${isVi ? 'Trách nhiệm chính (●)' : 'Primary Responsible (●)'}: ${pic.fullTitle || pic.name}`}
                                  >
                                    <span className="w-2 h-2 rounded-full bg-slate-900 inline-block shrink-0 shadow-2xs"></span>
                                    <span className="font-bold">{pic.department}:</span>
                                    <span className="text-slate-800">{cleanName}</span>
                                  </span>
                                );
                              })}
                            </div>
                          );
                        }
                        if (kpi.owner) {
                          return (
                            <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              <span className="w-2 h-2 rounded-full bg-slate-800 inline-block shrink-0"></span>
                              <span>{kpi.owner}</span>
                            </span>
                          );
                        }
                        return <span className="text-slate-400 italic text-[11px]">-</span>;
                      })()}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                      {kpi.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {kpi.jumpingOffPoint}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                      {kpi.target2026}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      {latestActualVal !== null ? latestActualVal : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          status === 'green'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : status === 'yellow'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {status === 'green'
                          ? isVi ? 'Đạt' : 'On Track'
                          : status === 'yellow'
                          ? isVi ? 'Cảnh báo' : 'Warning'
                          : isVi ? 'Chậm' : 'Off Track'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectKpi(kpi);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition cursor-pointer"
                      >
                        {isVi ? 'Kế hoạch 8D' : '8D Action'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
