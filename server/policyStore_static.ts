import {
  LevelPolicyData,
  KpiItem,
  MonthKey,
  BreakthroughObjective,
  ImprovementPriority,
  ResourcePerson,
  PolicyLevel,
} from '../src/types';
import {
  INITIAL_LEVEL_1_DATA,
  INITIAL_LEVEL_2_DATA,
  INITIAL_LEVEL_3_DATA,
} from '../src/data/samhoData';

export interface StoreState {
  version: number;
  lastModified: number;
  lastAction: string;
  lastClientId?: string;
  l1Data: LevelPolicyData;
  l2Data: LevelPolicyData;
  l3Data: LevelPolicyData;
}

const STORAGE_KEY = 'samho_policy_state_v1';
const BACKUP_KEY = 'samho_policy_state_backup_v1';

function cloneBaseline(): StoreState {
  return {
    version: 1,
    lastModified: Date.now(),
    lastAction: 'Initialized with Vietnam Samho baseline dataset',
    lastClientId: 'system',
    l1Data: JSON.parse(JSON.stringify(INITIAL_LEVEL_1_DATA)),
    l2Data: JSON.parse(JSON.stringify(INITIAL_LEVEL_2_DATA)),
    l3Data: JSON.parse(JSON.stringify(INITIAL_LEVEL_3_DATA)),
  };
}

function normalize(parsed: any): StoreState | null {
  if (!parsed || !parsed.l1Data || !parsed.l2Data || !parsed.l3Data) return null;
  return {
    version: parsed.version || 1,
    lastModified: parsed.lastModified || Date.now(),
    lastAction: parsed.lastAction || 'System loaded from storage',
    lastClientId: parsed.lastClientId || 'system',
    l1Data: parsed.l1Data,
    l2Data: parsed.l2Data,
    l3Data: parsed.l3Data,
  };
}

class PolicyStore {
  private state: StoreState;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.state = this.loadInitialState();
    this.persistToDisk();
  }

  private loadInitialState(): StoreState {
    // 1. Prefer what this browser already has
    for (const key of [STORAGE_KEY, BACKUP_KEY]) {
      try {
        const raw = localStorage.getItem(key);
        if (raw && raw.trim().length > 0) {
          const restored = normalize(JSON.parse(raw));
          if (restored) {
            console.log(`[PolicyStore] Loaded saved data from localStorage:${key}, version: ${restored.version}`);
            return restored;
          }
        }
      } catch (err) {
        console.warn(`[PolicyStore] Could not load from localStorage:${key}:`, err);
      }
    }

    // 2. First visit on this device: adopt the seeded snapshot shipped with the site
    try {
      const raw = window.__SAMHO_SEED__;
      if (raw) {
        const seeded = normalize(raw);
        if (seeded) {
          console.log(`[PolicyStore] Loaded shipped seed data, version: ${seeded.version}`);
          return seeded;
        }
      }
    } catch (err) {
      console.warn('[PolicyStore] Could not read shipped seed data:', err);
    }

    // 3. Nothing available: fall back to the compiled-in baseline
    console.log('[PolicyStore] Initializing store with default Vietnam Samho baseline data');
    return cloneBaseline();
  }

  private scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.persistToDisk();
    }, 80);
  }

  private persistToDisk() {
    try {
      const serialized = JSON.stringify(this.state);
      localStorage.setItem(STORAGE_KEY, serialized);
      localStorage.setItem(BACKUP_KEY, serialized);
      console.log(`[PolicyStore] Persisted data to localStorage (version: ${this.state.version})`);
    } catch (err) {
      // QuotaExceededError is the realistic failure here (5-10MB browser cap)
      console.error('[PolicyStore] Error persisting data to localStorage:', err);
      try {
        localStorage.setItem(BACKUP_KEY, JSON.stringify(this.state));
      } catch {}
    }
  }

  private touch(actionDescription: string, clientId?: string) {
    this.state.version += 1;
    this.state.lastModified = Date.now();
    this.state.lastAction = actionDescription;
    this.state.lastClientId = clientId || 'unknown';
    this.scheduleSave();
  }

  private getLevelDataRef(level: PolicyLevel): LevelPolicyData {
    if (level === 'L2') return this.state.l2Data;
    if (level === 'L3') return this.state.l3Data;
    return this.state.l1Data;
  }

  public getAll(): StoreState {
    return this.state;
  }

  public syncFromClient(payload: {
    l1Data?: LevelPolicyData;
    l2Data?: LevelPolicyData;
    l3Data?: LevelPolicyData;
    lastModified?: number;
    clientId?: string;
    force?: boolean;
  }): StoreState {
    if (payload.l1Data && payload.l2Data && payload.l3Data) {
      const isServerBaseline =
        this.state.version <= 1 ||
        (this.state.lastAction && this.state.lastAction.startsWith('Initialized with')) ||
        this.state.lastClientId === 'system';

      const isClientNewer =
        !!payload.lastModified && payload.lastModified > this.state.lastModified;

      if (payload.force || isServerBaseline || isClientNewer) {
        this.state.l1Data = payload.l1Data;
        this.state.l2Data = payload.l2Data;
        this.state.l3Data = payload.l3Data;
        this.touch('Đồng bộ dữ liệu người dùng từ trình duyệt lên máy chủ', payload.clientId);
        this.persistToDisk();
        console.log('[PolicyStore] Adopted user data from client and persisted safely.');
      }
    }
    return this.state;
  }

  public restoreBackup(
    backupState: { l1Data: LevelPolicyData; l2Data: LevelPolicyData; l3Data: LevelPolicyData },
    clientId?: string
  ): StoreState {
    if (backupState.l1Data && backupState.l2Data && backupState.l3Data) {
      this.state.l1Data = backupState.l1Data;
      this.state.l2Data = backupState.l2Data;
      this.state.l3Data = backupState.l3Data;
      this.touch('Khôi phục toàn bộ dữ liệu từ tệp sao lưu JSON', clientId);
      this.persistToDisk();
      console.log('[PolicyStore] Restored full dataset from JSON backup.');
    }
    return this.state;
  }

  public getVersionInfo() {
    return {
      version: this.state.version,
      lastModified: this.state.lastModified,
      lastAction: this.state.lastAction,
      lastClientId: this.state.lastClientId,
    };
  }

  public updateKpiMonthly(
    level: PolicyLevel,
    kpiId: string,
    month: MonthKey,
    field: 'target' | 'actual',
    value: string | number | null,
    clientId?: string
  ): StoreState {
    let data = this.getLevelDataRef(level);
    let kpi = data.kpis.find((k) => k.id === kpiId);
    if (!kpi) {
      for (const altLevel of ['L1', 'L2', 'L3'] as PolicyLevel[]) {
        const altData = this.getLevelDataRef(altLevel);
        const altKpi = altData.kpis.find((k) => k.id === kpiId);
        if (altKpi) {
          kpi = altKpi;
          data = altData;
          break;
        }
      }
    }

    if (kpi) {
      if (!kpi.monthly) {
        kpi.monthly = {} as any;
      }
      if (!kpi.monthly[month]) {
        kpi.monthly[month] = { target: null, actual: null };
      }
      kpi.monthly[month][field] = value;
      this.touch(`Cập nhật KPI ${kpi.code || kpi.id} tháng ${month} (${field} = ${value})`, clientId);
      this.persistToDisk();
    }
    return this.state;
  }

  public updateKpiDetails(
    level: PolicyLevel,
    kpiId: string,
    problemDescription: string,
    rootCause: string,
    actionPlan: string,
    clientId?: string
  ): StoreState {
    let data = this.getLevelDataRef(level);
    let kpi = data.kpis.find((k) => k.id === kpiId);
    if (!kpi) {
      for (const altLevel of ['L1', 'L2', 'L3'] as PolicyLevel[]) {
        const altData = this.getLevelDataRef(altLevel);
        const altKpi = altData.kpis.find((k) => k.id === kpiId);
        if (altKpi) {
          kpi = altKpi;
          data = altData;
          break;
        }
      }
    }

    if (kpi) {
      kpi.problemDescription = problemDescription;
      kpi.rootCause = rootCause;
      kpi.actionPlan = actionPlan;
      this.touch(`Cập nhật hồ sơ 8D & hành động khắc phục cho KPI ${kpi.code || kpi.id}`, clientId);
      this.persistToDisk();
    }
    return this.state;
  }

  public updateCorrelation(
    level: PolicyLevel,
    key: string,
    value: 'primary' | 'secondary' | 'none',
    clientId?: string
  ): StoreState {
    const data = this.getLevelDataRef(level);
    if (!data.correlations) {
      data.correlations = {};
    }
    data.correlations[key] = value;

    // Semantic synchronization based on cell key structure
    if (key.startsWith('neres_')) {
      // Resource responsibility dot: neres_{priorityId}_{resKey}
      const parts = key.split('_');
      const priorityId = parts[1];
      const resKey = parts.slice(2).join('_');
      // Update priority resource roles in this level or any level
      const allPriorities = [...this.state.l1Data.priorities, ...this.state.l2Data.priorities, ...this.state.l3Data.priorities];
      const p = allPriorities.find((item) => item.id === priorityId);
      if (p) {
        if (!p.resourceRoles) p.resourceRoles = {};
        p.resourceRoles[resKey] = value;
      }
    } else if (key.startsWith('nekpi_')) {
      // KPI correlation: nekpi_{priorityId}_{kpiId}
      const parts = key.split('_');
      const priorityId = parts[1];
      const kpiId = parts.slice(2).join('_');
      const allKpis = [...this.state.l1Data.kpis, ...this.state.l2Data.kpis, ...this.state.l3Data.kpis];
      const k = allKpis.find((item) => item.id === kpiId);
      if (k) {
        const currentLinks = k.linkedPriorityIds || [];
        if (value === 'primary') {
          if (!currentLinks.includes(priorityId)) k.linkedPriorityIds = [...currentLinks, priorityId];
        } else if (value === 'none') {
          k.linkedPriorityIds = currentLinks.filter((id) => id !== priorityId);
        }
      }
    } else if (key.startsWith('nw_')) {
      // Northwest correlation: nw_{priorityId}_{objId}
      const parts = key.split('_');
      const priorityId = parts[1];
      const objId = parts.slice(2).join('_');
      const allPriorities = [...this.state.l1Data.priorities, ...this.state.l2Data.priorities, ...this.state.l3Data.priorities];
      const p = allPriorities.find((item) => item.id === priorityId);
      if (p) {
        const links = p.linkedObjectiveIds || [];
        if (value === 'primary') {
          if (!links.includes(objId)) p.linkedObjectiveIds = [...links, objId];
        } else if (value === 'none') {
          p.linkedObjectiveIds = links.filter((id) => id !== objId);
        }
      }
    } else if (key.startsWith('sw_')) {
      // Southwest correlation: sw_{bObjId}_{lObjId}
      const parts = key.split('_');
      const bObjId = parts[1];
      const lObjId = parts.slice(2).join('_');
      const allObjs = [
        ...this.state.l1Data.threeYearObjectives,
        ...this.state.l2Data.threeYearObjectives,
        ...this.state.l3Data.threeYearObjectives,
        ...this.state.l1Data.annualObjectives,
        ...this.state.l2Data.annualObjectives,
        ...this.state.l3Data.annualObjectives,
      ];
      const b = allObjs.find((item) => item.id === bObjId);
      if (b) {
        const links = b.linkedObjectiveIds || [];
        if (value === 'primary') {
          if (!links.includes(lObjId)) b.linkedObjectiveIds = [...links, lObjId];
        } else if (value === 'none') {
          b.linkedObjectiveIds = links.filter((id) => id !== lObjId);
        }
      }
    }

    this.touch(`Cập nhật ma trận quan hệ [${key} = ${value}] tại cấp ${level}`, clientId);
    this.persistToDisk();
    return this.state;
  }

  public updateKpi(updatedKpi: KpiItem, clientId?: string): StoreState {
    // Check which level it belongs to
    let targetLevel = updatedKpi.level;
    if (!targetLevel) {
      if (this.state.l1Data.kpis.some((k) => k.id === updatedKpi.id)) targetLevel = 'L1';
      else if (this.state.l2Data.kpis.some((k) => k.id === updatedKpi.id)) targetLevel = 'L2';
      else if (this.state.l3Data.kpis.some((k) => k.id === updatedKpi.id)) targetLevel = 'L3';
      else targetLevel = 'L1';
      updatedKpi.level = targetLevel;
    }
    const levels: PolicyLevel[] = ['L1', 'L2', 'L3'];

    for (const lvl of levels) {
      const data = this.getLevelDataRef(lvl);
      if (lvl === targetLevel) {
        const idx = data.kpis.findIndex((k) => k.id === updatedKpi.id);
        if (idx >= 0) {
          data.kpis[idx] = updatedKpi;
        } else {
          data.kpis.unshift(updatedKpi);
        }
      } else {
        // Remove if moved between levels
        data.kpis = data.kpis.filter((k) => k.id !== updatedKpi.id);
      }
    }

    this.touch(`Cập nhật chỉ số KPI ${updatedKpi.code || updatedKpi.name}`, clientId);
    this.persistToDisk();
    return this.state;
  }

  public addKpi(level: PolicyLevel, newKpi: KpiItem, clientId?: string): StoreState {
    const data = this.getLevelDataRef(level);
    data.kpis.unshift(newKpi);
    this.touch(`Thêm chỉ số KPI mới: ${newKpi.code} - ${newKpi.name} vào cấp ${level}`, clientId);
    return this.state;
  }

  public bulkUpsertKpis(level: PolicyLevel, kpis: KpiItem[], clientId?: string): StoreState {
    const data = this.getLevelDataRef(level);
    const mergeMonthlyRecords = (
      existingMonthly: any = {},
      incomingMonthly: any = {}
    ) => {
      const merged: any = { ...existingMonthly };
      for (const [m, rawVals] of Object.entries(incomingMonthly || {})) {
        if (!rawVals) continue;
        const vals = rawVals as { target?: any; actual?: any };
        const prev = merged[m] || { target: null, actual: null };
        const hasT = vals.target !== null && vals.target !== undefined && vals.target !== '';
        const hasA = vals.actual !== null && vals.actual !== undefined && vals.actual !== '';
        merged[m] = {
          target: hasT ? vals.target : prev.target,
          actual: hasA ? vals.actual : prev.actual,
        };
      }
      return merged;
    };

    for (const newKpi of kpis) {
      const idx = data.kpis.findIndex(
        (k) =>
          k.id === newKpi.id ||
          (k.code && newKpi.code && k.code.trim().toLowerCase() === newKpi.code.trim().toLowerCase())
      );
      if (idx >= 0) {
        data.kpis[idx] = {
          ...data.kpis[idx],
          ...newKpi,
          owner: (newKpi.owner && newKpi.owner.trim() !== '' && newKpi.owner !== 'Production') ? newKpi.owner : data.kpis[idx].owner,
          monthly: mergeMonthlyRecords(data.kpis[idx].monthly, newKpi.monthly),
        };
      } else {
        data.kpis.push(newKpi);
      }
    }
    this.touch(`Nhập và cập nhật ${kpis.length} chỉ số KPI từ file Excel vào cấp ${level}`, clientId);
    return this.state;
  }

  public bulkImportMultiLevel(
    payload: {
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
    },
    clientId?: string
  ): StoreState {
    let summary: string[] = [];

    const mergeKpis = (level: PolicyLevel, kpis?: KpiItem[]) => {
      if (!kpis || kpis.length === 0) return;
      const data = this.getLevelDataRef(level);
      for (const newKpi of kpis) {
        const idx = data.kpis.findIndex(
          (k) =>
            k.id === newKpi.id ||
            (k.code && newKpi.code && k.code.trim().toLowerCase() === newKpi.code.trim().toLowerCase())
        );
        if (idx >= 0) {
          const prevMonthly: any = data.kpis[idx].monthly || {};
          const nextMonthly: any = newKpi.monthly || {};
          const mergedMonthly: any = { ...prevMonthly };
          for (const [m, rawVals] of Object.entries(nextMonthly)) {
            if (!rawVals) continue;
            const vals = rawVals as { target?: any; actual?: any };
            const prev = mergedMonthly[m] || { target: null, actual: null };
            const hasT = vals.target !== null && vals.target !== undefined && vals.target !== '';
            const hasA = vals.actual !== null && vals.actual !== undefined && vals.actual !== '';
            mergedMonthly[m] = {
              target: hasT ? vals.target : prev.target,
              actual: hasA ? vals.actual : prev.actual,
            };
          }

          data.kpis[idx] = {
            ...data.kpis[idx],
            ...newKpi,
            owner: (newKpi.owner && newKpi.owner.trim() !== '' && newKpi.owner !== 'Production') ? newKpi.owner : data.kpis[idx].owner,
            monthly: mergedMonthly,
          };
        } else {
          data.kpis.push(newKpi);
        }
      }
      summary.push(`${kpis.length} KPI ${level}`);
    };

    mergeKpis('L1', payload.l1Kpis);
    mergeKpis('L2', payload.l2Kpis);
    mergeKpis('L3', payload.l3Kpis);

    const mergeObjectives = (
      level: PolicyLevel,
      key: 'annualObjectives' | 'threeYearObjectives',
      items?: BreakthroughObjective[]
    ) => {
      if (!items || items.length === 0) return;
      const data = this.getLevelDataRef(level);
      const list = data[key] || [];
      for (const item of items) {
        const idx = list.findIndex(
          (o) =>
            o.id === item.id ||
            (o.code && item.code && o.code.trim().toLowerCase() === item.code.trim().toLowerCase())
        );
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...item };
        } else {
          list.push(item);
        }
      }
      data[key] = list;
      summary.push(`${items.length} mục tiêu ${level}`);
    };

    mergeObjectives('L1', 'annualObjectives', payload.l1AnnualObjectives);
    mergeObjectives('L2', 'annualObjectives', payload.l2AnnualObjectives);
    mergeObjectives('L3', 'annualObjectives', payload.l3AnnualObjectives);
    mergeObjectives('L1', 'threeYearObjectives', payload.l1ThreeYearObjectives);
    mergeObjectives('L2', 'threeYearObjectives', payload.l2ThreeYearObjectives);
    mergeObjectives('L3', 'threeYearObjectives', payload.l3ThreeYearObjectives);

    const mergePriorities = (level: PolicyLevel, items?: ImprovementPriority[]) => {
      if (!items || items.length === 0) return;
      const data = this.getLevelDataRef(level);
      const list = data.priorities || [];
      for (const item of items) {
        const idx = list.findIndex(
          (p) =>
            p.id === item.id ||
            (p.code && item.code && p.code.trim().toLowerCase() === item.code.trim().toLowerCase())
        );
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...item };
        } else {
          list.push(item);
        }
      }
      data.priorities = list;
      summary.push(`${items.length} ưu tiên ${level}`);
    };

    mergePriorities('L1', payload.l1Priorities);
    mergePriorities('L2', payload.l2Priorities);
    mergePriorities('L3', payload.l3Priorities);

    const mergeResources = (level: PolicyLevel, items?: ResourcePerson[]) => {
      if (!items || items.length === 0) return;
      const data = this.getLevelDataRef(level);
      const list = data.resources || [];
      for (const item of items) {
        const idx = list.findIndex(
          (r) =>
            r.key === item.key ||
            (r.name && item.name && r.name.trim().toLowerCase() === item.name.trim().toLowerCase())
        );
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...item };
        } else {
          list.push(item);
        }
      }
      data.resources = list;
      summary.push(`${items.length} nhân sự ${level}`);
    };

    mergeResources('L1', payload.l1Resources);
    mergeResources('L2', payload.l2Resources);
    mergeResources('L3', payload.l3Resources);

    const actionText =
      summary.length > 0
        ? `Đồng bộ nhiều Sheet Excel: ${summary.join(', ')}`
        : 'Đồng bộ dữ liệu từ các Sheet Excel';

    this.touch(actionText, clientId);
    return this.state;
  }

  public deleteKpi(kpiId: string, clientId?: string): StoreState {
    this.state.l1Data.kpis = this.state.l1Data.kpis.filter((k) => k.id !== kpiId);
    this.state.l2Data.kpis = this.state.l2Data.kpis.filter((k) => k.id !== kpiId);
    this.state.l3Data.kpis = this.state.l3Data.kpis.filter((k) => k.id !== kpiId);
    this.touch(`Xóa chỉ số KPI ID ${kpiId}`, clientId);
    return this.state;
  }

  public updateObjective(
    level: PolicyLevel,
    action: 'add' | 'update' | 'delete',
    objective: BreakthroughObjective,
    isThreeYear?: boolean,
    clientId?: string
  ): StoreState {
    const data = this.getLevelDataRef(level);
    const key = isThreeYear ? 'threeYearObjectives' : 'annualObjectives';
    const list = data[key] || [];

    if (action === 'add') {
      data[key] = [objective, ...list];
      this.touch(`Thêm mục tiêu ${isThreeYear ? '3 năm' : 'hàng năm'}: ${objective.title}`, clientId);
    } else if (action === 'update') {
      data[key] = list.map((o) => (o.id === objective.id ? objective : o));
      this.touch(`Cập nhật mục tiêu ${isThreeYear ? '3 năm' : 'hàng năm'}: ${objective.title}`, clientId);
    } else if (action === 'delete') {
      data[key] = list.filter((o) => o.id !== objective.id);
      this.touch(`Xóa mục tiêu ${isThreeYear ? '3 năm' : 'hàng năm'} ID: ${objective.id}`, clientId);
    }
    return this.state;
  }

  public updatePriority(
    level: PolicyLevel,
    action: 'add' | 'update' | 'delete',
    priority: ImprovementPriority,
    clientId?: string
  ): StoreState {
    const data = this.getLevelDataRef(level);
    const list = data.priorities || [];

    if (action === 'add') {
      data.priorities = [priority, ...list];
      this.touch(`Thêm ưu tiên cải tiến: ${priority.title}`, clientId);
    } else if (action === 'update') {
      data.priorities = list.map((p) => (p.id === priority.id ? priority : p));
      this.touch(`Cập nhật ưu tiên cải tiến: ${priority.title}`, clientId);
    } else if (action === 'delete') {
      data.priorities = list.filter((p) => p.id !== priority.id);
      this.touch(`Xóa ưu tiên cải tiến: ${priority.id}`, clientId);
    }
    return this.state;
  }

  public updateResource(
    level: PolicyLevel,
    action: 'add' | 'update' | 'delete',
    resource: ResourcePerson,
    clientId?: string
  ): StoreState {
    const data = this.getLevelDataRef(level);
    const list = data.resources || [];

    if (action === 'add') {
      data.resources = [resource, ...list];
      this.touch(`Thêm nguồn lực nhân sự: ${resource.name}`, clientId);
    } else if (action === 'update') {
      data.resources = list.map((r) => (r.key === resource.key ? resource : r));
      this.touch(`Cập nhật nguồn lực nhân sự: ${resource.name}`, clientId);
    } else if (action === 'delete') {
      data.resources = list.filter((r) => r.key !== resource.key);
      this.touch(`Xóa nguồn lực nhân sự: ${resource.key}`, clientId);
    }
    return this.state;
  }

  public updateLevelMeta(
    level: PolicyLevel,
    meta: { owner?: string; revDate?: string; title?: string; titleVi?: string; titleKo?: string },
    clientId?: string
  ): StoreState {
    const data = this.getLevelDataRef(level);
    if (meta.owner !== undefined) data.owner = meta.owner;
    if (meta.revDate !== undefined) data.revDate = meta.revDate;
    if (meta.title !== undefined) data.title = meta.title;
    if (meta.titleVi !== undefined) data.titleVi = meta.titleVi;
    if (meta.titleKo !== undefined) data.titleKo = meta.titleKo;
    this.touch(`Cập nhật thông tin cấp ${level} (Người phụ trách: ${data.owner})`, clientId);
    return this.state;
  }

  public resetToBaseline(clientId?: string): StoreState {
    this.state.l1Data = JSON.parse(JSON.stringify(INITIAL_LEVEL_1_DATA));
    this.state.l2Data = JSON.parse(JSON.stringify(INITIAL_LEVEL_2_DATA));
    this.state.l3Data = JSON.parse(JSON.stringify(INITIAL_LEVEL_3_DATA));
    this.touch('Khôi phục toàn bộ dữ liệu gốc chuẩn Vietnam Samho 2026', clientId);
    return this.state;
  }
}

export const policyStore = new PolicyStore();
