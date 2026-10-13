export type PolicyLevel = 'L1' | 'L2' | 'L3';

export type ViewMode = 'xmatrix' | 'bowling' | 'dashboard' | 'ai' | 'settings';

export type Language = 'vi' | 'en' | 'ko';

export type Department =
  | 'Lean'
  | 'Delivery'
  | 'Responsible Leadership'
  | 'Development'
  | 'Quality'
  | 'Production'
  | 'Biz'
  | 'IT'
  | 'CSR'
  | 'HR'
  | 'Planning';

export type TargetDirection = 'higher' | 'lower' | 'equal' | 'boolean';

export type MonthKey =
  | 'Jan'
  | 'Feb'
  | 'Mar'
  | 'Apr'
  | 'May'
  | 'Jun'
  | 'Jul'
  | 'Aug'
  | 'Sep'
  | 'Oct'
  | 'Nov'
  | 'Dec';

export const MONTH_KEYS: MonthKey[] = [
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

export interface MonthValue {
  target: number | string;
  actual: number | string | null;
}

export type MonthlyRecord = Record<MonthKey, MonthValue>;

export interface ResourceRole {
  name: string;
  role: string; // e.g. "Biz: Ngoc"
  type: 'primary' | 'secondary' | 'none';
}

export interface KpiItem {
  id: string;
  code: string; // e.g., "L1 1.1.1"
  name: string;
  nameVi?: string;
  nameKo?: string;
  level: PolicyLevel;
  department: Department;
  unit: string;
  jumpingOffPoint: string;
  targetDirection: TargetDirection;
  monthly: MonthlyRecord;
  owner: string;
  linkedObjectiveIds?: string[];
  linkedPriorityIds?: string[];
  resourceRoles?: Record<string, 'primary' | 'secondary' | 'none'>;
  problemDescription?: string;
  rootCause?: string;
  actionPlan?: string;
  actionStatus?: 'Open' | 'In Progress' | 'Resolved';
}

export interface BreakthroughObjective {
  id: string;
  code: string; // e.g., "L1.1"
  title: string;
  titleVi?: string;
  titleKo?: string;
  description?: string;
  period: string; // e.g. "2026" or "2026-2028"
  department?: Department;
  linkedObjectiveIds?: string[];
  linkedPriorityIds?: string[];
}

export interface ImprovementPriority {
  id: string;
  code: string; // e.g., "L1 2.1.1"
  title: string;
  titleVi?: string;
  titleKo?: string;
  owner?: string;
  department?: Department;
  linkedObjectiveIds?: string[];
  linkedPriorityIds?: string[];
  resourceRoles?: Record<string, 'primary' | 'secondary' | 'none'>;
}

export interface ResourcePerson {
  key: string;
  department: string;
  name: string;
  fullTitle: string;
}

export interface LevelPolicyData {
  level: PolicyLevel;
  title: string;
  titleVi: string;
  titleKo?: string;
  year: string;
  owner: string;
  revDate: string;
  annualObjectives: BreakthroughObjective[];
  threeYearObjectives: BreakthroughObjective[];
  priorities: ImprovementPriority[];
  resources: ResourcePerson[];
  kpis: KpiItem[];
  correlations?: Record<string, 'primary' | 'secondary' | 'none'>;
}

export interface KpiStatusSummary {
  total: number;
  onTrack: number;
  warning: number;
  offTrack: number;
  unrecorded: number;
}

export type SyncStatus = 'synced' | 'syncing' | 'saving' | 'offline';

export interface SyncStateInfo {
  status: SyncStatus;
  version: number;
  lastSyncedAt: Date | null;
  lastAction?: string;
  isOnline: boolean;
}

export type UserRole = 'admin' | 'level_owner' | 'team_lead' | 'editor' | 'viewer';

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  email: string;
  department: string;
  role: UserRole;
  levelAccess: PolicyLevel[];
  departmentAccess: string[];
  permissions: {
    canEditKpi: boolean;
    canEditMonthly: boolean;
    canDelete: boolean;
    canExport: boolean;
    canManageUsers: boolean;
    canManageSettings: boolean;
  };
  isActive: boolean;
  createdAt: string;
}

export interface CompanySettings {
  companyName: string;
  companyShortName: string;
  systemTitleVi: string;
  systemTitleEn: string;
  systemTitleKo: string;
  fiscalYear: string;
  logoSubtitle?: string;
  monolingualOnly: boolean;
}
