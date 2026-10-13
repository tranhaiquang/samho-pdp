import React, { useState, useRef, useEffect } from 'react';
import type { WorkBook } from 'xlsx';
import {
  KpiItem,
  PolicyLevel,
  MonthKey,
  Language,
  Department,
  BreakthroughObjective,
  ImprovementPriority,
  ResourcePerson,
  MONTH_KEYS,
} from '../types';
import { syncService } from '../lib/syncService';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  Eye,
  Check,
  RefreshCw,
  Languages,
  Globe,
} from 'lucide-react';

/**
 * xlsx (SheetJS) is ~900 KB minified - by far the largest dependency here, and
 * needed only once someone actually imports or exports a workbook. Importing it
 * eagerly puts the whole thing in the entry chunk that every visitor downloads.
 *
 * Instead it is loaded on demand into its own chunk. The promise is cached so
 * repeated imports never re-download, and <ExcelImportModal> warms it as soon as
 * it opens so the first file pick still feels instant.
 */
let xlsxPromise: Promise<typeof import('xlsx')> | null = null;
const loadXLSX = () => (xlsxPromise ??= import('xlsx'));

export type SheetTargetType =
  | 'L1_BOWLING'
  | 'L1_XMATRIX'
  | 'L2_BOWLING'
  | 'L2_XMATRIX'
  | 'L3_BOWLING'
  | 'L3_XMATRIX'
  | 'OBJ_3YEAR'
  | 'OBJ_ANNUAL'
  | 'PRIORITIES'
  | 'RESOURCES'
  | 'IGNORE';

interface SheetMappingConfig {
  sheetName: string;
  targetType: SheetTargetType;
  rowCount: number;
  detectedSummary: string;
  kpis?: KpiItem[];
  annualObjectives?: BreakthroughObjective[];
  threeYearObjectives?: BreakthroughObjective[];
  priorities?: ImprovementPriority[];
  resources?: ResourcePerson[];
}

export interface MultiSheetImportData {
  l1Kpis?: KpiItem[];
  l2Kpis?: KpiItem[];
  l3Kpis?: KpiItem[];
  l1AnnualObjectives?: BreakthroughObjective[];
  l2AnnualObjectives?: BreakthroughObjective[];
  l3AnnualObjectives?: BreakthroughObjective[];
  l1ThreeYearObjectives?: BreakthroughObjective[];
  l2ThreeYearObjectives?: BreakthroughObjective[];
  l3ThreeYearObjectives?: BreakthroughObjective[];
  l1Priorities?: ImprovementPriority[];
  l2Priorities?: ImprovementPriority[];
  l3Priorities?: ImprovementPriority[];
  l1Resources?: ResourcePerson[];
  l2Resources?: ResourcePerson[];
  l3Resources?: ResourcePerson[];
}

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: PolicyLevel;
  language: Language;
  onConfirmImport: (kpis: KpiItem[], targetLevel: PolicyLevel) => Promise<void>;
  onConfirmMultiImport?: (payload: MultiSheetImportData) => Promise<void>;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  currentLevel,
  language,
  onConfirmImport,
  onConfirmMultiImport,
}) => {
  const isVi = language === 'vi';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string>('');
  const [workbook, setWorkbook] = useState<WorkBook | null>(null);
  const [sheetConfigs, setSheetConfigs] = useState<SheetMappingConfig[]>([]);
  const [previewSheetName, setPreviewSheetName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedCount, setTranslatedCount] = useState<number | null>(null);
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(true);

  // Warm the xlsx chunk as soon as the modal opens, so the first file pick or
  // template download does not wait on a ~900 KB download.
  useEffect(() => {
    if (isOpen) void loadXLSX();
  }, [isOpen]);

  if (!isOpen) return null;

  const validDepartments: Department[] = [
    'Lean',
    'Delivery',
    'Development',
    'Quality',
    'Production',
    'Biz',
    'IT',
    'CSR',
    'HR',
    'Planning',
  ];

  // Auto-detect target based on sheet name
  const autoDetectTargetType = (
    name: string,
    index: number
  ): SheetTargetType => {
    const s = name.toLowerCase().trim();

    // 1. Direct 6-sheet matches
    if (s.includes('l1') && (s.includes('bowl') || s.includes('kpi'))) return 'L1_BOWLING';
    if (s.includes('l1') && (s.includes('matr') || s.includes('x-') || s.includes('policy'))) return 'L1_XMATRIX';
    if (s.includes('l2') && (s.includes('bowl') || s.includes('kpi'))) return 'L2_BOWLING';
    if (s.includes('l2') && (s.includes('matr') || s.includes('x-') || s.includes('policy'))) return 'L2_XMATRIX';
    if (s.includes('l3') && (s.includes('bowl') || s.includes('kpi'))) return 'L3_BOWLING';
    if (s.includes('l3') && (s.includes('matr') || s.includes('x-') || s.includes('policy'))) return 'L3_XMATRIX';

    // 2. Loose level matches
    if (s.startsWith('l1') || s === 'level 1' || s === 'cấp 1') return 'L1_BOWLING';
    if (s.startsWith('l2') || s === 'level 2' || s === 'cấp 2') return 'L2_BOWLING';
    if (s.startsWith('l3') || s === 'level 3' || s === 'cấp 3') return 'L3_BOWLING';

    // 3. Objectives / Priorities / Resources matches
    if (s.includes('3 năm') || s.includes('3y') || s.includes('breakthrough')) return 'OBJ_3YEAR';
    if (s.includes('hàng năm') || s.includes('annual') || s.includes('mục tiêu năm')) return 'OBJ_ANNUAL';
    if (s.includes('ưu tiên') || s.includes('priority') || s.includes('priorities')) return 'PRIORITIES';
    if (s.includes('nhân sự') || s.includes('resource') || s.includes('pic')) return 'RESOURCES';

    // 4. Default by order if exactly 6 sheets
    const defaultOrder: SheetTargetType[] = [
      'L1_BOWLING',
      'L1_XMATRIX',
      'L2_BOWLING',
      'L2_XMATRIX',
      'L3_BOWLING',
      'L3_XMATRIX',
    ];
    if (index < defaultOrder.length) {
      return defaultOrder[index];
    }

    return 'L1_BOWLING';
  };

  // Parse raw rows of a sheet into typed entities
  const parseSheetData = (
    rawRows: Record<string, any>[],
    targetType: SheetTargetType
  ): Partial<SheetMappingConfig> => {
    if (rawRows.length === 0) {
      return { rowCount: 0, detectedSummary: 'Sheet trống' };
    }

    // A. Parse KPI / Bowling sheet
    if (
      targetType === 'L1_BOWLING' ||
      targetType === 'L2_BOWLING' ||
      targetType === 'L3_BOWLING'
    ) {
      const level: PolicyLevel =
        targetType === 'L1_BOWLING' ? 'L1' : targetType === 'L2_BOWLING' ? 'L2' : 'L3';
      const kpis: KpiItem[] = [];

      rawRows.forEach((row, idx) => {
        let code = '';
        let name = '';
        let nameVi = '';
        let nameKo = '';
        let rawDept = 'Production';
        let unit = '%';
        let owner = '';
        let targetDirection: 'higher' | 'lower' | 'boolean' = 'higher';

        for (const [colName, val] of Object.entries(row)) {
          const key = colName.trim().toLowerCase();
          const strVal = String(val).trim();

          if (key.includes('mã') || key === 'code' || key === 'kpi code' || key === 'id') {
            code = strVal;
          } else if (key.includes('hàn') || key.includes('korean') || key.includes('nameko') || key.includes('tiếng hàn') || key === 'ko') {
            nameKo = strVal;
          } else if (key.includes('tiếng việt') || key.includes('namevi') || key.includes('tên vn') || key === 'vi') {
            nameVi = strVal;
          } else if (key.includes('tên') || key.includes('name') || key === 'metric' || key === 'chỉ số' || key.includes('en')) {
            if (!name) name = strVal;
          } else if (key.includes('bộ phận') || key.includes('dept') || key.includes('department') || key === 'pic') {
            rawDept = strVal || rawDept;
          } else if (key.includes('đơn vị') || key.includes('unit') || key === 'dvt') {
            unit = strVal || unit;
          } else if (key.includes('phụ trách') || key.includes('owner') || key.includes('pic')) {
            owner = strVal;
          } else if (key.includes('chiều hướng') || key.includes('direction')) {
            if (strVal.toLowerCase().includes('lower') || strVal.toLowerCase().includes('nhỏ') || strVal.toLowerCase().includes('giảm')) {
              targetDirection = 'lower';
            } else if (strVal.toLowerCase().includes('bool') || strVal.toLowerCase().includes('y/n') || strVal.toLowerCase().includes('đạt')) {
              targetDirection = 'boolean';
            } else {
              targetDirection = 'higher';
            }
          }
        }

        if (!name && !code) return;
        if (!code) code = `${level} ${idx + 1}`;
        if (!name) name = nameVi || nameKo || `KPI ${code}`;
        if (!nameVi) nameVi = name;

        // Monthly targets & actuals
        const monthlyData: Record<MonthKey, { target: any; actual: any }> = {} as any;
        MONTH_KEYS.forEach((m, mIdx) => {
          let tVal: any = null;
          let aVal: any = null;
          const monthNum = mIdx + 1; // 1 to 12
          const mLower = m.toLowerCase();

          for (const [colName, val] of Object.entries(row)) {
            const rawCol = colName.trim().toLowerCase();
            const colClean = rawCol.replace(/[\s_-]/g, '');

            const isThisMonth =
              colClean.includes(mLower) ||
              colClean.includes(`thang${monthNum}`) ||
              colClean.includes(`tháng${monthNum}`) ||
              colClean.startsWith(`${monthNum}_`) ||
              colClean.startsWith(`${monthNum}/`) ||
              colClean.startsWith(`m${monthNum}_`) ||
              colClean.startsWith(`t${monthNum}_`) ||
              rawCol.startsWith(`${monthNum} `) ||
              rawCol.startsWith(`${monthNum}-`);

            if (!isThisMonth) continue;

            const num = parseFloat(String(val).replace(/,/g, '').replace(/%/g, ''));
            const parsedVal = !isNaN(num) ? num : val || null;

            const isActual =
              rawCol.includes('actual') ||
              rawCol.includes('thực') ||
              rawCol.includes('thucte') ||
              rawCol.endsWith('act') ||
              rawCol.endsWith('_a') ||
              rawCol.endsWith(' a') ||
              rawCol.endsWith('-a') ||
              rawCol.endsWith('(a)') ||
              rawCol.endsWith('[a]');

            const isTarget =
              rawCol.includes('target') ||
              rawCol.includes('mục') ||
              rawCol.includes('muctieu') ||
              rawCol.includes('kế hoạch') ||
              rawCol.endsWith('tar') ||
              rawCol.endsWith('_t') ||
              rawCol.endsWith(' t') ||
              rawCol.endsWith('-t') ||
              rawCol.endsWith('(t)') ||
              rawCol.endsWith('[t]');

            if (isActual && !isTarget) {
              aVal = parsedVal;
            } else if (isTarget && !isActual) {
              tVal = parsedVal;
            }
          }
          monthlyData[m] = { target: tVal, actual: aVal };
        });

        const rawDeptLower = rawDept.trim().toLowerCase();
        let matchedDept: Department = 'Production';
        if (rawDeptLower.includes('csr') || rawDeptLower.includes('responsible') || rawDeptLower.includes('leadership')) {
          matchedDept = 'CSR';
        } else {
          matchedDept =
            validDepartments.find((d) => d.toLowerCase() === rawDeptLower) ||
            validDepartments.find((d) => rawDeptLower.includes(d.toLowerCase())) ||
            ('Production' as Department);
        }

        kpis.push({
          id: `kpi-import-${level}-${Date.now()}-${idx}`,
          code,
          name,
          nameVi,
          nameKo: nameKo || '',
          level,
          department: matchedDept,
          unit,
          jumpingOffPoint: 'Jan. 2026',
          targetDirection,
          owner: owner || matchedDept,
          resourceRoles: {
            biz: 'none',
            quality: 'none',
            csr: 'none',
            lean: 'primary',
            dev: 'none',
            hr: 'none',
            it: 'none',
            prod: 'secondary',
          },
          monthly: monthlyData,
        });
      });

      return {
        rowCount: rawRows.length,
        detectedSummary: `${kpis.length} chỉ số KPI (${level})`,
        kpis,
      };
    }

    // B. Parse X-Matrix sheet (Objectives, Priorities, Resources)
    if (
      targetType === 'L1_XMATRIX' ||
      targetType === 'L2_XMATRIX' ||
      targetType === 'L3_XMATRIX'
    ) {
      const annualObjectives: BreakthroughObjective[] = [];
      const threeYearObjectives: BreakthroughObjective[] = [];
      const priorities: ImprovementPriority[] = [];
      const resources: ResourcePerson[] = [];

      rawRows.forEach((row, idx) => {
        let title = '';
        let titleVi = '';
        let titleKo = '';
        let code = '';
        let type = '';
        let dept = '';
        let name = '';

        for (const [colName, val] of Object.entries(row)) {
          const k = colName.trim().toLowerCase();
          const v = String(val).trim();
          if (k.includes('mã') || k === 'code') code = v;
          else if (k.includes('hàn') || k.includes('korean') || k.includes('titleko') || k === 'ko') titleKo = v;
          else if (k.includes('tiếng việt') || k.includes('vn') || k.includes('titlevi') || k === 'vi') titleVi = v;
          else if (k.includes('tiêu đề') || k.includes('title') || k.includes('tên') || k === 'name' || k.includes('en')) {
            if (!title) title = v;
          } else if (k.includes('loại') || k.includes('type') || k.includes('phân loại')) type = v;
          else if (k.includes('bộ phận') || k.includes('dept')) dept = v;
          else if (k.includes('nhân sự') || k.includes('người') || k.includes('pic')) name = v;
        }

        if (!title && !code && !name) return;
        const lowerType = type.toLowerCase();

        if (lowerType.includes('3 năm') || lowerType.includes('3y') || code.startsWith('3Y')) {
          threeYearObjectives.push({
            id: `obj-3y-${Date.now()}-${idx}`,
            code: code || `3Y.${threeYearObjectives.length + 1}`,
            title: title || titleVi || titleKo || '3-Year Objective',
            titleVi: titleVi || title || 'Mục tiêu 3 năm',
            titleKo: titleKo || '',
            period: '2026 - 2028',
          });
        } else if (lowerType.includes('ưu tiên') || lowerType.includes('priority') || code.includes('2.1') || code.includes('1.1')) {
          priorities.push({
            id: `prio-${Date.now()}-${idx}`,
            code: code || `P.${priorities.length + 1}`,
            title: title || titleVi || titleKo || 'Priority',
            titleVi: titleVi || title || 'Ưu tiên',
            titleKo: titleKo || '',
          });
        } else if (lowerType.includes('nhân sự') || lowerType.includes('resource') || dept) {
          resources.push({
            key: (code || name || dept || `res-${idx}`).toLowerCase().replace(/[^a-z0-9]/g, ''),
            department: dept || 'Lean',
            name: name || title || 'PIC',
            fullTitle: `${dept || 'Lean'}: ${name || title || 'PIC'}`,
          });
        } else {
          annualObjectives.push({
            id: `obj-annual-${Date.now()}-${idx}`,
            code: code || `Obj.${annualObjectives.length + 1}`,
            title: title || titleVi || titleKo || 'Annual Objective',
            titleVi: titleVi || title || 'Mục tiêu năm',
            titleKo: titleKo || '',
            period: '2026',
          });
        }
      });

      const summaryParts = [];
      if (annualObjectives.length) summaryParts.push(`${annualObjectives.length} Mục tiêu năm`);
      if (threeYearObjectives.length) summaryParts.push(`${threeYearObjectives.length} Mục tiêu 3 năm`);
      if (priorities.length) summaryParts.push(`${priorities.length} Ưu tiên`);
      if (resources.length) summaryParts.push(`${resources.length} Nhân sự`);

      return {
        rowCount: rawRows.length,
        detectedSummary: summaryParts.join(', ') || `${rawRows.length} dòng X-Matrix`,
        annualObjectives,
        threeYearObjectives,
        priorities,
        resources,
      };
    }

    // C. Parse Specific Single Targets
    if (targetType === 'OBJ_3YEAR' || targetType === 'OBJ_ANNUAL') {
      const is3Y = targetType === 'OBJ_3YEAR';
      const objs: BreakthroughObjective[] = rawRows.map((r, idx) => {
        let code = '';
        let title = '';
        let titleVi = '';
        let titleKo = '';
        for (const [k, v] of Object.entries(r)) {
          const lk = k.toLowerCase();
          const str = String(v).trim();
          if (lk.includes('mã') || lk === 'code') code = str;
          else if (lk.includes('hàn') || lk.includes('korean') || lk.includes('titleko') || lk === 'ko') titleKo = str;
          else if (lk.includes('tiếng việt') || lk.includes('vn') || lk.includes('titlevi')) titleVi = str;
          else if (!title) title = str;
        }
        return {
          id: `obj-${is3Y ? '3y' : 'ann'}-${Date.now()}-${idx}`,
          code: code || `${is3Y ? '3Y' : 'L1'}.${idx + 1}`,
          title: title || titleVi || titleKo || 'Objective',
          titleVi: titleVi || title || 'Mục tiêu',
          titleKo: titleKo || '',
          period: is3Y ? '2026 - 2028' : '2026',
        };
      });
      return {
        rowCount: rawRows.length,
        detectedSummary: `${objs.length} Mục tiêu ${is3Y ? '3 năm' : 'hàng năm'}`,
        [is3Y ? 'threeYearObjectives' : 'annualObjectives']: objs,
      };
    }

    if (targetType === 'PRIORITIES') {
      const prios: ImprovementPriority[] = rawRows.map((r, idx) => {
        let code = '';
        let title = '';
        let titleVi = '';
        let titleKo = '';
        for (const [k, v] of Object.entries(r)) {
          const lk = k.toLowerCase();
          const str = String(v).trim();
          if (lk.includes('mã') || lk === 'code') code = str;
          else if (lk.includes('hàn') || lk.includes('korean') || lk.includes('titleko') || lk === 'ko') titleKo = str;
          else if (lk.includes('tiếng việt') || lk.includes('vn') || lk.includes('titlevi')) titleVi = str;
          else if (!title) title = str;
        }
        return {
          id: `prio-${Date.now()}-${idx}`,
          code: code || `P.${idx + 1}`,
          title: title || titleVi || titleKo || 'Priority',
          titleVi: titleVi || title || 'Ưu tiên',
          titleKo: titleKo || '',
        };
      });
      return {
        rowCount: rawRows.length,
        detectedSummary: `${prios.length} Ưu tiên cải tiến`,
        priorities: prios,
      };
    }

    if (targetType === 'RESOURCES') {
      const resList: ResourcePerson[] = rawRows.map((r, idx) => {
        let dept = 'Lean';
        let name = 'PIC';
        for (const [k, v] of Object.entries(r)) {
          const lk = k.toLowerCase();
          const str = String(v).trim();
          if (lk.includes('bộ phận') || lk.includes('dept')) dept = str;
          else if (lk.includes('tên') || lk.includes('name') || lk.includes('pic')) name = str;
        }
        return {
          key: (dept + '_' + name).toLowerCase().replace(/[^a-z0-9]/g, ''),
          department: dept,
          name: name,
          fullTitle: `${dept}: ${name}`,
        };
      });
      return {
        rowCount: rawRows.length,
        detectedSummary: `${resList.length} Nhân sự phụ trách`,
        resources: resList,
      };
    }

    return {
      rowCount: rawRows.length,
      detectedSummary: 'Bỏ qua (không nạp)',
    };
  };

  // Batch translate all English items into Vietnamese and Korean
  const runBatchTranslation = async (
    configs: SheetMappingConfig[]
  ): Promise<SheetMappingConfig[]> => {
    const itemsToTranslate: Array<{
      id: string;
      textEn: string;
      context?: 'kpi' | 'objective' | 'priority';
    }> = [];

    configs.forEach((cfg) => {
      if (cfg.targetType === 'IGNORE') return;
      cfg.kpis?.forEach((k) => {
        if (k.name && (!k.nameVi || k.nameVi === k.name || !k.nameKo)) {
          itemsToTranslate.push({ id: k.id, textEn: k.name, context: 'kpi' });
        }
      });
      cfg.annualObjectives?.forEach((o) => {
        if (o.title && (!o.titleVi || o.titleVi === o.title || !o.titleKo)) {
          itemsToTranslate.push({ id: o.id, textEn: o.title, context: 'objective' });
        }
      });
      cfg.threeYearObjectives?.forEach((o) => {
        if (o.title && (!o.titleVi || o.titleVi === o.title || !o.titleKo)) {
          itemsToTranslate.push({ id: o.id, textEn: o.title, context: 'objective' });
        }
      });
      cfg.priorities?.forEach((p) => {
        if (p.title && (!p.titleVi || p.titleVi === p.title || !p.titleKo)) {
          itemsToTranslate.push({ id: p.id, textEn: p.title, context: 'priority' });
        }
      });
    });

    if (itemsToTranslate.length === 0) return configs;

    setIsTranslating(true);
    try {
      const results = await syncService.translateBatch(itemsToTranslate);
      const resMap = new Map<string, { textVi: string; textKo: string }>();
      results.forEach((r) => {
        resMap.set(r.id, { textVi: r.textVi, textKo: r.textKo });
      });

      const updated = configs.map((cfg) => {
        return {
          ...cfg,
          kpis: cfg.kpis?.map((k) => {
            const trans = resMap.get(k.id);
            if (!trans) return k;
            return {
              ...k,
              nameVi: trans.textVi || k.nameVi || k.name,
              nameKo: trans.textKo || k.nameKo || '',
            };
          }),
          annualObjectives: cfg.annualObjectives?.map((o) => {
            const trans = resMap.get(o.id);
            if (!trans) return o;
            return {
              ...o,
              titleVi: trans.textVi || o.titleVi || o.title,
              titleKo: trans.textKo || o.titleKo || '',
            };
          }),
          threeYearObjectives: cfg.threeYearObjectives?.map((o) => {
            const trans = resMap.get(o.id);
            if (!trans) return o;
            return {
              ...o,
              titleVi: trans.textVi || o.titleVi || o.title,
              titleKo: trans.textKo || o.titleKo || '',
            };
          }),
          priorities: cfg.priorities?.map((p) => {
            const trans = resMap.get(p.id);
            if (!trans) return p;
            return {
              ...p,
              titleVi: trans.textVi || p.titleVi || p.title,
              titleKo: trans.textKo || p.titleKo || '',
            };
          }),
        };
      });

      setTranslatedCount(results.length);
      return updated;
    } catch (err) {
      console.error('Error during auto-batch-translation:', err);
      return configs;
    } finally {
      setIsTranslating(false);
    }
  };

  // Process File Upload
  const handleProcessFile = (file: File) => {
    setErrorMsg(null);
    setIsProcessing(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await loadXLSX();
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        setWorkbook(wb);

        const configs: SheetMappingConfig[] = wb.SheetNames.map((sName, idx) => {
          const ws = wb.Sheets[sName];
          const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
            defval: '',
            raw: false,
          });
          const targetType = autoDetectTargetType(sName, idx);
          const parsed = parseSheetData(rawRows, targetType);

          return {
            sheetName: sName,
            targetType,
            rowCount: rawRows.length,
            detectedSummary: parsed.detectedSummary || `${rawRows.length} dòng`,
            kpis: parsed.kpis,
            annualObjectives: parsed.annualObjectives,
            threeYearObjectives: parsed.threeYearObjectives,
            priorities: parsed.priorities,
            resources: parsed.resources,
          };
        });

        setSheetConfigs(configs);
        if (configs.length > 0) {
          setPreviewSheetName(configs[0].sheetName);
        }

        if (autoTranslateEnabled) {
          runBatchTranslation(configs).then((translatedConfigs) => {
            setSheetConfigs(translatedConfigs);
          });
        }
      } catch (err: any) {
        console.error('Error reading Excel file:', err);
        setErrorMsg(
          isVi
            ? 'Không thể đọc file Excel. Vui lòng kiểm tra file .xlsx hoặc .xls hợp lệ.'
            : 'Failed to read Excel file. Please ensure it is a valid .xlsx or .xls file.'
        );
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg(isVi ? 'Lỗi đọc file từ thiết bị.' : 'Error reading file.');
      setIsProcessing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Update target mapping for a specific sheet
  const handleTargetChange = async (sheetName: string, newTarget: SheetTargetType) => {
    if (!workbook) return;
    const ws = workbook.Sheets[sheetName];
    if (!ws) return;

    const XLSX = await loadXLSX();
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
      defval: '',
      raw: false,
    });
    const parsed = parseSheetData(rawRows, newTarget);

    setSheetConfigs((prev) =>
      prev.map((cfg) => {
        if (cfg.sheetName !== sheetName) return cfg;
        return {
          ...cfg,
          targetType: newTarget,
          detectedSummary: parsed.detectedSummary || `${rawRows.length} dòng`,
          kpis: parsed.kpis,
          annualObjectives: parsed.annualObjectives,
          threeYearObjectives: parsed.threeYearObjectives,
          priorities: parsed.priorities,
          resources: parsed.resources,
        };
      })
    );
  };

  // Download Comprehensive 6-Sheet Samho Template
  const handleDownload6SheetTemplate = async () => {
    const XLSX = await loadXLSX();
    const wb = XLSX.utils.book_new();

    // 1. L1 Bowling Chart
    const l1BowlingRows = [
      {
        'Mã KPI (Code)': 'L1 1.1.1',
        'Tên chỉ số (English)': 'Increasing PPH from 0.98 to 1.01',
        'Tên chỉ số (Tiếng Việt)': 'Tăng PPH từ 0.98 lên 1.01',
        'Bộ phận (Dept)': 'Lean',
        'Đơn vị (Unit)': 'points',
        'Chiều hướng (Target)': 'higher',
        'Người phụ trách (Owner)': 'Lean: Quang',
        Jan_Target: 0.99,
        Jan_Actual: 1.0,
        Feb_Target: 0.99,
        Feb_Actual: 0.99,
        Mar_Target: 0.99,
        Mar_Actual: 1.0,
        Apr_Target: 1.0,
        Apr_Actual: 1.0,
        May_Target: 1.0,
        May_Actual: 1.01,
        Jun_Target: 1.0,
        Jun_Actual: 1.0,
        Jul_Target: 1.0,
        Jul_Actual: '',
        Aug_Target: 1.0,
        Aug_Actual: '',
        Sep_Target: 1.0,
        Sep_Actual: '',
        Oct_Target: 1.01,
        Oct_Actual: '',
        Nov_Target: 1.01,
        Nov_Actual: '',
        Dec_Target: 1.01,
        Dec_Actual: '',
      },
      {
        'Mã KPI (Code)': 'L1 1.1.2',
        'Tên chỉ số (English)': 'Production plan execution rate',
        'Tên chỉ số (Tiếng Việt)': 'Tỷ lệ hoàn thành kế hoạch sản xuất',
        'Bộ phận (Dept)': 'Production',
        'Đơn vị (Unit)': '%',
        'Chiều hướng (Target)': 'higher',
        'Người phụ trách (Owner)': 'Giám đốc Sản xuất',
        Jan_Target: 98,
        Jan_Actual: 97.5,
        Feb_Target: 98,
        Feb_Actual: 98.2,
        Mar_Target: 98.5,
        Mar_Actual: 98.6,
        Apr_Target: 99,
        Apr_Actual: '',
        May_Target: 99,
        May_Actual: '',
        Jun_Target: 99,
        Jun_Actual: '',
        Jul_Target: 99.5,
        Jul_Actual: '',
        Aug_Target: 99.5,
        Aug_Actual: '',
        Sep_Target: 99.5,
        Sep_Actual: '',
        Oct_Target: 100,
        Oct_Actual: '',
        Nov_Target: 100,
        Nov_Actual: '',
        Dec_Target: 100,
        Dec_Actual: '',
      },
    ];

    // 2. L1 X-Matrix
    const l1XMatrixRows = [
      {
        'Loại (Type)': '3Y_Objective',
        'Mã (Code)': '3Y.1',
        'Tiêu đề (Title)': '3 Year Breakthrough Objectives (2026-2028)',
        'Tiêu đề VN (TitleVi)': 'Mục tiêu đột phá 3 năm (2026-2028)',
        'Kỳ hạn (Period)': '2026 - 2028',
      },
      {
        'Loại (Type)': 'Annual_Objective',
        'Mã (Code)': 'L1.1',
        'Tiêu đề (Title)': 'Best partnership factory for NB',
        'Tiêu đề VN (TitleVi)': 'Nhà máy đối tác tốt nhất cho New Balance',
        'Kỳ hạn (Period)': '2026',
      },
      {
        'Loại (Type)': 'Annual_Objective',
        'Mã (Code)': 'L1.2',
        'Tiêu đề (Title)': 'Capacity expansion to 832k/month',
        'Tiêu đề VN (TitleVi)': 'Mở rộng năng lực sản xuất lên 832,000 đôi/tháng',
        'Kỳ hạn (Period)': '2026',
      },
      {
        'Loại (Type)': 'Priority',
        'Mã (Code)': 'L1 1.1.1',
        'Tiêu đề (Title)': 'PPH (Product Per Hour)',
        'Tiêu đề VN (TitleVi)': 'Tăng chỉ số sản lượng trên giờ công (PPH)',
      },
      {
        'Loại (Type)': 'Priority',
        'Mã (Code)': 'L1 1.1.2',
        'Tiêu đề (Title)': 'Miniline',
        'Tiêu đề VN (TitleVi)': 'Phát triển & Tối ưu mô hình Chuyền nhỏ',
      },
      {
        'Loại (Type)': 'Resource',
        'Mã (Code)': 'lean',
        'Tiêu đề (Title)': 'Quang',
        'Bộ phận (Dept)': 'Lean',
      },
      {
        'Loại (Type)': 'Resource',
        'Mã (Code)': 'prod',
        'Tiêu đề (Title)': 'WSPark',
        'Bộ phận (Dept)': 'Production',
      },
    ];

    // 3. L2 Bowling Chart
    const l2BowlingRows = [
      {
        'Mã KPI (Code)': 'L2 1.1.1',
        'Tên chỉ số (English)': 'Production plan execution rate - Factory 1',
        'Tên chỉ số (Tiếng Việt)': 'Tỷ lệ hoàn thành kế hoạch sản xuất - Xưởng 1',
        'Bộ phận (Dept)': 'Production',
        'Đơn vị (Unit)': '%',
        'Chiều hướng (Target)': 'higher',
        'Người phụ trách (Owner)': 'Xưởng 1: Manager',
        Jan_Target: 98,
        Jan_Actual: 98.1,
        Feb_Target: 98,
        Feb_Actual: 98.4,
        Mar_Target: 98.5,
        Mar_Actual: 98.8,
        Apr_Target: 99,
        Apr_Actual: '',
        May_Target: 99,
        May_Actual: '',
        Jun_Target: 99,
        Jun_Actual: '',
        Jul_Target: 99.5,
        Jul_Actual: '',
        Aug_Target: 99.5,
        Aug_Actual: '',
        Sep_Target: 99.5,
        Sep_Actual: '',
        Oct_Target: 100,
        Oct_Actual: '',
        Nov_Target: 100,
        Nov_Actual: '',
        Dec_Target: 100,
        Dec_Actual: '',
      },
    ];

    // 4. L2 X-Matrix
    const l2XMatrixRows = [
      {
        'Loại (Type)': 'Annual_Objective',
        'Mã (Code)': 'L2.1',
        'Tiêu đề (Title)': 'Factory efficiency optimization 2026',
        'Tiêu đề VN (TitleVi)': 'Tối ưu hóa hiệu suất xưởng 2026',
      },
      {
        'Loại (Type)': 'Priority',
        'Mã (Code)': 'L2 1.1.1',
        'Tiêu đề (Title)': 'Lean flow implementation',
        'Tiêu đề VN (TitleVi)': 'Triển khai dòng chảy tinh gọn Lean',
      },
    ];

    // 5. L3 Bowling Chart
    const l3BowlingRows = [
      {
        'Mã KPI (Code)': 'L3 1.1.1',
        'Tên chỉ số (English)': 'Hourly line balance tracking',
        'Tên chỉ số (Tiếng Việt)': 'Theo dõi cân bằng chuyền từng giờ',
        'Bộ phận (Dept)': 'Lean',
        'Đơn vị (Unit)': '%',
        'Chiều hướng (Target)': 'higher',
        'Người phụ trách (Owner)': 'Lean: Huy/Trang',
        Jan_Target: 95,
        Jan_Actual: 95.5,
        Feb_Target: 95,
        Feb_Actual: 96,
        Mar_Target: 96,
        Mar_Actual: 96.2,
        Apr_Target: 96.5,
        Apr_Actual: '',
        May_Target: 97,
        May_Actual: '',
        Jun_Target: 97,
        Jun_Actual: '',
        Jul_Target: 97.5,
        Jul_Actual: '',
        Aug_Target: 98,
        Aug_Actual: '',
        Sep_Target: 98,
        Sep_Actual: '',
        Oct_Target: 98.5,
        Oct_Actual: '',
        Nov_Target: 99,
        Nov_Actual: '',
        Dec_Target: 99,
        Dec_Actual: '',
      },
    ];

    // 6. L3 X-Matrix
    const l3XMatrixRows = [
      {
        'Loại (Type)': 'Annual_Objective',
        'Mã (Code)': 'L3.1',
        'Tiêu đề (Title)': 'Department Kaizen & Digitalization',
        'Tiêu đề VN (TitleVi)': 'Kaizen và Chuyển đổi số cấp Bộ phận',
      },
      {
        'Loại (Type)': 'Priority',
        'Mã (Code)': 'L3 1.1.1',
        'Tiêu đề (Title)': 'Line 1 to 5 Digital SMED',
        'Tiêu đề VN (TitleVi)': 'Áp dụng SMED số hóa chuyền 1 - 5',
      },
    ];

    const s1 = XLSX.utils.json_to_sheet(l1BowlingRows);
    const s2 = XLSX.utils.json_to_sheet(l1XMatrixRows);
    const s3 = XLSX.utils.json_to_sheet(l2BowlingRows);
    const s4 = XLSX.utils.json_to_sheet(l2XMatrixRows);
    const s5 = XLSX.utils.json_to_sheet(l3BowlingRows);
    const s6 = XLSX.utils.json_to_sheet(l3XMatrixRows);

    XLSX.utils.book_append_sheet(wb, s1, '1. L1 Bowling Chart');
    XLSX.utils.book_append_sheet(wb, s2, '2. L1 X-Matrix');
    XLSX.utils.book_append_sheet(wb, s3, '3. L2 Bowling Chart');
    XLSX.utils.book_append_sheet(wb, s4, '4. L2 X-Matrix');
    XLSX.utils.book_append_sheet(wb, s5, '5. L3 Bowling Chart');
    XLSX.utils.book_append_sheet(wb, s6, '6. L3 X-Matrix');

    XLSX.writeFile(wb, 'Vietnam_Samho_Policy_Deployment_6_Sheets_Template.xlsx');
  };

  // Submit All Mapped Sheets
  const handleSubmitAllSheets = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const multiPayload: MultiSheetImportData = {
        l1Kpis: [],
        l2Kpis: [],
        l3Kpis: [],
        l1AnnualObjectives: [],
        l2AnnualObjectives: [],
        l3AnnualObjectives: [],
        l1ThreeYearObjectives: [],
        l2ThreeYearObjectives: [],
        l3ThreeYearObjectives: [],
        l1Priorities: [],
        l2Priorities: [],
        l3Priorities: [],
        l1Resources: [],
        l2Resources: [],
        l3Resources: [],
      };

      let activeCount = 0;

      sheetConfigs.forEach((cfg) => {
        if (cfg.targetType === 'IGNORE') return;
        activeCount++;

        if (cfg.targetType === 'L1_BOWLING' && cfg.kpis) {
          multiPayload.l1Kpis!.push(...cfg.kpis);
        } else if (cfg.targetType === 'L2_BOWLING' && cfg.kpis) {
          multiPayload.l2Kpis!.push(...cfg.kpis);
        } else if (cfg.targetType === 'L3_BOWLING' && cfg.kpis) {
          multiPayload.l3Kpis!.push(...cfg.kpis);
        } else if (cfg.targetType === 'L1_XMATRIX') {
          if (cfg.annualObjectives) multiPayload.l1AnnualObjectives!.push(...cfg.annualObjectives);
          if (cfg.threeYearObjectives) multiPayload.l1ThreeYearObjectives!.push(...cfg.threeYearObjectives);
          if (cfg.priorities) multiPayload.l1Priorities!.push(...cfg.priorities);
          if (cfg.resources) multiPayload.l1Resources!.push(...cfg.resources);
        } else if (cfg.targetType === 'L2_XMATRIX') {
          if (cfg.annualObjectives) multiPayload.l2AnnualObjectives!.push(...cfg.annualObjectives);
          if (cfg.threeYearObjectives) multiPayload.l2ThreeYearObjectives!.push(...cfg.threeYearObjectives);
          if (cfg.priorities) multiPayload.l2Priorities!.push(...cfg.priorities);
          if (cfg.resources) multiPayload.l2Resources!.push(...cfg.resources);
        } else if (cfg.targetType === 'L3_XMATRIX') {
          if (cfg.annualObjectives) multiPayload.l3AnnualObjectives!.push(...cfg.annualObjectives);
          if (cfg.threeYearObjectives) multiPayload.l3ThreeYearObjectives!.push(...cfg.threeYearObjectives);
          if (cfg.priorities) multiPayload.l3Priorities!.push(...cfg.priorities);
          if (cfg.resources) multiPayload.l3Resources!.push(...cfg.resources);
        } else if (cfg.targetType === 'OBJ_3YEAR' && cfg.threeYearObjectives) {
          multiPayload.l1ThreeYearObjectives!.push(...cfg.threeYearObjectives);
        } else if (cfg.targetType === 'OBJ_ANNUAL' && cfg.annualObjectives) {
          multiPayload.l1AnnualObjectives!.push(...cfg.annualObjectives);
        } else if (cfg.targetType === 'PRIORITIES' && cfg.priorities) {
          multiPayload.l1Priorities!.push(...cfg.priorities);
        } else if (cfg.targetType === 'RESOURCES' && cfg.resources) {
          multiPayload.l1Resources!.push(...cfg.resources);
        }
      });

      if (activeCount === 0) {
        throw new Error('Vui lòng chọn ít nhất 1 sheet để nhập dữ liệu.');
      }

      if (onConfirmMultiImport) {
        await onConfirmMultiImport(multiPayload);
      } else {
        // Fallback for single level
        const allKpis = [
          ...(multiPayload.l1Kpis || []),
          ...(multiPayload.l2Kpis || []),
          ...(multiPayload.l3Kpis || []),
        ];
        await onConfirmImport(allKpis, currentLevel);
      }

      onClose();
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'Lỗi khi nhập và đồng bộ dữ liệu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewConfig = sheetConfigs.find((c) => c.sheetName === previewSheetName);

  // Compute aggregate totals
  const totalKpis = sheetConfigs.reduce((acc, c) => acc + (c.kpis?.length || 0), 0);
  const totalObjs = sheetConfigs.reduce(
    (acc, c) =>
      acc + (c.annualObjectives?.length || 0) + (c.threeYearObjectives?.length || 0),
    0
  );
  const totalPrios = sheetConfigs.reduce((acc, c) => acc + (c.priorities?.length || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-950/80 border border-emerald-700/80 rounded-xl text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center space-x-2">
                <span>
                  {isVi
                    ? 'Nhập & Ánh xạ thông minh 6 Sheet Excel'
                    : 'Smart 6-Sheet Excel Mapping & Import'}
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-semibold">
                  Multi-Sheet Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isVi
                  ? 'Tự động nhận diện hoặc tùy chỉnh map 6 Sheet (L1, L2, L3, Bowling Chart & X-Matrix) chuẩn Vietnam Samho'
                  : 'Auto-maps 6 sheets across L1, L2, L3 Policy, Bowling Charts & X-Matrix'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Top banner: download 6-sheet template */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  {isVi
                    ? 'Chưa có file mẫu chuẩn 6 Sheet Vietnam Samho?'
                    : 'Need the standard 6-Sheet Samho template?'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isVi
                    ? 'Tải file mẫu gồm 6 sheet: L1 Bowling, L1 X-Matrix, L2 Bowling, L2 X-Matrix, L3 Bowling, L3 X-Matrix'
                    : 'Download template containing all 6 pre-configured sheets with benchmark data'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownload6SheetTemplate}
              className="flex items-center space-x-2 text-xs text-emerald-300 hover:text-white font-semibold px-3.5 py-2 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 transition cursor-pointer shadow-xs shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isVi ? 'Tải mẫu Excel 6 Sheet chuẩn' : 'Download 6-Sheet Template'}</span>
            </button>
          </div>

          {/* File Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleProcessFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 ${
              isDragging
                ? 'border-emerald-500 bg-emerald-950/20'
                : 'border-slate-700 hover:border-slate-500 bg-slate-800/30 hover:bg-slate-800/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessFile(e.target.files[0]);
                }
              }}
            />
            <div className="p-3 bg-slate-800 rounded-full border border-slate-700 text-emerald-400">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">
                {fileName ? (
                  <span className="text-emerald-400 font-semibold">{fileName}</span>
                ) : isVi ? (
                  'Bấm hoặc Kéo thả file Excel chứa 6 Sheet vào đây'
                ) : (
                  'Click or Drag & drop your 6-Sheet Excel workbook here'
                )}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isVi
                  ? 'Hệ thống sẽ tự động quét tất cả các Sheet và phân loại đúng vào từng Cấp chính sách'
                  : 'The system auto-detects each sheet and assigns it to the matching policy level'}
              </p>
            </div>
          </div>

          {/* Error display */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 6-Sheet Mapping Table */}
          {sheetConfigs.length > 0 && (
            <div className="space-y-4">
              {/* AI Auto-Translation Control & Status Bar */}
              <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-slate-900 border border-indigo-700/60 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-600/30 rounded-lg text-indigo-300 border border-indigo-500/40 shrink-0">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Languages className="w-3.5 h-3.5 text-indigo-400" />
                        {isVi ? 'Tự Động Dịch AI 3 Ngôn Ngữ (English ➔ Tiếng Việt & 한국어)' : 'AI Trilingual Auto-Translation (EN ➔ VI & KO)'}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {isVi ? 'Tự động khi chỉ có Tiếng Anh' : 'Auto on English input'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {isVi
                        ? 'Khi file Excel chỉ có Tiếng Anh, hệ thống dùng AI tự động dịch chuẩn xác sang Tiếng Việt và Tiếng Hàn cho toàn bộ KPI & Mục tiêu.'
                        : 'If your Excel file only contains English, AI automatically translates metrics & objectives into Vietnamese and Korean.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {translatedCount !== null && (
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 rounded">
                      ✓ {isVi ? `Đã dịch ${translatedCount} mục` : `Translated ${translatedCount} items`}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => runBatchTranslation(sheetConfigs).then(setSheetConfigs)}
                    disabled={isTranslating}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTranslating ? 'animate-spin' : ''}`} />
                    <span>{isTranslating ? (isVi ? 'Đang dịch AI...' : 'Translating...') : (isVi ? 'Dịch lại AI' : 'Re-translate AI')}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">
                    {isVi
                      ? `Tìm thấy ${sheetConfigs.length} Sheet trong file Excel — Cấu hình ánh xạ đích (Target Mapping):`
                      : `Found ${sheetConfigs.length} Sheets in workbook — Map each sheet to its destination:`}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-400">
                  <span className="font-mono text-emerald-400">{totalKpis} KPI</span>
                  <span>•</span>
                  <span className="font-mono text-blue-400">{totalObjs} Mục tiêu</span>
                  <span>•</span>
                  <span className="font-mono text-amber-400">{totalPrios} Ưu tiên</span>
                </div>
              </div>

              {/* Sheet List Cards */}
              <div className="grid grid-cols-1 gap-2.5">
                {sheetConfigs.map((cfg, idx) => (
                  <div
                    key={cfg.sheetName}
                    className={`flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-xl border transition ${
                      cfg.targetType === 'IGNORE'
                        ? 'bg-slate-900/50 border-slate-800 text-slate-500'
                        : 'bg-slate-800/40 border-slate-700/80 text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    {/* Left: Sheet name & status */}
                    <div className="flex items-center space-x-3 mb-2 md:mb-0">
                      <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs text-white">
                            {cfg.sheetName}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                            {cfg.rowCount} dòng
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-400/90 mt-0.5">
                          ✓ {cfg.detectedSummary}
                        </p>
                      </div>
                    </div>

                    {/* Right: Destination Dropdown & Preview Button */}
                    <div className="flex items-center space-x-2 self-end md:self-auto">
                      <select
                        value={cfg.targetType}
                        onChange={(e) =>
                          handleTargetChange(cfg.sheetName, e.target.value as SheetTargetType)
                        }
                        className={`text-xs rounded-lg px-3 py-1.5 font-medium border focus:outline-none transition cursor-pointer ${
                          cfg.targetType === 'IGNORE'
                            ? 'bg-slate-900 border-slate-700 text-slate-500'
                            : 'bg-slate-900 border-emerald-600 text-emerald-300 font-semibold'
                        }`}
                      >
                        <optgroup label="Cấp 1 - L1 (TOP Level)">
                          <option value="L1_BOWLING">🎯 L1 - Bowling Chart (KPIs & 12 Tháng)</option>
                          <option value="L1_XMATRIX">🎯 L1 - X-Matrix (Mục tiêu & Ưu tiên hàng đầu)</option>
                        </optgroup>
                        <optgroup label="Cấp 2 - L2 (Factory Level)">
                          <option value="L2_BOWLING">🎯 L2 - Bowling Chart (KPIs & 12 Tháng)</option>
                          <option value="L2_XMATRIX">🎯 L2 - X-Matrix (Mục tiêu & Ưu tiên hàng đầu)</option>
                        </optgroup>
                        <optgroup label="Cấp 3 - L3 (Department Level)">
                          <option value="L3_BOWLING">🎯 L3 - Bowling Chart (KPIs & 12 Tháng)</option>
                          <option value="L3_XMATRIX">🎯 L3 - X-Matrix (Mục tiêu & Ưu tiên hàng đầu)</option>
                        </optgroup>
                        <optgroup label="Thành phần chuyên biệt">
                          <option value="OBJ_3YEAR">📌 Mục tiêu đột phá 3 năm (2026-2028)</option>
                          <option value="OBJ_ANNUAL">📌 Mục tiêu hàng năm (Annual Objectives)</option>
                          <option value="PRIORITIES">📌 Ưu tiên cải thiện hàng đầu (Priorities)</option>
                          <option value="RESOURCES">📌 Nguồn lực nhân sự (Resources)</option>
                        </optgroup>
                        <option value="IGNORE">🚫 Bỏ qua (Không nhập sheet này)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setPreviewSheetName(cfg.sheetName)}
                        className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                          previewSheetName === cfg.sheetName
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                            : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                        }`}
                        title={isVi ? 'Xem trước dữ liệu trích xuất' : 'Preview extracted data'}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Data Preview Tab */}
              {previewConfig && previewConfig.targetType !== 'IGNORE' && (
                <div className="mt-4 border border-slate-800 rounded-xl bg-slate-950 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-semibold text-slate-300 flex items-center space-x-2">
                      <span>Xem trước dữ liệu Sheet:</span>
                      <span className="text-emerald-400 font-mono">[{previewConfig.sheetName}]</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-sky-300 font-mono">[{previewConfig.targetType}]</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {previewConfig.detectedSummary}
                    </span>
                  </div>

                  {previewConfig.kpis && previewConfig.kpis.length > 0 && (
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-900 sticky top-0 text-slate-400 font-semibold border-b border-slate-800">
                          <tr>
                            <th className="p-2">Mã KPI</th>
                            <th className="p-2">🇺🇸 Tên Tiếng Anh</th>
                            <th className="p-2">🇻🇳 Tiếng Việt</th>
                            <th className="p-2">🇰🇷 한국어</th>
                            <th className="p-2">Bộ phận</th>
                            <th className="p-2">Jan T/A</th>
                            <th className="p-2">Feb T/A</th>
                            <th className="p-2">Mar T/A</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {previewConfig.kpis.map((k, i) => (
                            <tr key={i} className="hover:bg-slate-900/50 text-slate-300">
                              <td className="p-2 font-mono text-emerald-400 font-semibold whitespace-nowrap">{k.code}</td>
                              <td className="p-2 text-slate-200 max-w-xs">{k.name}</td>
                              <td className="p-2 text-emerald-300 max-w-xs">
                                {k.nameVi ? (
                                  <span className="flex items-center gap-1">
                                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1 py-0.2 rounded shrink-0">VI</span>
                                    <span>{k.nameVi}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-500 italic">Chưa có</span>
                                )}
                              </td>
                              <td className="p-2 text-indigo-300 max-w-xs">
                                {k.nameKo ? (
                                  <span className="flex items-center gap-1">
                                    <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1 py-0.2 rounded shrink-0">KO</span>
                                    <span>{k.nameKo}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-500 italic">Chưa có</span>
                                )}
                              </td>
                              <td className="p-2 text-slate-400 whitespace-nowrap">{k.department} ({k.unit})</td>
                              <td className="p-2 font-mono text-[11px] whitespace-nowrap">
                                {k.monthly?.Jan?.target ?? '-'} / {k.monthly?.Jan?.actual ?? '-'}
                              </td>
                              <td className="p-2 font-mono text-[11px] whitespace-nowrap">
                                {k.monthly?.Feb?.target ?? '-'} / {k.monthly?.Feb?.actual ?? '-'}
                              </td>
                              <td className="p-2 font-mono text-[11px] whitespace-nowrap">
                                {k.monthly?.Mar?.target ?? '-'} / {k.monthly?.Mar?.actual ?? '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {previewConfig.annualObjectives && previewConfig.annualObjectives.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Mục tiêu năm (Bản dịch 3 ngôn ngữ):</span>
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {previewConfig.annualObjectives.map((o) => (
                          <div key={o.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-blue-300 font-bold px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800 shrink-0">{o.code}</span>
                              <span className="text-slate-200 font-medium">{o.title}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              {o.titleVi && (
                                <span className="text-emerald-300 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded">
                                  🇻🇳 {o.titleVi}
                                </span>
                              )}
                              {o.titleKo && (
                                <span className="text-indigo-300 bg-indigo-950/70 border border-indigo-800/60 px-2 py-0.5 rounded">
                                  🇰🇷 {o.titleKo}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewConfig.threeYearObjectives && previewConfig.threeYearObjectives.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Mục tiêu 3 năm (Bản dịch 3 ngôn ngữ):</span>
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {previewConfig.threeYearObjectives.map((o) => (
                          <div key={o.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-amber-300 font-bold px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 shrink-0">{o.code}</span>
                              <span className="text-slate-200 font-medium">{o.title}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              {o.titleVi && (
                                <span className="text-emerald-300 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded">
                                  🇻🇳 {o.titleVi}
                                </span>
                              )}
                              {o.titleKo && (
                                <span className="text-indigo-300 bg-indigo-950/70 border border-indigo-800/60 px-2 py-0.5 rounded">
                                  🇰🇷 {o.titleKo}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewConfig.priorities && previewConfig.priorities.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Ưu tiên cải tiến (Bản dịch 3 ngôn ngữ):</span>
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {previewConfig.priorities.map((p) => (
                          <div key={p.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-amber-300 font-bold px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 shrink-0">{p.code}</span>
                              <span className="text-slate-200 font-medium">{p.title}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              {p.titleVi && (
                                <span className="text-emerald-300 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded">
                                  🇻🇳 {p.titleVi}
                                </span>
                              )}
                              {p.titleKo && (
                                <span className="text-indigo-300 bg-indigo-950/70 border border-indigo-800/60 px-2 py-0.5 rounded">
                                  🇰🇷 {p.titleKo}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/95">
          <p className="text-xs text-slate-500">
            {isVi
              ? 'Tất cả 6 sheet sẽ được nhập và đồng bộ thời gian thực đến toàn bộ máy tính khác ngay lập tức.'
              : 'All mapped sheets will be saved and synced live across all active devices.'}
          </p>
          <div className="flex items-center space-x-3 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              {isVi ? 'Đóng' : 'Close'}
            </button>
            <button
              type="button"
              onClick={handleSubmitAllSheets}
              disabled={sheetConfigs.length === 0 || isSubmitting || isProcessing}
              className={`flex items-center space-x-2 px-6 py-2.5 text-xs font-bold rounded-xl text-white transition cursor-pointer shadow-lg ${
                sheetConfigs.length > 0 && !isSubmitting && !isProcessing
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{isVi ? 'Đang nạp & đồng bộ 6 Sheet...' : 'Syncing 6 Sheets...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>
                    {isVi
                      ? `Nhập & Đồng bộ ${sheetConfigs.filter((c) => c.targetType !== 'IGNORE').length} Sheet vào Hệ thống`
                      : `Import & Sync ${sheetConfigs.filter((c) => c.targetType !== 'IGNORE').length} Sheets`}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
