import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Loader2, TrendingUp, Package, Clock, AlertTriangle, Maximize2, Minimize2, BarChart2, PieChart as PieIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

const BASE = import.meta.env.BASE_URL;
function authH() { return { Authorization: `Bearer ${localStorage.getItem("rd_token")}` }; }

const DARK_COLORS = ['hsl(252,89%,65%)', 'hsl(190,90%,50%)', 'hsl(280,80%,60%)', 'hsl(320,80%,60%)', 'hsl(150,80%,50%)', 'hsl(50,90%,55%)', 'hsl(10,80%,60%)', 'hsl(230,80%,60%)'];
const LIGHT_COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#3B82F6'];

function useChartTheme() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  return {
    isLight,
    colors: isLight ? LIGHT_COLORS : DARK_COLORS,
    gridStroke: isLight ? "#E5E7EB" : "rgba(255,255,255,0.05)",
    axisColor: isLight ? "#374151" : "rgba(255,255,255,0.6)",
    axisStroke: isLight ? "#9CA3AF" : "rgba(255,255,255,0.3)",
    tooltipStyle: {
      contentStyle: {
        backgroundColor: isLight ? "#FFFFFF" : "rgba(15,17,26,0.95)",
        borderColor: isLight ? "#E5E7EB" : "rgba(255,255,255,0.1)",
        borderRadius: "10px",
        color: isLight ? "#111827" : "#fff",
        fontSize: 13,
      },
    },
  };
}

function ChartCard({ title, children, controls }: { title: string; children: (full: boolean) => React.ReactNode; controls?: React.ReactNode }) {
  const [full, setFull] = useState(false);
  const { isLight } = useChartTheme();
  return (
    <>
      <div className={cn("glass-card p-6 rounded-2xl", isLight && "border border-slate-200 bg-white")}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold font-display">{title}</h3>
          <div className="flex items-center gap-2">
            {controls}
            <button onClick={() => setFull(f => !f)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              {full ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        {children(false)}
      </div>
      {full && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setFull(false)} />
          <div className={cn("relative w-full max-w-4xl rounded-2xl p-6 border shadow-2xl",
            isLight ? "bg-white border-slate-200" : "glass-panel border-white/10")}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold font-display">{title}</h3>
              <button onClick={() => setFull(false)} className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground"><Minimize2 className="w-4 h-4" /></button>
            </div>
            {children(true)}
          </div>
        </div>
      )}
    </>
  );
}

function CategoryChart({ data, isLight, colors }: any) {
  const [mode, setMode] = useState<"pie"|"bar">("pie");
  const formatted = data.map((d: any) => ({ name: d.category.charAt(0).toUpperCase() + d.category.slice(1), value: Math.round(d.spend) }));
  return (
    <ChartCard title="Spend by Category"
      controls={
        <div className={cn("flex rounded-lg border overflow-hidden", isLight ? "border-slate-200" : "border-white/10")}>
          {([["pie", PieIcon], ["bar", BarChart2]] as const).map(([m, Icon]) => (
            <button key={m} onClick={() => setMode(m)}
              className={cn("p-1.5 transition-colors", mode === m ? "bg-primary text-white" : "text-muted-foreground hover:bg-white/5")}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      }>
      {(full) => (
        <div style={{ height: full ? 400 : 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            {mode === "pie" ? (
              <PieChart>
                <Pie data={formatted} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {formatted.map((_: any, i: number) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip {...{ content: undefined }} contentStyle={{ backgroundColor: isLight ? "#fff" : "rgba(15,17,26,0.95)", borderColor: isLight ? "#e5e7eb" : "rgba(255,255,255,0.1)", borderRadius: 10, color: isLight ? "#111" : "#fff" }} />
              </PieChart>
            ) : (
              <BarChart data={formatted} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#E5E7EB" : "rgba(255,255,255,0.05)"} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: isLight ? "#374151" : "rgba(255,255,255,0.6)" }} />
                <YAxis tick={{ fontSize: 11, fill: isLight ? "#374151" : "rgba(255,255,255,0.6)" }} />
                <Tooltip contentStyle={{ backgroundColor: isLight ? "#fff" : "rgba(15,17,26,0.95)", borderColor: isLight ? "#e5e7eb" : "rgba(255,255,255,0.1)", borderRadius: 10, color: isLight ? "#111" : "#fff" }} />
                <Bar dataKey="value" fill={colors[0]} radius={[4,4,0,0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

export default function AnalyticsTab() {
  const { theme } = useTheme();
  const ct = useChartTheme();
  const isLight = theme === "light";

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/procurement/analytics"],
    queryFn: async () => {
      const r = await fetch(`${BASE}api/procurement/analytics`, { headers: authH() });
      return r.json();
    },
  });

  if (isLoading) return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!data) return null;

  const kpiCls = cn("rounded-2xl border p-5 space-y-2", isLight ? "bg-white border-slate-200" : "glass-card border-white/10");

  const statusData = (data.statusDistribution ?? []).map((s: any) => ({
    name: s.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
    value: s.count,
  }));

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Spend This Month", value: (data.totalSpendMonth ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 }), icon: TrendingUp, color: "text-blue-400 bg-blue-500/10" },
          { label: "POs Raised This Month", value: data.posThisMonth ?? 0, icon: Package, color: "text-violet-400 bg-violet-500/10" },
          { label: "Pending Approvals", value: data.pendingApprovals ?? 0, icon: Clock, color: "text-amber-400 bg-amber-500/10" },
          { label: "Overdue Deliveries", value: data.overdueDeliveries ?? 0, icon: AlertTriangle, color: (data.overdueDeliveries ?? 0) > 0 ? "text-red-400 bg-red-500/10" : "text-emerald-400 bg-emerald-500/10" },
        ].map(k => (
          <div key={k.label} className={kpiCls}>
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", k.color)}>
              <k.icon className="w-4.5 h-4.5" />
            </div>
            <p className="text-2xl font-bold font-display">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly Spend Trend */}
      <ChartCard title="Monthly Spend Trend">
        {(full) => (
          <div style={{ height: full ? 400 : 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend ?? []} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ct.colors[0]} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={ct.colors[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: ct.axisColor }} axisLine={{ stroke: ct.axisStroke }} />
                <YAxis tick={{ fontSize: 11, fill: ct.axisColor }} axisLine={{ stroke: ct.axisStroke }} />
                <Tooltip {...ct.tooltipStyle} />
                <Area type="monotone" dataKey="spend" stroke={ct.colors[0]} fill="url(#spendGrad)" strokeWidth={2} name="Spend" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      {/* Two-column charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category spend */}
        {data.categorySpend?.length > 0 && (
          <CategoryChart data={data.categorySpend} isLight={isLight} colors={ct.colors} />
        )}

        {/* PO Status Distribution */}
        {statusData.length > 0 && (
          <ChartCard title="PO Status Distribution">
            {(full) => (
              <div style={{ height: full ? 400 : 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%">
                      {statusData.map((_: any, i: number) => <Cell key={i} fill={ct.colors[i % ct.colors.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: isLight ? "#fff" : "rgba(15,17,26,0.95)", borderColor: isLight ? "#e5e7eb" : "rgba(255,255,255,0.1)", borderRadius: 10, color: isLight ? "#111" : "#fff" }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        )}
      </div>

      {/* Top Vendors */}
      {data.topVendors?.length > 0 && (
        <ChartCard title="Top Vendors by Spend">
          {(full) => (
            <div style={{ height: full ? 400 : 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topVendors} layout="vertical" margin={{ top: 4, right: 16, left: 80, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: ct.axisColor }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: ct.axisColor }} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: isLight ? "#fff" : "rgba(15,17,26,0.95)", borderColor: isLight ? "#e5e7eb" : "rgba(255,255,255,0.1)", borderRadius: 10, color: isLight ? "#111" : "#fff" }} />
                  <Bar dataKey="spend" fill={ct.colors[1]} radius={[0,4,4,0]} name="Total Spend">
                    {data.topVendors.map((_: any, i: number) => <Cell key={i} fill={ct.colors[i % ct.colors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      )}
    </div>
  );
}
