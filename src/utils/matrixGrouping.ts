import { ImprovementPriority, KpiItem, ResourcePerson, PolicyLevel } from '../types';

export const CANONICAL_TEAMS = [
  'Lean',
  'Biz',
  'Quality',
  'CSR',
  'Dev',
  'Production',
  'Planning',
  'IT',
  'HR',
  'General',
] as const;

export interface TeamPaletteConfig {
  name: string;
  hex: string;
  tailwindText: string;
  tailwindBg: string;
  tailwindBadge: string;
  borderHex: string;
}

export const TEAM_PALETTE: Record<string, TeamPaletteConfig> = {
  Lean: {
    name: 'Lean',
    hex: '#0f766e', // Teal 700
    tailwindText: 'text-teal-700',
    tailwindBg: 'bg-teal-50',
    tailwindBadge: 'bg-teal-50 text-teal-800 border-teal-300',
    borderHex: '#0f766e',
  },
  Biz: {
    name: 'Biz',
    hex: '#7c3aed', // Purple 600
    tailwindText: 'text-purple-700',
    tailwindBg: 'bg-purple-50',
    tailwindBadge: 'bg-purple-50 text-purple-800 border-purple-300',
    borderHex: '#7c3aed',
  },
  Quality: {
    name: 'Quality',
    hex: '#16a34a', // Green 600
    tailwindText: 'text-green-700',
    tailwindBg: 'bg-green-50',
    tailwindBadge: 'bg-green-50 text-green-800 border-green-300',
    borderHex: '#16a34a',
  },
  CSR: {
    name: 'CSR',
    hex: '#dc2626', // Red 600
    tailwindText: 'text-red-600',
    tailwindBg: 'bg-red-50',
    tailwindBadge: 'bg-red-50 text-red-800 border-red-300',
    borderHex: '#dc2626',
  },
  Dev: {
    name: 'Dev',
    hex: '#2563eb', // Blue 600
    tailwindText: 'text-blue-600',
    tailwindBg: 'bg-blue-50',
    tailwindBadge: 'bg-blue-50 text-blue-800 border-blue-300',
    borderHex: '#2563eb',
  },
  Production: {
    name: 'Production',
    hex: '#0284c7', // Sky 600 / Cobalt
    tailwindText: 'text-sky-700',
    tailwindBg: 'bg-sky-50',
    tailwindBadge: 'bg-sky-50 text-sky-800 border-sky-300',
    borderHex: '#0284c7',
  },
  Planning: {
    name: 'Planning',
    hex: '#db2777', // Pink 600
    tailwindText: 'text-pink-600',
    tailwindBg: 'bg-pink-50',
    tailwindBadge: 'bg-pink-50 text-pink-800 border-pink-300',
    borderHex: '#db2777',
  },
  IT: {
    name: 'IT',
    hex: '#9333ea', // Purple 600
    tailwindText: 'text-purple-600',
    tailwindBg: 'bg-purple-50',
    tailwindBadge: 'bg-purple-50 text-purple-800 border-purple-300',
    borderHex: '#9333ea',
  },
  HR: {
    name: 'HR',
    hex: '#d97706', // Amber 600
    tailwindText: 'text-amber-600',
    tailwindBg: 'bg-amber-50',
    tailwindBadge: 'bg-amber-50 text-amber-800 border-amber-300',
    borderHex: '#d97706',
  },
  General: {
    name: 'General',
    hex: '#000000', // Black for shared breakthrough objectives
    tailwindText: 'text-black',
    tailwindBg: 'bg-slate-50',
    tailwindBadge: 'bg-slate-100 text-slate-800 border-slate-300',
    borderHex: '#000000',
  },
};

/**
 * Extract canonical team name from item department, owner, code, or title
 */
export function extractItemTeam(item: any): string {
  if (!item) return 'General';

  // 1. Explicit department
  if (item.department) {
    const d = item.department.toLowerCase().trim();
    if (d.includes('lean')) return 'Lean';
    if (d.includes('biz') || d.includes('business') || d.includes('delivery')) return 'Biz';
    if (d.includes('quality') || d.includes('qa') || d.includes('cl')) return 'Quality';
    if (d.includes('csr') || d.includes('leadership') || d.includes('responsible')) return 'CSR';
    if (d.includes('dev') || d.includes('development')) return 'Dev';
    if (d.includes('prod') || d.includes('production') || d.includes('sản xuất')) return 'Production';
    if (d.includes('plan') || d.includes('planning') || d.includes('kế hoạch')) return 'Planning';
    if (d.includes('it') || d.includes('cntt') || d.includes('information')) return 'IT';
    if (d.includes('hr') || d.includes('nhân sự')) return 'HR';
  }

  // 2. Owner string with team prefix
  if (item.owner) {
    const o = item.owner.toLowerCase().trim();
    if (o.startsWith('lean') || o.includes('lean:')) return 'Lean';
    if (o.startsWith('biz') || o.includes('biz:') || o.includes('delivery')) return 'Biz';
    if (o.startsWith('quality') || o.includes('quality:') || o.includes('qa:')) return 'Quality';
    if (o.startsWith('csr') || o.includes('csr:') || o.includes('leadership')) return 'CSR';
    if (o.startsWith('dev') || o.includes('dev:')) return 'Dev';
    if (o.startsWith('prod') || o.includes('prod:') || o.includes('production:')) return 'Production';
    if (o.startsWith('plan') || o.includes('plan:') || o.includes('planning:')) return 'Planning';
    if (o.startsWith('it') || o.includes('it:') || o.includes('cntt:')) return 'IT';
    if (o.startsWith('hr') || o.includes('hr:')) return 'HR';
  }

  // 3. Code patterns
  if (item.code) {
    const c = item.code.trim();
    if (c.startsWith('L1 1.') || c === 'L1.1' || c === 'L1 1') return 'Lean';
    if (c.startsWith('L1 2.') || c === 'L1.2' || c === 'L1 2') return 'Biz';
    if (c.startsWith('L1 3.') || c === 'L1.3' || c === 'L1 3') return 'CSR';
    if (c.startsWith('L1 4.') || c === 'L1.4' || c === 'L1 4') return 'Dev';
    if (c.startsWith('L1 5.') || c === 'L1.5' || c === 'L1 5') return 'Quality';
    if (c.startsWith('L3 1.4.')) return 'Production';
    if (c.startsWith('L3 1.3.')) return 'Lean';
    if (c.startsWith('L3 1.1.')) return 'Lean';
    if (c.startsWith('L3 1.2.')) return 'Lean';
    if (c.startsWith('L2 1.')) return 'Lean';
  }

  // 4. Title keywords
  const title = (item.title || item.titleVi || item.name || '').toLowerCase();
  if (title.includes('delivery') || title.includes('on time') || title.includes('giao hàng')) return 'Biz';
  if (title.includes('csr') || title.includes('responsible') || title.includes('trách nhiệm')) return 'CSR';
  if (title.includes('quality') || title.includes('chất lượng') || title.includes('defect') || title.includes('aql')) return 'Quality';
  if (title.includes('lean') || title.includes('pph') || title.includes('autocut') || title.includes('tct') || title.includes('flow') || title.includes('andon') || title.includes('tpm')) return 'Lean';
  if (title.includes('partpath') || title.includes('wip') || title.includes('production') || title.includes('sản xuất')) return 'Production';
  if (title.includes('dev') || title.includes('development') || title.includes('phát triển')) return 'Dev';
  if (title.includes('planning') || title.includes('kế hoạch')) return 'Planning';

  return 'General';
}

const TEAM_RANK: Record<string, number> = {
  Lean: 1,
  Biz: 2,
  Quality: 3,
  CSR: 4,
  Dev: 5,
  Production: 6,
  Planning: 7,
  IT: 8,
  HR: 9,
  General: 10,
};

/**
 * Groups items contiguously by functional team across all 4 compass directions.
 * When a new item is added, it is automatically clustered with other items of its team.
 */
export function sortContiguousByTeam<T extends { id?: string; code?: string; department?: string; owner?: string; title?: string; name?: string }>(
  items: T[]
): T[] {
  if (!items || items.length <= 1) return items;

  const groups: Map<string, T[]> = new Map();
  const teamFirstSeenIndex: Map<string, number> = new Map();

  items.forEach((item, index) => {
    const team = extractItemTeam(item);
    if (!groups.has(team)) {
      groups.set(team, []);
      teamFirstSeenIndex.set(team, index);
    }
    groups.get(team)!.push(item);
  });

  const sortedTeams = Array.from(groups.keys()).sort((a, b) => {
    const rankA = TEAM_RANK[a] ?? 50;
    const rankB = TEAM_RANK[b] ?? 50;
    if (rankA !== rankB) return rankA - rankB;
    return (teamFirstSeenIndex.get(a) ?? 0) - (teamFirstSeenIndex.get(b) ?? 0);
  });

  const result: T[] = [];
  for (const team of sortedTeams) {
    result.push(...groups.get(team)!);
  }
  return result;
}

/**
 * Returns text color based on user rule:
 * - 3-Year breakthrough objectives & 1-Year breakthrough objectives are COMMON to all teams -> BLACK (#000000)
 * - All other items -> distinct color of their functional team!
 */
export function getCompassItemTextColor(
  item: any,
  direction: 'north' | 'east' | 'south' | 'west',
  level: PolicyLevel
): string {
  // L1 South: 3-Year Breakthrough Objectives (common -> BLACK)
  if (level === 'L1' && direction === 'south') {
    return '#000000';
  }
  // L1 West: 1-Year / Annual Breakthrough Objectives (common -> BLACK)
  if (level === 'L1' && direction === 'west') {
    return '#000000';
  }
  // L2 South: Annual Breakthrough Objectives linked from L1 (common -> BLACK)
  if (level === 'L2' && direction === 'south') {
    return '#000000';
  }

  // All other directions / levels: colored by team
  const team = extractItemTeam(item);
  return TEAM_PALETTE[team]?.hex || '#0f766e';
}

/**
 * Get Team Color Config
 */
export function getTeamPalette(teamName: string): TeamPaletteConfig {
  return TEAM_PALETTE[teamName] || TEAM_PALETTE.General;
}
