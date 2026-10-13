import {
  LevelPolicyData,
  KpiItem,
  MonthKey,
  BreakthroughObjective,
  ImprovementPriority,
  ResourcePerson,
  PolicyLevel,
} from '../types';

export interface PolicyServerResponse {
  version: number;
  lastModified: number;
  lastAction: string;
  lastClientId?: string;
  l1Data: LevelPolicyData;
  l2Data: LevelPolicyData;
  l3Data: LevelPolicyData;
}

export interface VersionResponse {
  version: number;
  lastModified: number;
  lastAction: string;
  lastClientId?: string;
}

function getClientId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = sessionStorage.getItem('samho_client_id');
  if (!id) {
    id = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    sessionStorage.setItem('samho_client_id', id);
  }
  return id;
}

export const syncService = {
  getClientId,

  async fetchAll(): Promise<PolicyServerResponse> {
    const res = await fetch('/api/policy');
    if (!res.ok) {
      throw new Error(`Failed to fetch policy data: ${res.statusText}`);
    }
    return res.json();
  },

  async syncFromClient(payload: {
    l1Data: LevelPolicyData;
    l2Data: LevelPolicyData;
    l3Data: LevelPolicyData;
    lastModified?: number;
    force?: boolean;
  }): Promise<PolicyServerResponse> {
    const res = await fetch('/api/policy/sync-from-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        clientId: getClientId(),
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to sync client data to server: ${res.statusText}`);
    }
    return res.json();
  },

  async restoreBackup(backup: {
    l1Data: LevelPolicyData;
    l2Data: LevelPolicyData;
    l3Data: LevelPolicyData;
  }): Promise<PolicyServerResponse> {
    const res = await fetch('/api/policy/restore-backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...backup,
        clientId: getClientId(),
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to restore backup: ${res.statusText}`);
    }
    return res.json();
  },

  async checkVersion(): Promise<VersionResponse> {
    const res = await fetch('/api/policy/version');
    if (!res.ok) {
      throw new Error(`Failed to fetch policy version: ${res.statusText}`);
    }
    return res.json();
  },

  async updateKpiMonthly(
    level: PolicyLevel,
    kpiId: string,
    month: MonthKey,
    field: 'target' | 'actual',
    value: string | number | null
  ): Promise<PolicyServerResponse> {
    const res = await fetch('/api/policy/kpi-monthly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        kpiId,
        month,
        field,
        value,
        clientId: getClientId(),
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to update KPI monthly: ${res.statusText}`);
    }
    return res.json();
  },

  async updateKpiDetails(
    level: PolicyLevel,
    kpiId: string,
    problemDescription: string,
    rootCause: string,
    actionPlan: string
  ): Promise<PolicyServerResponse> {
    const res = await fetch('/api/policy/kpi-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        kpiId,
        problemDescription,
        rootCause,
        actionPlan,
        clientId: getClientId(),
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to update KPI details: ${res.statusText}`);
    }
    return res.json();
  },

  async updateKpi(updatedKpi: KpiItem): Promise<PolicyServerResponse> {
    const res = await fetch('/api/policy/update-kpi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updatedKpi,
        clientId: getClientId(),
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to update KPI: ${res.statusText}`);
    }
    return res.json();
  },

  async addKpi(level: PolicyLevel, newKpi: KpiItem): Promise<PolicyServerResponse> {
    const res = await fetch('/api/policy/add-kpi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        newKpi,
        clientId: getClientId(),
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to add KPI: ${res.statusText}`);
    }
    return res.json();
  },

  async bulkUpsertKpis(level: PolicyLevel, kpis: KpiItem[]): Promise<PolicyServerResponse> {
    const res = await fetch('/api/policy/bulk-kpi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        kpis,
        clientId: getClientId(),
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to bulk upsert KPIs: ${res.statusText}`);
    }
    return res.json();
  },

  async bulkImportMulti(payload: any): Promise<PolicyServerResponse> {
    const res = await fetch('/api/policy/bulk-multi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload,
        clientId: getClientId(),
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to bulk import multi-sheets: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteKpi(kpiId: string): Promise<PolicyServerResponse> {
    const res = await fetch('/api/policy/delete-kpi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kpiId,
        clientId: getClientId(),
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to delete KPI: ${res.statusText}`);
    }
    return res.json();
  },

  async updateObjective(
    level: PolicyLevel,
    action: 'add' | 'update' | 'delete',
    objective: BreakthroughObjective,
    isThreeYear?: boolean
  ): Promise<PolicyServerResponse> {
    const res = await fetch('/api/policy/objective', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        action,
        objective,
        isThreeYear,
        clientId: getClientId(),
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to modify objective: ${res.statusText}`);
    }
    return res.json();
  },

  async updatePriority(
    level: PolicyLevel,
    action: 'add' | 'update' | 'delete',
    priority: ImprovementPriority
  ): Promise<PolicyServerResponse> {
    const res = await fetch('/api/policy/priority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        action,
        priority,
        clientId: getClientId(),
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to modify priority: ${res.statusText}`);
    }
    return res.json();
  },

  async updateResource(
    level: PolicyLevel,
    action: 'add' | 'update' | 'delete',
    resource: ResourcePerson
  ): Promise<PolicyServerResponse> {
    const res = await fetch('/api/policy/resource', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        action,
        resource,
        clientId: getClientId(),
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to modify resource: ${res.statusText}`);
    }
    return res.json();
  },

  async updateCorrelation(
    level: PolicyLevel,
    key: string,
    value: 'primary' | 'secondary' | 'none'
  ): Promise<PolicyServerResponse> {
    const res = await fetch('/api/policy/correlation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        key,
        value,
        clientId: getClientId(),
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to update correlation: ${res.statusText}`);
    }
    return res.json();
  },

  async updateLevelMeta(
    level: PolicyLevel,
    meta: { owner?: string; revDate?: string; title?: string; titleVi?: string; titleKo?: string }
  ): Promise<PolicyServerResponse> {
    const res = await fetch('/api/policy/level-meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        meta,
        clientId: getClientId(),
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to update level metadata: ${res.statusText}`);
    }
    return res.json();
  },

  async resetToBaseline(): Promise<PolicyServerResponse> {
    const res = await fetch('/api/policy/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: getClientId(),
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to reset data: ${res.statusText}`);
    }
    return res.json();
  },

  async translateSingle(
    text: string,
    fromLang: 'en' | 'vi' | 'ko' | 'auto' = 'auto',
    context?: string
  ): Promise<{ textEn: string; textVi: string; textKo: string }> {
    if (!text || !text.trim()) {
      return { textEn: '', textVi: '', textKo: '' };
    }
    const res = await fetch('/api/policy/translate-single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), fromLang, context }),
    });
    if (!res.ok) {
      throw new Error(`Translation request failed: ${res.statusText}`);
    }
    return res.json();
  },

  async translateBatch(
    items: Array<{ id: string; textEn: string; context?: 'kpi' | 'objective' | 'priority' }>
  ): Promise<Array<{ id: string; textEn: string; textVi: string; textKo: string }>> {
    const res = await fetch('/api/policy/translate-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) {
      throw new Error(`Failed to translate items: ${res.statusText}`);
    }
    const data = await res.json();
    return data.results || [];
  },
};
