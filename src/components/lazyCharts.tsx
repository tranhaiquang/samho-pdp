import { Suspense, lazy } from 'react';
import type { ComponentType, FC, ReactNode } from 'react';

/**
 * recharts is ~300 KB minified and is only ever needed once a chart is actually
 * on screen. Importing it eagerly puts all of it in the entry chunk, which every
 * visitor downloads before the app can paint.
 *
 * Each export is wrapped in React.lazy instead, so rollup emits recharts as its
 * own chunk. Every wrapper awaits the same ./charts module, so the chunk is
 * fetched once and shared. Components using these must sit inside a <Suspense>
 * boundary - see <ChartBoundary> below.
 */

type ChartComponent = ComponentType<any>;

// Single shared dynamic import: Rollup emits one chunk, and because ./charts
// re-exports named components (rather than importing the namespace) the unused
// parts of recharts are still tree-shaken away.
const loadCharts = () => import('./charts');

function lazyChart(name: string) {
  return lazy(async () => {
    const mod = (await loadCharts()) as unknown as Record<string, ChartComponent>;
    const component = mod[name];
    if (!component) {
      throw new Error(`recharts has no export named "${name}"`);
    }
    return { default: component };
  });
}

export const ResponsiveContainer = lazyChart('ResponsiveContainer');
export const LineChart = lazyChart('LineChart');
export const BarChart = lazyChart('BarChart');
export const Line = lazyChart('Line');
export const Bar = lazyChart('Bar');
export const XAxis = lazyChart('XAxis');
export const YAxis = lazyChart('YAxis');
export const CartesianGrid = lazyChart('CartesianGrid');
export const Tooltip = lazyChart('Tooltip');
export const Legend = lazyChart('Legend');

/**
 * Suspense boundary for a lazily-loaded chart. Reserves the chart's height so
 * the page does not jump when the chunk arrives, and keeps the neutral styling
 * of the surrounding dashboard cards.
 */
export const ChartBoundary: FC<{ heightClass?: string; label?: string; children: ReactNode }> = ({
  heightClass = 'h-64',
  label = 'Loading chart...',
  children,
}) => (
  <div className={`relative ${heightClass}`}>
    <Suspense
      fallback={
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-50">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-emerald-600 animate-spin" />
            {label}
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  </div>
);