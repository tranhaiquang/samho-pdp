import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import {
  PolicyLevel,
  ViewMode,
  Language,
  LevelPolicyData,
  KpiItem,
  MonthKey,
  BreakthroughObjective,
  ImprovementPriority,
  ResourcePerson,
  SyncStateInfo,
  UserAccount,
  CompanySettings,
} from './types';
import {
  INITIAL_LEVEL_1_DATA,
  INITIAL_LEVEL_2_DATA,
  INITIAL_LEVEL_3_DATA,
} from './data/samhoData';
import { Header } from './components/Header';
import { XMatrix } from './components/XMatrix';
import { TeamFilterBar } from './components/TeamFilterBar';
import { syncService } from './lib/syncService';
import type { MultiSheetImportData } from './components/ExcelImportModal';

// Everything below is reached only by clicking a tab or opening a dialog, so it
// is split out of the entry chunk. First paint then ships just the shell -
// header, team filter and the default X-Matrix view - instead of every screen in
// the app. Each wrapper resolves the same module, so a chunk is fetched once.
const BowlingChart = lazy(() =>
  import('./components/BowlingChart').then((m) => ({ default: m.BowlingChart }))
);
const Dashboard = lazy(() =>
  import('./components/Dashboard').then((m) => ({ default: m.Dashboard }))
);
const KpiModal = lazy(() =>
  import('./components/KpiModal').then((m) => ({ default: m.KpiModal }))
);
const AddKpiModal = lazy(() =>
  import('./components/AddKpiModal').then((m) => ({ default: m.AddKpiModal }))
);
const ExcelImportModal = lazy(() =>
  import('./components/ExcelImportModal').then((m) => ({ default: m.ExcelImportModal }))
);
const AiAdvisor = lazy(() =>
  import('./components/AiAdvisor').then((m) => ({ default: m.AiAdvisor }))
);
const SettingsView = lazy(() =>
  import('./components/SettingsView').then((m) => ({ default: m.SettingsView }))
);

/** Neutral placeholder shown while a lazily-loaded tab fetches its chunk. */
const ViewFallback: React.FC<{ language: Language }> = ({ language }) => (
  <div className="flex items-center justify-center py-20 text-sm text-slate-500">
    <span className="w-4 h-4 mr-3 rounded-full border-2 border-slate-300 border-t-emerald-600 animate-spin" />
    {language === 'vi' ? 'Đang tải...' : 'Loading...'}
  </div>
);

const STORAGE_KEY_L1 = 'samho_policy_l1_v2';
const STORAGE_KEY_L2 = 'samho_policy_l2_v2';
const STORAGE_KEY_L3 = 'samho_policy_l3_v2';
const STORAGE_KEY_META = 'samho_policy_meta_v2';
const STORAGE_KEY_COMPANY = 'samho_company_settings_v1';
const STORAGE_KEY_USERS = 'samho_user_accounts_v1';

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'Vietnam Samho Co. Ltd',
  companyShortName: 'VN SAMHO',
  fiscalYear: '2026',
  systemTitleVi: 'Hệ thống Hoạch định & Triển khai Chính sách (Hoshin Kanri)',
  systemTitleEn: 'Policy Deployment System (Hoshin Kanri)',
  systemTitleKo: '방침관리 전개 시스템 (Hoshin Kanri)',
  logoSubtitle: 'Vietnam Samho Co. Ltd',
  monolingualOnly: true,
};

const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'user-admin',
    username: 'admin',
    fullName: 'General Director (SY Kim / KS Kang)',
    email: 'admin@samho.com',
    role: 'admin',
    department: 'Management',
    levelAccess: ['L1', 'L2', 'L3'],
    departmentAccess: ['ALL'],
    permissions: {
      canEditKpi: true,
      canEditMonthly: true,
      canDelete: true,
      canExport: true,
      canManageUsers: true,
      canManageSettings: true,
    },
    isActive: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'user-lean',
    username: 'lean.lead',
    fullName: 'Quang / Huy (Lean Champion)',
    email: 'lean@samho.com',
    role: 'team_lead',
    department: 'Lean',
    levelAccess: ['L1', 'L2', 'L3'],
    departmentAccess: ['Lean'],
    permissions: {
      canEditKpi: true,
      canEditMonthly: true,
      canDelete: false,
      canExport: true,
      canManageUsers: false,
      canManageSettings: false,
    },
    isActive: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'user-quality',
    username: 'quality.lead',
    fullName: 'Hoang / Tony Lopez (Quality Manager)',
    email: 'quality@samho.com',
    role: 'team_lead',
    department: 'Quality',
    levelAccess: ['L1', 'L2', 'L3'],
    departmentAccess: ['Quality'],
    permissions: {
      canEditKpi: true,
      canEditMonthly: true,
      canDelete: false,
      canExport: true,
      canManageUsers: false,
      canManageSettings: false,
    },
    isActive: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'user-viewer',
    username: 'viewer',
    fullName: 'Auditor / Viewer',
    email: 'viewer@samho.com',
    role: 'viewer',
    department: 'Management',
    levelAccess: ['L1', 'L2', 'L3'],
    departmentAccess: ['ALL'],
    permissions: {
      canEditKpi: false,
      canEditMonthly: false,
      canDelete: false,
      canExport: true,
      canManageUsers: false,
      canManageSettings: false,
    },
    isActive: true,
    createdAt: '2026-01-01',
  },
];

// Helper to detect if user has added/modified data compared to original baseline
function detectUserEdits(
  l1: LevelPolicyData,
  l2: LevelPolicyData,
  l3: LevelPolicyData
): boolean {
  try {
    if (
      (l1.kpis?.length || 0) !== INITIAL_LEVEL_1_DATA.kpis.length ||
      (l2.kpis?.length || 0) !== INITIAL_LEVEL_2_DATA.kpis.length ||
      (l3.kpis?.length || 0) !== INITIAL_LEVEL_3_DATA.kpis.length
    ) {
      return true;
    }

    const checkKpis = (kpis: KpiItem[], baseKpis: KpiItem[]) => {
      for (const k of kpis) {
        const b = baseKpis.find((x) => x.id === k.id);
        if (!b) return true;
        if (k.name !== b.name || k.code !== b.code) return true;
        if ((k.problemDescription || '') !== (b.problemDescription || '')) return true;
        if ((k.rootCause || '') !== (b.rootCause || '')) return true;
        if ((k.actionPlan || '') !== (b.actionPlan || '')) return true;
        if (k.monthly) {
          for (const [m, vals] of Object.entries(k.monthly)) {
            const bVals = b.monthly?.[m as MonthKey];
            if (!bVals && vals && (vals.target !== null || vals.actual !== null)) return true;
            if (bVals && vals) {
              if (String(vals.target ?? '') !== String(bVals.target ?? '')) return true;
              if (String(vals.actual ?? '') !== String(bVals.actual ?? '')) return true;
            }
          }
        }
      }
      return false;
    };

    if (checkKpis(l1.kpis || [], INITIAL_LEVEL_1_DATA.kpis)) return true;
    if (checkKpis(l2.kpis || [], INITIAL_LEVEL_2_DATA.kpis)) return true;
    if (checkKpis(l3.kpis || [], INITIAL_LEVEL_3_DATA.kpis)) return true;
  } catch {
    return false;
  }
  return false;
}

export default function App() {
  const [currentLevel, setCurrentLevel] = useState<PolicyLevel>('L1');
  const [viewMode, setViewMode] = useState<ViewMode>('xmatrix');
  const [language, setLanguage] = useState<Language>('vi');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');

  // Multi-user sync & conflict protection state
  const [syncState, setSyncState] = useState<SyncStateInfo>({
    status: 'syncing',
    version: 1,
    lastSyncedAt: null,
    lastAction: '',
    isOnline: true,
  });
  const [remoteNotice, setRemoteNotice] = useState<string | null>(null);
  const localVersionRef = useRef<number>(1);

  // Policy Level Datasets (Initialized with local cache for instant paint)
  const [l1Data, setL1Data] = useState<LevelPolicyData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_L1);
    return saved ? JSON.parse(saved) : INITIAL_LEVEL_1_DATA;
  });

  const [l2Data, setL2Data] = useState<LevelPolicyData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_L2);
    return saved ? JSON.parse(saved) : INITIAL_LEVEL_2_DATA;
  });

  const [l3Data, setL3Data] = useState<LevelPolicyData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_L3);
    return saved ? JSON.parse(saved) : INITIAL_LEVEL_3_DATA;
  });

  // Company and User Management Settings State
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_COMPANY);
    return saved ? JSON.parse(saved) : DEFAULT_COMPANY_SETTINGS;
  });

  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });

  const [currentUser, setCurrentUser] = useState<UserAccount>(() => users[0] || DEFAULT_USERS[0]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COMPANY, JSON.stringify(companySettings));
  }, [companySettings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }, [users]);

  // Modal states
  const [selectedKpi, setSelectedKpi] = useState<KpiItem | null>(null);
  const [isAddKpiOpen, setIsAddKpiOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);

  // Flag user action to permanently protect user-entered data against baseline overwrite
  const markUserEdit = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY_META,
        JSON.stringify({
          hasUserEdits: true,
          lastEditTime: Date.now(),
        })
      );
    } catch (err) {
      console.warn('Could not save user edit meta flag:', err);
    }
  };

  // Sync state to local cache as offline fallback
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_L1, JSON.stringify(l1Data));
  }, [l1Data]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_L2, JSON.stringify(l2Data));
  }, [l2Data]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_L3, JSON.stringify(l3Data));
  }, [l3Data]);

  // Load server state on startup and poll for changes from other users
  useEffect(() => {
    let isMounted = true;

    // 1. Initial Load from Central Server
    const initialSync = async () => {
      try {
        setSyncState((prev) => ({ ...prev, status: 'syncing' }));
        const res = await syncService.fetchAll();
        if (!isMounted || !res || !res.l1Data || !res.l2Data || !res.l3Data) return;

        // Check if client has local user edits
        let hasLocalEdits = false;
        try {
          const metaRaw = localStorage.getItem(STORAGE_KEY_META);
          if (metaRaw) {
            const parsed = JSON.parse(metaRaw);
            if (parsed.hasUserEdits) hasLocalEdits = true;
          }
        } catch {}

        if (!hasLocalEdits) {
          hasLocalEdits = detectUserEdits(l1Data, l2Data, l3Data);
          if (hasLocalEdits) {
            markUserEdit();
          }
        }

        // Check if server is running on fresh/unedited baseline dataset
        const isServerBaseline =
          res.version <= 1 ||
          (res.lastAction && res.lastAction.startsWith('Initialized with')) ||
          res.lastClientId === 'system';

        if (hasLocalEdits && isServerBaseline) {
          // PROTECT USER-ENTERED DATA: Do NOT overwrite with default baseline!
          console.warn('[Sync] Preserving user-entered data against default baseline. Pushing to server...');
          try {
            const pushRes = await syncService.syncFromClient({
              l1Data,
              l2Data,
              l3Data,
              lastModified: Date.now(),
              force: true,
            });
            if (isMounted) {
              localVersionRef.current = pushRes.version;
              setSyncState({
                status: 'synced',
                version: pushRes.version,
                lastSyncedAt: new Date(pushRes.lastModified),
                lastAction: pushRes.lastAction,
                isOnline: true,
              });
            }
            return;
          } catch (e) {
            console.error('[Sync] Error pushing local data to server:', e);
          }
        }

        if (isMounted) {
          setL1Data(res.l1Data);
          setL2Data(res.l2Data);
          setL3Data(res.l3Data);
          localVersionRef.current = res.version;
          setSyncState({
            status: 'synced',
            version: res.version,
            lastSyncedAt: new Date(res.lastModified),
            lastAction: res.lastAction,
            isOnline: true,
          });
        }
      } catch (err) {
        console.warn('[Sync] Cannot contact central server, running in local fallback mode:', err);
        if (isMounted) {
          setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
        }
      }
    };

    initialSync();

    // 2. High-frequency non-blocking polling (every 2.5 seconds) to catch other users' edits
    const interval = setInterval(async () => {
      try {
        const vInfo = await syncService.checkVersion();
        if (!isMounted) return;

        if (vInfo.version > localVersionRef.current) {
          // A change occurred on another machine or session!
          const fullData = await syncService.fetchAll();
          if (!isMounted) return;

          setL1Data(fullData.l1Data);
          setL2Data(fullData.l2Data);
          setL3Data(fullData.l3Data);
          localVersionRef.current = fullData.version;
          setSyncState({
            status: 'synced',
            version: fullData.version,
            lastSyncedAt: new Date(fullData.lastModified),
            lastAction: fullData.lastAction,
            isOnline: true,
          });

          // Show friendly notification if edit came from another client
          if (vInfo.lastClientId !== syncService.getClientId()) {
            setRemoteNotice(fullData.lastAction || 'Đồng bộ thay đổi mới từ máy khác');
            setTimeout(() => {
              if (isMounted) setRemoteNotice(null);
            }, 4500);
          }
        } else {
          setSyncState((prev) => ({
            ...prev,
            status: prev.status === 'saving' ? 'saving' : 'synced',
            isOnline: true,
          }));
        }
      } catch {
        if (isMounted) {
          setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
        }
      }
    }, 2500);

    // 3. Trigger immediate sync check when user switches back to browser tab
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const vInfo = await syncService.checkVersion();
          if (vInfo.version > localVersionRef.current) {
            const fullData = await syncService.fetchAll();
            if (isMounted) {
              setL1Data(fullData.l1Data);
              setL2Data(fullData.l2Data);
              setL3Data(fullData.l3Data);
              localVersionRef.current = fullData.version;
              setSyncState({
                status: 'synced',
                version: fullData.version,
                lastSyncedAt: new Date(fullData.lastModified),
                lastAction: fullData.lastAction,
                isOnline: true,
              });
            }
          }
        } catch {
          // ignore
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Manual Sync Button Handler
  const handleManualSync = async () => {
    try {
      setSyncState((prev) => ({ ...prev, status: 'syncing' }));
      const fullData = await syncService.fetchAll();
      setL1Data(fullData.l1Data);
      setL2Data(fullData.l2Data);
      setL3Data(fullData.l3Data);
      localVersionRef.current = fullData.version;
      setSyncState({
        status: 'synced',
        version: fullData.version,
        lastSyncedAt: new Date(fullData.lastModified),
        lastAction: fullData.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  // Current Level Data Helper
  const getCurrentLevelData = (): LevelPolicyData => {
    if (currentLevel === 'L2') return l2Data;
    if (currentLevel === 'L3') return l3Data;
    return l1Data;
  };

  const setCurrentLevelData = (
    updater: (prev: LevelPolicyData) => LevelPolicyData
  ) => {
    markUserEdit();
    if (currentLevel === 'L2') setL2Data(updater);
    else if (currentLevel === 'L3') setL3Data(updater);
    else setL1Data(updater);
  };

  // Reset to Benchmark Data
  const handleResetData = async () => {
    if (
      window.confirm(
        language === 'vi'
          ? 'CẢNH BÁO: Thao tác này sẽ xóa toàn bộ số liệu bạn đã nhập và đặt lại dữ liệu gốc 2026 trên tất cả các máy. Bạn có chắc chắn muốn thực hiện không?'
          : 'WARNING: This will erase all user-entered data and reset to 2026 baseline across all devices. Are you sure?'
      )
    ) {
      try {
        localStorage.removeItem(STORAGE_KEY_META);
      } catch {}
      setL1Data(INITIAL_LEVEL_1_DATA);
      setL2Data(INITIAL_LEVEL_2_DATA);
      setL3Data(INITIAL_LEVEL_3_DATA);
      setSyncState((prev) => ({ ...prev, status: 'saving' }));
      try {
        const res = await syncService.resetToBaseline();
        localVersionRef.current = res.version;
        setSyncState({
          status: 'synced',
          version: res.version,
          lastSyncedAt: new Date(res.lastModified),
          lastAction: res.lastAction,
          isOnline: true,
        });
      } catch {
        setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
      }
    }
  };

  // Update Monthly Target / Actual Value (Granular: Only updates this exact cell, no overwrite conflict)
  const handleUpdateKpiMonthly = async (
    kpiId: string,
    month: MonthKey,
    field: 'target' | 'actual',
    value: string | number | null
  ) => {
    // 1. Instant local UI update
    setCurrentLevelData((prev) => ({
      ...prev,
      kpis: prev.kpis.map((kpi) => {
        if (kpi.id !== kpiId) return kpi;
        return {
          ...kpi,
          monthly: {
            ...kpi.monthly,
            [month]: {
              ...kpi.monthly[month],
              [field]: value,
            },
          },
        };
      }),
    }));

    if (selectedKpi && selectedKpi.id === kpiId) {
      setSelectedKpi((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          monthly: {
            ...prev.monthly,
            [month]: {
              ...prev.monthly[month],
              [field]: value,
            },
          },
        };
      });
    }

    // 2. Transmit atomic cell modification to central server
    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.updateKpiMonthly(
        currentLevel,
        kpiId,
        month,
        field,
        value
      );
      localVersionRef.current = res.version;
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  // Update KPI Metadata
  const handleUpdateKpi = async (updatedKpi: KpiItem) => {
    markUserEdit();
    setL1Data((prev) => ({
      ...prev,
      kpis:
        updatedKpi.level === 'L1'
          ? prev.kpis.some((k) => k.id === updatedKpi.id)
            ? prev.kpis.map((k) => (k.id === updatedKpi.id ? updatedKpi : k))
            : [updatedKpi, ...prev.kpis]
          : prev.kpis.filter((k) => k.id !== updatedKpi.id),
    }));

    setL2Data((prev) => ({
      ...prev,
      kpis:
        updatedKpi.level === 'L2'
          ? prev.kpis.some((k) => k.id === updatedKpi.id)
            ? prev.kpis.map((k) => (k.id === updatedKpi.id ? updatedKpi : k))
            : [updatedKpi, ...prev.kpis]
          : prev.kpis.filter((k) => k.id !== updatedKpi.id),
    }));

    setL3Data((prev) => ({
      ...prev,
      kpis:
        updatedKpi.level === 'L3'
          ? prev.kpis.some((k) => k.id === updatedKpi.id)
            ? prev.kpis.map((k) => (k.id === updatedKpi.id ? updatedKpi : k))
            : [updatedKpi, ...prev.kpis]
          : prev.kpis.filter((k) => k.id !== updatedKpi.id),
    }));

    if (selectedKpi && selectedKpi.id === updatedKpi.id) {
      setSelectedKpi(updatedKpi);
    }

    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.updateKpi(updatedKpi);
      localVersionRef.current = res.version;
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  // Delete KPI
  const handleDeleteKpi = async (kpiId: string) => {
    markUserEdit();
    setL1Data((prev) => ({
      ...prev,
      kpis: prev.kpis.filter((kpi) => kpi.id !== kpiId),
    }));
    setL2Data((prev) => ({
      ...prev,
      kpis: prev.kpis.filter((kpi) => kpi.id !== kpiId),
    }));
    setL3Data((prev) => ({
      ...prev,
      kpis: prev.kpis.filter((kpi) => kpi.id !== kpiId),
    }));

    if (selectedKpi && selectedKpi.id === kpiId) {
      setSelectedKpi(null);
    }

    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.deleteKpi(kpiId);
      localVersionRef.current = res.version;
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  // Save 8D & Problem Details
  const handleSaveKpiDetails = async (
    kpiId: string,
    problemDescription: string,
    rootCause: string,
    actionPlan: string
  ) => {
    setCurrentLevelData((prev) => ({
      ...prev,
      kpis: prev.kpis.map((kpi) => {
        if (kpi.id !== kpiId) return kpi;
        return {
          ...kpi,
          problemDescription,
          rootCause,
          actionPlan,
        };
      }),
    }));

    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.updateKpiDetails(
        currentLevel,
        kpiId,
        problemDescription,
        rootCause,
        actionPlan
      );
      localVersionRef.current = res.version;
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  // Add New KPI Metric
  const handleAddKpi = async (newKpi: KpiItem) => {
    setCurrentLevelData((prev) => ({
      ...prev,
      kpis: [newKpi, ...prev.kpis],
    }));

    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.addKpi(currentLevel, newKpi);
      localVersionRef.current = res.version;
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  // Objective Handlers
  const handleAddObjective = async (
    newObj: BreakthroughObjective,
    isThreeYear?: boolean,
    targetLevel?: PolicyLevel
  ) => {
    const effectiveLevel = targetLevel || currentLevel;
    const updater = (prev: LevelPolicyData) => {
      const key = isThreeYear ? 'threeYearObjectives' : 'annualObjectives';
      const list = prev[key] || [];
      return {
        ...prev,
        [key]: [newObj, ...list],
      };
    };
    markUserEdit();
    if (effectiveLevel === 'L1') setL1Data(updater);
    else if (effectiveLevel === 'L2') setL2Data(updater);
    else setL3Data(updater);

    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.updateObjective(effectiveLevel, 'add', newObj, isThreeYear);
      localVersionRef.current = res.version;
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  const handleUpdateObjective = async (
    updatedObj: BreakthroughObjective,
    isThreeYear?: boolean,
    targetLevel?: PolicyLevel
  ) => {
    const effectiveLevel = targetLevel || currentLevel;
    const updater = (prev: LevelPolicyData) => {
      const key = isThreeYear ? 'threeYearObjectives' : 'annualObjectives';
      const list = prev[key] || [];
      return {
        ...prev,
        [key]: list.map((obj) => (obj.id === updatedObj.id ? updatedObj : obj)),
      };
    };
    markUserEdit();
    if (effectiveLevel === 'L1') setL1Data(updater);
    else if (effectiveLevel === 'L2') setL2Data(updater);
    else setL3Data(updater);

    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.updateObjective(effectiveLevel, 'update', updatedObj, isThreeYear);
      localVersionRef.current = res.version;
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  const handleDeleteObjective = async (
    objId: string,
    isThreeYear?: boolean,
    targetLevel?: PolicyLevel
  ) => {
    const effectiveLevel = targetLevel || currentLevel;
    const updater = (prev: LevelPolicyData) => {
      const key = isThreeYear ? 'threeYearObjectives' : 'annualObjectives';
      const list = prev[key] || [];
      return {
        ...prev,
        [key]: list.filter((obj) => obj.id !== objId),
      };
    };
    markUserEdit();
    if (effectiveLevel === 'L1') setL1Data(updater);
    else if (effectiveLevel === 'L2') setL2Data(updater);
    else setL3Data(updater);

    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.updateObjective(
        effectiveLevel,
        'delete',
        { id: objId, code: '', title: '', period: '' },
        isThreeYear
      );
      localVersionRef.current = res.version;
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  // Priority Handlers
  const handleAddPriority = async (newP: ImprovementPriority, targetLevel?: PolicyLevel) => {
    const effectiveLevel = targetLevel || currentLevel;
    markUserEdit();
    const updater = (prev: LevelPolicyData) => ({
      ...prev,
      priorities: [newP, ...prev.priorities],
    });
    if (effectiveLevel === 'L1') setL1Data(updater);
    else if (effectiveLevel === 'L2') setL2Data(updater);
    else setL3Data(updater);

    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.updatePriority(effectiveLevel, 'add', newP);
      localVersionRef.current = res.version;
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  const handleUpdatePriority = async (updatedP: ImprovementPriority, targetLevel?: PolicyLevel) => {
    const effectiveLevel = targetLevel || currentLevel;
    markUserEdit();
    const updater = (prev: LevelPolicyData) => ({
      ...prev,
      priorities: prev.priorities.map((p) => (p.id === updatedP.id ? updatedP : p)),
    });
    if (effectiveLevel === 'L1') setL1Data(updater);
    else if (effectiveLevel === 'L2') setL2Data(updater);
    else setL3Data(updater);

    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.updatePriority(effectiveLevel, 'update', updatedP);
      localVersionRef.current = res.version;
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  const handleDeletePriority = async (pId: string, targetLevel?: PolicyLevel) => {
    const effectiveLevel = targetLevel || currentLevel;
    markUserEdit();
    const updater = (prev: LevelPolicyData) => ({
      ...prev,
      priorities: prev.priorities.filter((p) => p.id !== pId),
    });
    if (effectiveLevel === 'L1') setL1Data(updater);
    else if (effectiveLevel === 'L2') setL2Data(updater);
    else setL3Data(updater);

    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.updatePriority(effectiveLevel, 'delete', {
        id: pId,
        code: '',
        title: '',
      });
      localVersionRef.current = res.version;
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  // Resource Handlers
  const handleAddResource = async (newR: ResourcePerson) => {
    setCurrentLevelData((prev) => ({
      ...prev,
      resources: [newR, ...prev.resources],
    }));

    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.updateResource(currentLevel, 'add', newR);
      localVersionRef.current = res.version;
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  const handleUpdateResource = async (updatedR: ResourcePerson) => {
    setCurrentLevelData((prev) => ({
      ...prev,
      resources: prev.resources.map((r) => (r.key === updatedR.key ? updatedR : r)),
    }));

    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.updateResource(currentLevel, 'update', updatedR);
      localVersionRef.current = res.version;
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  const handleDeleteResource = async (rKey: string) => {
    setCurrentLevelData((prev) => ({
      ...prev,
      resources: prev.resources.filter((r) => r.key !== rKey),
    }));

    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.updateResource(currentLevel, 'delete', {
        key: rKey,
        department: '',
        name: '',
        fullTitle: '',
      });
      localVersionRef.current = res.version;
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  // Correlation toggle handler (persists matrix correlations)
  const handleUpdateCorrelation = async (key: string, value: 'primary' | 'secondary' | 'none') => {
    markUserEdit();
    setCurrentLevelData((prev) => ({
      ...prev,
      correlations: {
        ...(prev.correlations || {}),
        [key]: value,
      },
    }));

    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.updateCorrelation(currentLevel, key, value);
      localVersionRef.current = res.version;
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  // Update Level Meta (Owner, Rev Date, Title)
  const handleUpdateLevelMeta = async (
    level: PolicyLevel,
    meta: { owner?: string; revDate?: string; title?: string; titleVi?: string; titleKo?: string }
  ) => {
    const updater = (prev: LevelPolicyData): LevelPolicyData => ({
      ...prev,
      owner: meta.owner !== undefined ? meta.owner : prev.owner,
      revDate: meta.revDate !== undefined ? meta.revDate : prev.revDate,
      title: meta.title !== undefined ? meta.title : prev.title,
      titleVi: meta.titleVi !== undefined ? meta.titleVi : prev.titleVi,
      titleKo: meta.titleKo !== undefined ? meta.titleKo : prev.titleKo,
    });

    if (level === 'L1') setL1Data(updater);
    else if (level === 'L2') setL2Data(updater);
    else if (level === 'L3') setL3Data(updater);

    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.updateLevelMeta(level, meta);
      localVersionRef.current = res.version;
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const currentData = getCurrentLevelData();
    const months: MonthKey[] = [
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

    let csv = 'Code,Department,Name,NameVi,Unit,Owner,Type,' + months.join(',') + '\n';

    currentData.kpis.forEach((kpi) => {
      // Target line
      let tLine = `"${kpi.code}","${kpi.department}","${kpi.name}","${kpi.nameVi || ''}","${kpi.unit}","${kpi.owner}",Target`;
      months.forEach((m) => {
        tLine += `,"${kpi.monthly[m]?.target ?? ''}"`;
      });
      csv += tLine + '\n';

      // Actual line
      let aLine = `"${kpi.code}","${kpi.department}","${kpi.name}","${kpi.nameVi || ''}","${kpi.unit}","${kpi.owner}",Actual`;
      months.forEach((m) => {
        aLine += `,"${kpi.monthly[m]?.actual ?? ''}"`;
      });
      csv += aLine + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Vietnam_Samho_Policy_Deployment_${currentLevel}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Confirm Excel Bulk Import
  const handleConfirmExcelImport = async (kpis: KpiItem[], targetLvl: PolicyLevel) => {
    // 1. Optimistic local update
    const updateTarget = (prev: LevelPolicyData) => {
      const merged = [...prev.kpis];
      for (const newKpi of kpis) {
        const idx = merged.findIndex(
          (k) =>
            k.id === newKpi.id ||
            (k.code && newKpi.code && k.code.trim().toLowerCase() === newKpi.code.trim().toLowerCase())
        );
        if (idx >= 0) {
          const prevMonthly: any = merged[idx].monthly || {};
          const nextMonthly: any = newKpi.monthly || {};
          const mergedMonthly: any = { ...prevMonthly };
          for (const [m, rawVals] of Object.entries(nextMonthly)) {
            if (!rawVals) continue;
            const vals = rawVals as { target?: any; actual?: any };
            const prevVal = mergedMonthly[m] || { target: null, actual: null };
            const hasT = vals.target !== null && vals.target !== undefined && vals.target !== '';
            const hasA = vals.actual !== null && vals.actual !== undefined && vals.actual !== '';
            mergedMonthly[m] = {
              target: hasT ? vals.target : prevVal.target,
              actual: hasA ? vals.actual : prevVal.actual,
            };
          }

          merged[idx] = {
            ...merged[idx],
            ...newKpi,
            owner: (newKpi.owner && newKpi.owner.trim() !== '' && newKpi.owner !== 'Production') ? newKpi.owner : merged[idx].owner,
            monthly: mergedMonthly,
          };
        } else {
          merged.push(newKpi);
        }
      }
      return { ...prev, kpis: merged };
    };

    if (targetLvl === 'L1') setL1Data(updateTarget);
    else if (targetLvl === 'L2') setL2Data(updateTarget);
    else setL3Data(updateTarget);

    // 2. Transmit to server & sync all devices
    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.bulkUpsertKpis(targetLvl, kpis);
      localVersionRef.current = res.version;
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  // Confirm Excel Multi-Sheet Import (6 sheets mapped)
  const handleConfirmMultiImport = async (multiPayload: MultiSheetImportData) => {
    markUserEdit();
    // 1. Optimistic local update
    const mergeKpisLocal = (prev: LevelPolicyData, newKpis?: KpiItem[]) => {
      if (!newKpis || newKpis.length === 0) return prev;
      const merged = [...prev.kpis];
      for (const newKpi of newKpis) {
        const idx = merged.findIndex(
          (k) =>
            k.id === newKpi.id ||
            (k.code && newKpi.code && k.code.trim().toLowerCase() === newKpi.code.trim().toLowerCase())
        );
        if (idx >= 0) {
          const prevMonthly: any = merged[idx].monthly || {};
          const nextMonthly: any = newKpi.monthly || {};
          const mergedMonthly: any = { ...prevMonthly };
          for (const [m, rawVals] of Object.entries(nextMonthly)) {
            if (!rawVals) continue;
            const vals = rawVals as { target?: any; actual?: any };
            const prevVal = mergedMonthly[m] || { target: null, actual: null };
            const hasT = vals.target !== null && vals.target !== undefined && vals.target !== '';
            const hasA = vals.actual !== null && vals.actual !== undefined && vals.actual !== '';
            mergedMonthly[m] = {
              target: hasT ? vals.target : prevVal.target,
              actual: hasA ? vals.actual : prevVal.actual,
            };
          }

          merged[idx] = {
            ...merged[idx],
            ...newKpi,
            owner: (newKpi.owner && newKpi.owner.trim() !== '' && newKpi.owner !== 'Production') ? newKpi.owner : merged[idx].owner,
            monthly: mergedMonthly,
          };
        } else {
          merged.push(newKpi);
        }
      }
      return { ...prev, kpis: merged };
    };

    if (multiPayload.l1Kpis?.length) setL1Data((prev) => mergeKpisLocal(prev, multiPayload.l1Kpis));
    if (multiPayload.l2Kpis?.length) setL2Data((prev) => mergeKpisLocal(prev, multiPayload.l2Kpis));
    if (multiPayload.l3Kpis?.length) setL3Data((prev) => mergeKpisLocal(prev, multiPayload.l3Kpis));

    // 2. Transmit to server & sync all devices
    setSyncState((prev) => ({ ...prev, status: 'saving' }));
    try {
      const res = await syncService.bulkImportMulti(multiPayload);
      localVersionRef.current = res.version;
      setL1Data(res.l1Data);
      setL2Data(res.l2Data);
      setL3Data(res.l3Data);
      setSyncState({
        status: 'synced',
        version: res.version,
        lastSyncedAt: new Date(res.lastModified),
        lastAction: res.lastAction,
        isOnline: true,
      });
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'offline', isOnline: false }));
    }
  };

  // Full Backup (JSON) - Allows user to save everything to disk safely
  const handleExportBackup = () => {
    const backupObj = {
      backupDate: new Date().toISOString(),
      appName: 'Vietnam Samho Policy Deployment 2026',
      version: syncState.version,
      l1Data,
      l2Data,
      l3Data,
    };
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Samho_Policy_Backup_2026_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Full Restore (JSON) - Restores user data from backup file
  const handleRestoreBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const raw = e.target?.result as string;
        const parsed = JSON.parse(raw);
        if (!parsed.l1Data || !parsed.l2Data || !parsed.l3Data) {
          alert(
            language === 'vi'
              ? 'Tệp sao lưu không hợp lệ (thiếu cấu trúc dữ liệu L1, L2, L3).'
              : 'Invalid backup file (missing L1, L2, or L3 datasets).'
          );
          return;
        }

        if (
          window.confirm(
            language === 'vi'
              ? 'Bạn có chắc muốn nạp lại tệp sao lưu này? Dữ liệu người dùng sẽ được cập nhật đồng bộ lên toàn bộ hệ thống.'
              : 'Restore from this backup file? Current data will be replaced across all devices.'
          )
        ) {
          markUserEdit();
          setL1Data(parsed.l1Data);
          setL2Data(parsed.l2Data);
          setL3Data(parsed.l3Data);
          setSyncState((prev) => ({ ...prev, status: 'saving' }));

          const res = await syncService.restoreBackup({
            l1Data: parsed.l1Data,
            l2Data: parsed.l2Data,
            l3Data: parsed.l3Data,
          });

          localVersionRef.current = res.version;
          setSyncState({
            status: 'synced',
            version: res.version,
            lastSyncedAt: new Date(res.lastModified),
            lastAction: res.lastAction,
            isOnline: true,
          });

          alert(
            language === 'vi'
              ? 'Khôi phục dữ liệu sao lưu thành công!'
              : 'Backup restored successfully!'
          );
        }
      } catch (err) {
        console.error('Failed to parse backup JSON:', err);
        alert(
          language === 'vi'
            ? 'Lỗi khi đọc tệp JSON sao lưu. Vui lòng kiểm tra lại định dạng tệp.'
            : 'Error reading JSON backup file. Please check file format.'
        );
      }
    };
    reader.readAsText(file);
  };

  const activeLevelData = getCurrentLevelData();
  const allLevelKpis = [...l1Data.kpis, ...l2Data.kpis, ...l3Data.kpis];

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col">
      {/* Top Header */}
      <Header
        currentLevel={currentLevel}
        onLevelChange={setCurrentLevel}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        language={language}
        onLanguageChange={setLanguage}
        onResetData={handleResetData}
        onOpenAddKpi={() => setIsAddKpiOpen(true)}
        onExportCsv={handleExportCsv}
        onExportBackup={handleExportBackup}
        onRestoreBackup={handleRestoreBackup}
        onOpenExcelImport={() => setIsExcelImportOpen(true)}
        syncInfo={syncState}
        onManualSync={handleManualSync}
        selectedTeam={selectedTeam}
        onSelectTeam={setSelectedTeam}
        kpis={activeLevelData.kpis}
        resources={activeLevelData.resources}
        companySettings={companySettings}
      />

      {/* Real-time remote update notification toast bar */}
      {remoteNotice && (
        <div className="bg-sky-700 text-white text-xs font-medium px-4 py-2 border-b border-sky-800 shadow-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2.5 w-full px-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span>
              {language === 'vi'
                ? `⚡ Cập nhật đồng bộ từ thiết bị khác: ${remoteNotice}`
                : `⚡ Real-time sync update from another device: ${remoteNotice}`}
            </span>
          </div>
          <button
            onClick={() => setRemoteNotice(null)}
            className="text-sky-200 hover:text-white text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Container - Full Fluid Width across all screen sizes */}
      <main className="flex-1 w-full px-3 sm:px-5 lg:px-6 py-3 sm:py-4">
        {/* Dedicated Team / Department Filter Box */}
        {viewMode !== 'ai' && viewMode !== 'settings' && (
          <TeamFilterBar
            selectedTeam={selectedTeam}
            onSelectTeam={setSelectedTeam}
            kpis={activeLevelData.kpis}
            resources={activeLevelData.resources}
            language={language}
          />
        )}

        <Suspense fallback={<ViewFallback language={language} />}>
        {viewMode === 'xmatrix' && (
          <XMatrix
            data={activeLevelData}
            language={language}
            onSelectKpi={setSelectedKpi}
            onUpdateKpi={handleUpdateKpi}
            onAddKpi={handleAddKpi}
            onAddObjective={handleAddObjective}
            onUpdateObjective={handleUpdateObjective}
            onDeleteObjective={handleDeleteObjective}
            onAddPriority={handleAddPriority}
            onUpdatePriority={handleUpdatePriority}
            onDeletePriority={handleDeletePriority}
            onAddResource={handleAddResource}
            onUpdateResource={handleUpdateResource}
            onDeleteResource={handleDeleteResource}
            selectedTeam={selectedTeam}
            onSelectTeam={setSelectedTeam}
            l1Data={l1Data}
            l2Data={l2Data}
            l3Data={l3Data}
            onNavigateLevel={setCurrentLevel}
            onUpdateCorrelation={handleUpdateCorrelation}
          />
        )}

        {viewMode === 'bowling' && (
          <BowlingChart
            data={activeLevelData}
            language={language}
            onUpdateKpiMonthly={handleUpdateKpiMonthly}
            onSelectKpi={setSelectedKpi}
            onUpdateKpi={handleUpdateKpi}
            onDeleteKpi={handleDeleteKpi}
            onUpdateLevelMeta={handleUpdateLevelMeta}
            selectedTeam={selectedTeam}
            onSelectTeam={setSelectedTeam}
          />
        )}

        {viewMode === 'dashboard' && (
          <Dashboard
            data={activeLevelData}
            language={language}
            onSelectKpi={setSelectedKpi}
            selectedTeam={selectedTeam}
            onSelectTeam={setSelectedTeam}
          />
        )}

        {viewMode === 'ai' && (
          <AiAdvisor
            data={activeLevelData}
            language={language}
            allKpis={allLevelKpis}
          />
        )}

        {viewMode === 'settings' && (
          <SettingsView
            language={language}
            companySettings={companySettings}
            onUpdateCompanySettings={setCompanySettings}
            users={users}
            currentUser={currentUser}
            onSwitchUser={setCurrentUser}
            onAddUser={(newUser) => setUsers((prev) => [...prev, newUser])}
            onUpdateUser={(updatedUser) =>
              setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)))
            }
            onDeleteUser={(userId) => setUsers((prev) => prev.filter((u) => u.id !== userId))}
            l1Data={l1Data}
            l2Data={l2Data}
            l3Data={l3Data}
            onUpdateLevelOwner={(level, owner, revDate, titleVi, titleKo, titleEn) => {
              handleUpdateLevelMeta(level, {
                owner,
                revDate,
                titleVi,
                titleKo,
                title: titleEn,
              });
            }}
          />
        )}
      </Suspense>
      </main>

      {/* Dialogs load on demand; a null fallback keeps them from flashing a
          placeholder over the page while their chunk arrives. */}
      <Suspense fallback={null}>
      {/* KPI Detail & 8D Action Plan Drawer */}
      {selectedKpi && (
        <KpiModal
          kpi={selectedKpi}
          language={language}
          onClose={() => setSelectedKpi(null)}
          onSaveKpiDetails={handleSaveKpiDetails}
          onUpdateKpi={handleUpdateKpi}
          onDeleteKpi={handleDeleteKpi}
        />
      )}

      {/* Add KPI Modal */}
      {isAddKpiOpen && (
        <AddKpiModal
          currentLevel={currentLevel}
          language={language}
          onClose={() => setIsAddKpiOpen(false)}
          onAddKpi={handleAddKpi}
        />
      )}

      {/* Excel Import Modal */}
      {isExcelImportOpen && (
        <ExcelImportModal
          isOpen={isExcelImportOpen}
          onClose={() => setIsExcelImportOpen(false)}
          currentLevel={currentLevel}
          language={language}
          onConfirmImport={handleConfirmExcelImport}
          onConfirmMultiImport={handleConfirmMultiImport}
        />
      )}
      </Suspense>
    </div>
  );
}
