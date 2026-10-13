/**
 * Narrow re-export barrel for recharts.
 *
 * `import * as XLSX from 'xlsx'`-style namespace imports defeat tree-shaking,
 * and inside a dynamic import they pull the entire library (~580 KB) into the
 * chunk. Re-exporting only the components this app actually renders lets Rollup
 * prune the rest while still keeping recharts out of the entry chunk, because
 * ./charts is only reached through a dynamic import.
 */
export {
  ResponsiveContainer,
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';