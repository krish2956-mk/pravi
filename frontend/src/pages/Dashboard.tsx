import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ResponsiveContainer, Cell,
} from 'recharts';
import {
  ArrowUpRight, ArrowDownRight, Minus, MoveRight,
  AlertTriangle, CalendarClock, Hourglass, Clock,
} from 'lucide-react';
import { COLORS } from '../tokens';
import type { ConditionKey } from '../tokens';
import { ConditionBadge } from '../components/Badges';
import MapPanel, { scoreToCondition } from '../components/MapPanel';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { KpiSkeleton, ChartSkeleton } from '../components/Skeletons';
import { fetchAllAssets } from '../services/api';
import type { ApiAsset } from '../services/api';

// ─── Static chart data (realistic Ahmedabad context) ─────────────────────────

const CONDITION_DIST = [
  { label: 'Excellent', count: 68,  color: COLORS.condition.excellent },
  { label: 'Good',      count: 102, color: COLORS.condition.good },
  { label: 'Fair',      count: 73,  color: COLORS.condition.fair },
  { label: 'Poor',      count: 41,  color: COLORS.condition.poor },
  { label: 'Critical',  count: 16,  color: COLORS.condition.critical },
];

const ASSET_BY_TYPE = [
  { type: 'Streetlight',    count: 94 },
  { type: 'Road Segment',   count: 72 },
  { type: 'Water Pipeline', count: 65 },
  { type: 'Transformer',    count: 48 },
  { type: 'Bridge',         count: 21 },
];

const CONDITION_TREND = [
  { month: 'Oct', avg: 3.8 }, { month: 'Nov', avg: 3.7 }, { month: 'Dec', avg: 3.6 },
  { month: 'Jan', avg: 3.7 }, { month: 'Feb', avg: 3.6 }, { month: 'Mar', avg: 3.5 },
  { month: 'Apr', avg: 3.5 }, { month: 'May', avg: 3.4 }, { month: 'Jun', avg: 3.3 },
  { month: 'Jul', avg: 3.4 }, { month: 'Aug', avg: 3.4 }, { month: 'Sep', avg: 3.4 },
];

const MAINT_COST = [
  { month: 'Oct', cost: 8.2  }, { month: 'Nov', cost: 6.1  }, { month: 'Dec', cost: 11.4 },
  { month: 'Jan', cost: 9.0  }, { month: 'Feb', cost: 7.5  }, { month: 'Mar', cost: 13.2 },
  { month: 'Apr', cost: 10.8 }, { month: 'May', cost: 8.9  }, { month: 'Jun', cost: 14.1 },
  { month: 'Jul', cost: 12.3 }, { month: 'Aug', cost: 9.7  }, { month: 'Sep', cost: 15.6 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Reason = 'Poor condition' | 'Inspection overdue' | 'Near end of life' | 'Overdue work order';

function assetReason(a: ApiAsset): Reason {
  if (a.status === 'Under Maintenance') return 'Overdue work order';
  if (a.condition_score == null) return 'Inspection overdue';
  if (a.condition_score <= 1) return 'Poor condition';
  if (a.condition_score <= 2) return 'Poor condition';
  return 'Near end of life';
}

function deriveAttentionAssets(assets: ApiAsset[], maxCount = 8) {
  return assets
    .filter(a => {
      const c = scoreToCondition(a.condition_score);
      return c === 'poor' || c === 'critical' || a.condition_score == null;
    })
    .sort((a, b) => (a.condition_score ?? 0) - (b.condition_score ?? 0))
    .slice(0, maxCount);
}

const REASON_COLORS: Record<Reason, string> = {
  'Poor condition':    COLORS.condition.critical,
  'Inspection overdue': COLORS.attention,
  'Near end of life':  COLORS.condition.poor,
  'Overdue work order': COLORS.condition.fair,
};

const REASON_ICONS: Record<Reason, React.ReactNode> = {
  'Poor condition':     <AlertTriangle className="w-3 h-3" />,
  'Inspection overdue': <CalendarClock  className="w-3 h-3" />,
  'Near end of life':   <Hourglass      className="w-3 h-3" />,
  'Overdue work order': <Clock          className="w-3 h-3" />,
};

// Fake location label from unique_id for display
const LOCATION_HINTS: Record<string, string> = {
  BRG: 'Sabarmati River',
  RDS: 'SG Highway / Ashram Rd',
  LGT: 'Vastrapur / Maninagar',
  TRF: 'Chandkheda / Naroda',
  WPL: 'Naroda / CG Road',
};
function locationHint(uniqueId: string) {
  const prefix = uniqueId.slice(0, 3);
  return LOCATION_HINTS[prefix] ?? 'Ahmedabad';
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const DeltaChip: React.FC<{ delta: number; pct: string; alert?: boolean }> = ({ delta, pct, alert }) => {
  if (delta === 0)
    return <span className="text-xs font-mono flex items-center gap-0.5" style={{ color: COLORS.inkFaint }}><Minus className="w-3 h-3" />{pct}</span>;
  const up = delta > 0;
  const color = alert
    ? (up ? COLORS.condition.critical : COLORS.condition.excellent)
    : (up ? COLORS.condition.excellent : COLORS.condition.critical);
  return (
    <span className="text-xs font-mono flex items-center gap-0.5" style={{ color }}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {pct} vs last month
    </span>
  );
};

const ReasonTag: React.FC<{ reason: Reason }> = ({ reason }) => (
  <span
    className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded"
    style={{ color: REASON_COLORS[reason], background: REASON_COLORS[reason] + '18' }}
  >
    {REASON_ICONS[reason]}
    {reason}
  </span>
);

const ChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md px-3 py-2 text-xs"
      style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.line}`, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <p className="font-medium mb-1" style={{ color: COLORS.ink }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-mono" style={{ color: p.color ?? COLORS.primary }}>{p.value}</p>
      ))}
    </div>
  );
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const [assets, setAssets] = useState<ApiAsset[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const loadAssets = useCallback(async () => {
    setApiLoading(true);
    setApiError(null);
    try {
      const data = await fetchAllAssets(500);
      setAssets(data);
      console.log(`[Dashboard] Fetched ${data.length} assets from API`);
    } catch (err) {
      console.error('[Dashboard] Asset fetch error:', err);
      setApiError(String(err));
    } finally {
      setApiLoading(false);
    }
  }, []);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  // Derived data
  const attentionAssets = React.useMemo(() => deriveAttentionAssets(assets), [assets]);
  const attentionIds = React.useMemo(() => new Set(attentionAssets.map(a => a.unique_id)), [attentionAssets]);

  const kpiData = React.useMemo(() => {
    const total = assets.length;
    const inService = assets.filter(a => a.status === 'In Service').length;
    const underMaint = assets.filter(a => a.status === 'Under Maintenance').length;
    const scored = assets.filter(a => a.condition_score != null);
    const avgCond = scored.length
      ? scored.reduce((s, a) => s + a.condition_score!, 0) / scored.length
      : 0;
    return [
      { label: 'Total Assets',        value: total,    delta: +12,  deltaPct: '+4%',  decimals: 0 },
      { label: 'In Service',          value: inService, delta: +5,  deltaPct: '+3%',  decimals: 0 },
      { label: 'Under Maintenance',   value: underMaint, delta: -3, deltaPct: '−7%',  decimals: 0 },
      { label: 'Avg. Condition',       value: avgCond,  delta: -0.1, deltaPct: '−3%', decimals: 1, suffix: '/ 5' },
      { label: 'Open Work Orders',    value: 54,        delta: +8,   deltaPct: '+17%', decimals: 0 },
      { label: 'Overdue Inspections', value: 22,        delta: +6,   deltaPct: '+38%', decimals: 0, alert: true },
    ];
  }, [assets]);

  const condTotal = CONDITION_DIST.reduce((s, d) => s + d.count, 0);

  const handleMapClick = (id: string) => {
    setHighlightedId(id);
    const row = rowRefs.current[id];
    row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div className="space-y-5">

      {/* ── Title ── */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: COLORS.ink }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: COLORS.inkMuted }}>
            Ahmedabad Municipal Infrastructure · 28 Sep 2026
          </p>
        </div>
        <div className="flex gap-2">
          <button className="text-sm font-medium px-3 py-1.5 rounded-md border transition-colors duration-150"
            style={{ borderColor: COLORS.line, color: COLORS.ink }}>Export</button>
          <button className="text-sm font-medium px-3 py-1.5 rounded-md transition-colors duration-150"
            style={{ background: COLORS.primary, color: '#FFFFFF' }}>+ New Asset</button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      {apiLoading ? <KpiSkeleton /> : (
        <div className="rounded-[10px] flex divide-x"
          style={{ background: COLORS.surface, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', divideColor: COLORS.line }}>
          {kpiData.map(kpi => (
            <div key={kpi.label} className="flex-1 px-6 py-4 min-w-0" style={{ borderColor: COLORS.line, borderRight: `1px solid ${COLORS.line}` }}>
              <p className="text-xs uppercase tracking-wider font-medium" style={{ color: COLORS.inkMuted }}>{kpi.label}</p>
              <p className="font-mono text-2xl font-semibold mt-1 leading-none"
                style={{ color: kpi.alert ? COLORS.attention : COLORS.ink }}>
                <AnimatedNumber value={kpi.value} decimals={kpi.decimals ?? 0} />
                {kpi.suffix && <span className="text-sm font-normal ml-1" style={{ color: COLORS.inkFaint }}>{kpi.suffix}</span>}
              </p>
              <div className="mt-1.5">
                <DeltaChip delta={kpi.delta} pct={kpi.deltaPct} alert={kpi.alert} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Map + Needs Attention ── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '2fr 1fr', height: 460 }}>

        {/* Map — real MapLibre GL */}
        <div className="rounded-[10px] overflow-hidden flex flex-col"
          style={{ background: COLORS.surface, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <div className="px-5 py-3 border-b shrink-0 flex items-center justify-between"
            style={{ borderColor: COLORS.line }}>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold" style={{ color: COLORS.ink }}>Asset Map</h2>
              {!apiLoading && (
                <span className="text-xs font-mono" style={{ color: COLORS.inkFaint }}>
                  {assets.filter(a => a.geometry).length} plotted
                </span>
              )}
            </div>
            <span className="text-xs" style={{ color: COLORS.inkFaint }}>Hover row · click marker to cross-highlight</span>
          </div>
          <div className="flex-1 min-h-0">
            <MapPanel
              assets={assets}
              loading={apiLoading}
              error={apiError}
              onRetry={loadAssets}
              highlightedId={highlightedId}
              onAssetHover={id => setHighlightedId(id)}
              onAssetClick={handleMapClick}
              attentionIds={attentionIds}
            />
          </div>
        </div>

        {/* Needs Attention */}
        <div className="rounded-[10px] flex flex-col overflow-hidden"
          style={{ background: COLORS.surface, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between"
            style={{ borderColor: COLORS.line }}>
            <h2 className="text-base font-semibold" style={{ color: COLORS.ink }}>Needs Attention</h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded"
              style={{ background: COLORS.condition.critical + '18', color: COLORS.condition.critical }}>
              {attentionAssets.length} assets
            </span>
          </div>

          {apiLoading ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-24 rounded animate-pulse" style={{ background: COLORS.line }} />
                  <div className="h-4 w-36 rounded animate-pulse" style={{ background: COLORS.line }} />
                  <div className="h-3 w-20 rounded animate-pulse" style={{ background: COLORS.line }} />
                </div>
              ))}
            </div>
          ) : attentionAssets.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm" style={{ color: COLORS.inkMuted }}>All assets are in good condition</p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {attentionAssets.map(a => {
                const condition = scoreToCondition(a.condition_score);
                const reason = assetReason(a);
                const isHL = highlightedId === a.unique_id;
                return (
                  <div
                    key={a.unique_id}
                    ref={el => { rowRefs.current[a.unique_id] = el; }}
                    onMouseEnter={() => setHighlightedId(a.unique_id)}
                    onMouseLeave={() => setHighlightedId(null)}
                    className="px-4 py-3 border-b cursor-pointer transition-colors duration-150"
                    style={{
                      borderColor: COLORS.line,
                      background: isHL ? COLORS.canvas : 'transparent',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs" style={{ color: COLORS.inkFaint }}>{a.unique_id}</p>
                        <p className="text-sm font-medium truncate mt-0.5" style={{ color: COLORS.ink }}>{a.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: COLORS.inkMuted }}>{locationHint(a.unique_id)}</p>
                      </div>
                      <ConditionBadge condition={condition} size="sm" />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <ReasonTag reason={reason} />
                      <button className="text-xs font-medium flex items-center gap-0.5 transition-colors duration-150"
                        style={{ color: COLORS.primary }}>
                        View <MoveRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-3 gap-5">

        {/* Condition stacked bar — full width */}
        <div className="col-span-3 rounded-[10px] px-6 py-5"
          style={{ background: COLORS.surface, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <p className="text-xs uppercase tracking-wider font-medium mb-4" style={{ color: COLORS.inkMuted }}>
            Condition Distribution
          </p>
          <div className="flex h-8 rounded-md overflow-hidden gap-px">
            {CONDITION_DIST.map(d => (
              <div key={d.label}
                className="flex items-center justify-center text-xs font-medium text-white transition-all duration-150 hover:opacity-90 cursor-default"
                style={{ width: `${(d.count / condTotal) * 100}%`, background: d.color, minWidth: 28 }}
                title={`${d.label}: ${d.count}`}>
                {d.count}
              </div>
            ))}
          </div>
          <div className="flex gap-6 mt-3">
            {CONDITION_DIST.map(d => (
              <div key={d.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-xs" style={{ color: COLORS.inkMuted }}>{d.label}</span>
                <span className="text-xs font-mono" style={{ color: COLORS.inkFaint }}>
                  {Math.round((d.count / condTotal) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Assets by type */}
        <div className="col-span-1 rounded-[10px] px-6 py-5"
          style={{ background: COLORS.surface, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <p className="text-xs uppercase tracking-wider font-medium mb-4" style={{ color: COLORS.inkMuted }}>
            Assets by Type
          </p>
          {apiLoading ? <ChartSkeleton height={180} /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={ASSET_BY_TYPE} layout="vertical" barSize={12}
                margin={{ left: 0, right: 32, top: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={COLORS.line} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="type" width={100} axisLine={false} tickLine={false}
                  tick={{ fontSize: 12, fill: COLORS.inkMuted, fontFamily: 'IBM Plex Sans' }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: COLORS.canvas }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill={COLORS.primary}
                  label={{ position: 'right', fontSize: 11, fill: COLORS.inkFaint, fontFamily: 'IBM Plex Mono' }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Condition trend — Y-axis FIXED: domain [2,5], integer ticks, 36px left padding */}
        <div className="col-span-1 rounded-[10px] px-6 py-5"
          style={{ background: COLORS.surface, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <p className="text-xs uppercase tracking-wider font-medium mb-4" style={{ color: COLORS.inkMuted }}>
            Avg. Condition — 12 Months
          </p>
          {apiLoading ? <ChartSkeleton height={180} /> : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={CONDITION_TREND} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={COLORS.line} />
                <XAxis dataKey="month" axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: COLORS.inkFaint, fontFamily: 'IBM Plex Sans' }} />
                <YAxis
                  domain={[2, 5]}
                  ticks={[2, 3, 4, 5]}
                  tickFormatter={(v: number) => String(v)}
                  width={32}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: COLORS.inkFaint, fontFamily: 'IBM Plex Mono' }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line dataKey="avg" stroke={COLORS.primary} strokeWidth={2} dot={false}
                  activeDot={{ r: 4, fill: COLORS.primary }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Maintenance cost */}
        <div className="col-span-1 rounded-[10px] px-6 py-5"
          style={{ background: COLORS.surface, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <p className="text-xs uppercase tracking-wider font-medium mb-1" style={{ color: COLORS.inkMuted }}>
            Maintenance Cost — ₹ Lakh
          </p>
          <p className="font-mono text-2xl font-semibold mb-4" style={{ color: COLORS.ink }}>
            ₹ <AnimatedNumber value={126.8} decimals={1} duration={1000} />L
          </p>
          {apiLoading ? <ChartSkeleton height={140} /> : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={MAINT_COST} barSize={14} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={COLORS.line} />
                <XAxis dataKey="month" axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: COLORS.inkFaint, fontFamily: 'IBM Plex Sans' }} />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: COLORS.canvas }} />
                <Bar dataKey="cost" radius={[3, 3, 0, 0]}>
                  {MAINT_COST.map((entry, i) => (
                    <Cell key={i}
                      fill={entry.cost > 12 ? COLORS.attention : COLORS.primary}
                      fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Decision support strip ── */}
      <div className="rounded-[10px] px-6 py-5"
        style={{ background: COLORS.surface, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <p className="text-xs uppercase tracking-wider font-medium mb-4" style={{ color: COLORS.inkMuted }}>
          Decision Support
        </p>
        <div className="grid grid-cols-3 divide-x" style={{ divideColor: COLORS.line }}>
          <div className="pr-8" style={{ borderRight: `1px solid ${COLORS.line}` }}>
            <p className="text-sm font-medium" style={{ color: COLORS.ink }}>End-of-Life in 24 Months</p>
            <p className="font-mono text-2xl font-semibold mt-1" style={{ color: COLORS.condition.poor }}>
              <AnimatedNumber value={18} />
            </p>
            <p className="text-xs mt-1" style={{ color: COLORS.inkMuted }}>Assets approaching end of design life</p>
            <button className="mt-3 text-xs font-medium" style={{ color: COLORS.primary }}>View list →</button>
          </div>
          <div className="px-8" style={{ borderRight: `1px solid ${COLORS.line}` }}>
            <p className="text-sm font-medium" style={{ color: COLORS.ink }}>Preventive vs Corrective</p>
            <div className="flex items-end gap-4 mt-2">
              <div>
                <p className="font-mono text-2xl font-semibold" style={{ color: COLORS.condition.good }}>
                  <AnimatedNumber value={68} />%
                </p>
                <p className="text-xs mt-0.5" style={{ color: COLORS.inkMuted }}>Preventive</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-semibold" style={{ color: COLORS.condition.poor }}>
                  <AnimatedNumber value={32} />%
                </p>
                <p className="text-xs mt-0.5" style={{ color: COLORS.inkMuted }}>Corrective</p>
              </div>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden mt-3 gap-px">
              <div className="rounded-l-full" style={{ width: '68%', background: COLORS.condition.good }} />
              <div className="rounded-r-full" style={{ width: '32%', background: COLORS.condition.poor }} />
            </div>
          </div>
          <div className="pl-8">
            <p className="text-sm font-medium" style={{ color: COLORS.ink }}>Work Order Backlog</p>
            <p className="font-mono text-2xl font-semibold mt-1" style={{ color: COLORS.attention }}>
              <AnimatedNumber value={54} />
            </p>
            <p className="text-xs mt-1" style={{ color: COLORS.inkMuted }}>
              <span style={{ color: COLORS.condition.critical }}>11 emergency</span>
              {' · '}24 corrective · 19 preventive
            </p>
            <button className="mt-3 text-xs font-medium" style={{ color: COLORS.primary }}>Manage orders →</button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
