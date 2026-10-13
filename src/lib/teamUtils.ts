import { KpiItem, ResourcePerson, Language } from '../types';
import { matchesTeam, normalizeTeamName } from './kpiUtils';

export interface TeamMeta {
  id: string; // 'ALL', 'Lean', 'Biz', 'Quality', etc.
  label: string;
  labelVi: string;
  labelKo: string;
  iconName: string;
  colorClass: {
    active: string;
    inactive: string;
    badgeActive: string;
    badgeInactive: string;
    accent: string;
  };
}

export const TEAM_DEFINITIONS: Record<string, TeamMeta> = {
  ALL: {
    id: 'ALL',
    label: 'All',
    labelVi: 'All',
    labelKo: 'All',
    iconName: 'Building2',
    colorClass: {
      active: 'bg-slate-900 text-white ring-2 ring-slate-700 shadow-sm font-bold',
      inactive: 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/90 font-medium',
      badgeActive: 'bg-slate-700 text-white',
      badgeInactive: 'bg-slate-200/80 text-slate-600',
      accent: 'text-slate-900',
    },
  },
  Lean: {
    id: 'Lean',
    label: 'Lean',
    labelVi: 'Lean',
    labelKo: 'Lean',
    iconName: 'Zap',
    colorClass: {
      active: 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-sm font-bold',
      inactive: 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200/90 font-medium',
      badgeActive: 'bg-emerald-700 text-white',
      badgeInactive: 'bg-slate-200/80 text-slate-600',
      accent: 'text-emerald-500',
    },
  },
  Biz: {
    id: 'Biz',
    label: 'Biz',
    labelVi: 'Biz',
    labelKo: 'Biz',
    iconName: 'Briefcase',
    colorClass: {
      active: 'bg-amber-600 text-white ring-2 ring-amber-400 shadow-sm font-bold',
      inactive: 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 border border-slate-200/90 font-medium',
      badgeActive: 'bg-amber-700 text-white',
      badgeInactive: 'bg-slate-200/80 text-slate-600',
      accent: 'text-amber-500',
    },
  },
  Quality: {
    id: 'Quality',
    label: 'Quality',
    labelVi: 'Quality',
    labelKo: 'Quality',
    iconName: 'ShieldCheck',
    colorClass: {
      active: 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-sm font-bold',
      inactive: 'bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-800 hover:border-purple-300 border border-slate-200/90 font-medium',
      badgeActive: 'bg-purple-700 text-white',
      badgeInactive: 'bg-slate-200/80 text-slate-600',
      accent: 'text-purple-500',
    },
  },
  Production: {
    id: 'Production',
    label: 'Production',
    labelVi: 'Production',
    labelKo: 'Production',
    iconName: 'Cog',
    colorClass: {
      active: 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-sm font-bold',
      inactive: 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300 border border-slate-200/90 font-medium',
      badgeActive: 'bg-blue-700 text-white',
      badgeInactive: 'bg-slate-200/80 text-slate-600',
      accent: 'text-blue-500',
    },
  },
  Dev: {
    id: 'Dev',
    label: 'Dev',
    labelVi: 'Dev',
    labelKo: 'Dev',
    iconName: 'FlaskConical',
    colorClass: {
      active: 'bg-cyan-700 text-white ring-2 ring-cyan-500 shadow-sm font-bold',
      inactive: 'bg-slate-100 text-slate-700 hover:bg-cyan-50 hover:text-cyan-800 hover:border-cyan-300 border border-slate-200/90 font-medium',
      badgeActive: 'bg-cyan-800 text-white',
      badgeInactive: 'bg-slate-200/80 text-slate-600',
      accent: 'text-cyan-500',
    },
  },
  CSR: {
    id: 'CSR',
    label: 'CSR',
    labelVi: 'CSR',
    labelKo: 'CSR',
    iconName: 'HeartHandshake',
    colorClass: {
      active: 'bg-teal-600 text-white ring-2 ring-teal-400 shadow-sm font-bold',
      inactive: 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 border border-slate-200/90 font-medium',
      badgeActive: 'bg-teal-700 text-white',
      badgeInactive: 'bg-slate-200/80 text-slate-600',
      accent: 'text-teal-500',
    },
  },
  'Responsible Leadership': {
    id: 'CSR',
    label: 'CSR',
    labelVi: 'CSR',
    labelKo: 'CSR',
    iconName: 'HeartHandshake',
    colorClass: {
      active: 'bg-teal-600 text-white ring-2 ring-teal-400 shadow-sm font-bold',
      inactive: 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 border border-slate-200/90 font-medium',
      badgeActive: 'bg-teal-700 text-white',
      badgeInactive: 'bg-slate-200/80 text-slate-600',
      accent: 'text-teal-500',
    },
  },
  IT: {
    id: 'IT',
    label: 'IT',
    labelVi: 'IT',
    labelKo: 'IT',
    iconName: 'Monitor',
    colorClass: {
      active: 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-sm font-bold',
      inactive: 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 hover:border-indigo-300 border border-slate-200/90 font-medium',
      badgeActive: 'bg-indigo-700 text-white',
      badgeInactive: 'bg-slate-200/80 text-slate-600',
      accent: 'text-indigo-500',
    },
  },
  Delivery: {
    id: 'Delivery',
    label: 'Delivery',
    labelVi: 'Delivery',
    labelKo: 'Delivery',
    iconName: 'Truck',
    colorClass: {
      active: 'bg-orange-600 text-white ring-2 ring-orange-400 shadow-sm font-bold',
      inactive: 'bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-orange-800 hover:border-orange-300 border border-slate-200/90 font-medium',
      badgeActive: 'bg-orange-700 text-white',
      badgeInactive: 'bg-slate-200/80 text-slate-600',
      accent: 'text-orange-500',
    },
  },
  HR: {
    id: 'HR',
    label: 'HR',
    labelVi: 'HR',
    labelKo: 'HR',
    iconName: 'Users',
    colorClass: {
      active: 'bg-rose-600 text-white ring-2 ring-rose-400 shadow-sm font-bold',
      inactive: 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300 border border-slate-200/90 font-medium',
      badgeActive: 'bg-rose-700 text-white',
      badgeInactive: 'bg-slate-200/80 text-slate-600',
      accent: 'text-rose-500',
    },
  },
  Planning: {
    id: 'Planning',
    label: 'Planning',
    labelVi: 'Planning',
    labelKo: 'Planning',
    iconName: 'Calendar',
    colorClass: {
      active: 'bg-violet-600 text-white ring-2 ring-violet-400 shadow-sm font-bold',
      inactive: 'bg-slate-100 text-slate-700 hover:bg-violet-50 hover:text-violet-800 hover:border-violet-300 border border-slate-200/90 font-medium',
      badgeActive: 'bg-violet-700 text-white',
      badgeInactive: 'bg-slate-200/80 text-slate-600',
      accent: 'text-violet-500',
    },
  },
};

export const ORDERED_TEAM_IDS = [
  'ALL',
  'Lean',
  'Biz',
  'Quality',
  'Production',
  'Dev',
  'CSR',
  'IT',
  'Delivery',
  'HR',
  'Planning',
];

export interface TeamOptionItem {
  id: string;
  label: string;
  count: number;
  meta: TeamMeta;
}

/**
 * Builds the list of team options dynamically from available KPIs and resources,
 * ensuring primary requested teams appear in consistent order with real-time counts.
 */
export function getTeamOptions(
  kpis: KpiItem[],
  resources: ResourcePerson[] = [],
  language: Language = 'vi'
): TeamOptionItem[] {
  // Discover any extra departments present in data
  const dynamicTeams = new Set<string>();
  kpis.forEach((k) => {
    const norm = normalizeTeamName(k.department);
    if (norm) dynamicTeams.add(norm);
  });
  resources.forEach((r) => {
    const norm = normalizeTeamName(r.department);
    if (norm) dynamicTeams.add(norm);
  });

  // Combine ordered standard list and any dynamic extras
  const allTeamIds = [...ORDERED_TEAM_IDS];
  dynamicTeams.forEach((dt) => {
    if (!allTeamIds.includes(dt) && dt.toUpperCase() !== 'ALL') {
      allTeamIds.push(dt);
    }
  });

  return allTeamIds.map((teamId) => {
    const isAll = teamId === 'ALL';
    const count = isAll
      ? kpis.length
      : kpis.filter((k) => matchesTeam(k.department, teamId)).length;

    let meta = TEAM_DEFINITIONS[teamId];
    if (!meta) {
      meta = {
        id: teamId,
        label: teamId,
        labelVi: `${teamId}`,
        labelKo: `${teamId}`,
        iconName: 'Building2',
        colorClass: {
          active: 'bg-slate-700 text-white ring-2 ring-slate-400 shadow-md font-bold',
          inactive: 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700',
          badgeActive: 'bg-slate-900 text-slate-100',
          badgeInactive: 'bg-slate-700 text-slate-300',
          accent: 'text-slate-400',
        },
      };
    }

    // Always keep department name in English, no bilingual translation
    const englishLabel = meta.label;

    return {
      id: teamId,
      label: englishLabel,
      count,
      meta,
    };
  });
}

export interface TeamColorConfig {
  text: string;
  bg: string;
  border: string;
  badge: string;
  hex: string;
  ring: string;
}

export function getTeamColorConfig(dept?: string): TeamColorConfig {
  const norm = normalizeTeamName(dept);
  switch (norm) {
    case 'Lean':
      return {
        text: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold',
        hex: '#059669',
        ring: 'ring-emerald-400',
      };
    case 'Delivery':
      return {
        text: 'text-orange-700',
        bg: 'bg-orange-50',
        border: 'border-orange-300',
        badge: 'bg-orange-100 text-orange-800 border border-orange-300 font-semibold',
        hex: '#ea580c',
        ring: 'ring-orange-400',
      };
    case 'CSR':
    case 'Responsible Leadership':
      return {
        text: 'text-teal-700',
        bg: 'bg-teal-50',
        border: 'border-teal-300',
        badge: 'bg-teal-100 text-teal-800 border border-teal-300 font-semibold',
        hex: '#0d9488',
        ring: 'ring-teal-400',
      };
    case 'Dev':
    case 'Development':
      return {
        text: 'text-cyan-700',
        bg: 'bg-cyan-50',
        border: 'border-cyan-300',
        badge: 'bg-cyan-100 text-cyan-800 border border-cyan-300 font-semibold',
        hex: '#0891b2',
        ring: 'ring-cyan-400',
      };
    case 'Quality':
      return {
        text: 'text-purple-700',
        bg: 'bg-purple-50',
        border: 'border-purple-300',
        badge: 'bg-purple-100 text-purple-800 border border-purple-300 font-semibold',
        hex: '#9333ea',
        ring: 'ring-purple-400',
      };
    case 'Production':
      return {
        text: 'text-blue-700',
        bg: 'bg-blue-50',
        border: 'border-blue-300',
        badge: 'bg-blue-100 text-blue-800 border border-blue-300 font-semibold',
        hex: '#2563eb',
        ring: 'ring-blue-400',
      };
    case 'Biz':
      return {
        text: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        badge: 'bg-amber-100 text-amber-800 border border-amber-300 font-semibold',
        hex: '#d97706',
        ring: 'ring-amber-400',
      };
    case 'IT':
      return {
        text: 'text-indigo-700',
        bg: 'bg-indigo-50',
        border: 'border-indigo-300',
        badge: 'bg-indigo-100 text-indigo-800 border border-indigo-300 font-semibold',
        hex: '#4f46e5',
        ring: 'ring-indigo-400',
      };
    case 'HR':
      return {
        text: 'text-rose-700',
        bg: 'bg-rose-50',
        border: 'border-rose-300',
        badge: 'bg-rose-100 text-rose-800 border border-rose-300 font-semibold',
        hex: '#e11d48',
        ring: 'ring-rose-400',
      };
    case 'Planning':
      return {
        text: 'text-violet-700',
        bg: 'bg-violet-50',
        border: 'border-violet-300',
        badge: 'bg-violet-100 text-violet-800 border border-violet-300 font-semibold',
        hex: '#7c3aed',
        ring: 'ring-violet-400',
      };
    default:
      return {
        text: 'text-slate-700',
        bg: 'bg-slate-50',
        border: 'border-slate-300',
        badge: 'bg-slate-100 text-slate-700 border border-slate-300 font-semibold',
        hex: '#475569',
        ring: 'ring-slate-400',
      };
  }
}

/**
 * Pure monolingual selector: when Vietnamese is active, returns ONLY Vietnamese.
 * When English is active, returns ONLY English.
 * When Korean is active, returns ONLY Korean.
 * No bilingual text is returned.
 */
export function getLocalizedPureText(
  itemOrEn:
    | {
        name?: string;
        nameVi?: string;
        nameKo?: string;
        title?: string;
        titleVi?: string;
        titleKo?: string;
      }
    | string
    | null
    | undefined,
  langOrVi?: Language | string | null,
  maybeLang?: Language
): string {
  if (!itemOrEn) return '';

  // 3-argument call: getLocalizedPureText(enText, viText, language)
  if (typeof itemOrEn === 'string' && maybeLang) {
    const enText = itemOrEn;
    const viText = typeof langOrVi === 'string' ? langOrVi : enText;
    if (maybeLang === 'vi') return viText || enText;
    return enText || viText;
  }

  // 2-argument call with string: getLocalizedPureText(text, language)
  if (typeof itemOrEn === 'string') {
    return itemOrEn;
  }

  // 2-argument call with object: getLocalizedPureText(item, language)
  const language = (langOrVi as Language) || 'vi';
  const item = itemOrEn;
  if (language === 'vi') {
    return item.nameVi || item.titleVi || item.name || item.title || '';
  }
  if (language === 'ko') {
    return item.nameKo || item.titleKo || item.name || item.title || item.nameVi || item.titleVi || '';
  }
  // 'en'
  return item.name || item.title || item.nameVi || item.titleVi || '';
}
