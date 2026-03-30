import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from "recharts";
import { TrendingUp, DollarSign, Package, Target } from "lucide-react";
import { useExchangeRate } from "@/hooks/useExchangeRate";

const BASE = import.meta.env.BASE_URL;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="glass-card rounded-2xl p-5 border border-white/5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SalesForecastPage() {
  const { fmtNGN, rate } = useExchangeRate();
  const { data: accounts = [] } = useQuery({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const token = localStorage.getItem("rd_token");
      const res = await fetch(`${BASE}api/accounts`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
  });

  const acc = accounts as any[];
  const activeAcc = acc.filter(a => a.isActive);

  const totalMonthlyRevenue = activeAcc.reduce((sum, a) => {
    const sp = parseFloat(a.sellingPrice || 0);
    const vol = parseFloat(a.volume || 0);
    return sum + sp * vol;
  }, 0);

  const totalMonthlyTarget = activeAcc.reduce((sum, a) => {
    const tp = parseFloat(a.targetPrice || 0);
    const vol = parseFloat(a.volume || 0);
    return sum + tp * vol;
  }, 0);

  const totalVolume = activeAcc.reduce((sum, a) => sum + parseFloat(a.volume || 0), 0);

  const monthlyForecast = MONTHS.map((m, i) => {
    const growth = 1 + (i * 0.02);
    return {
      month: m,
      projected: Math.round(totalMonthlyRevenue * growth),
      target: Math.round(totalMonthlyTarget * growth),
    };
  });

  const axisColor = "#64748b";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Active Accounts" value={activeAcc.length.toString()} sub="generating revenue" color="bg-primary" />
        <StatCard icon={DollarSign} label="Monthly Revenue (USD)" value={`$${(totalMonthlyRevenue / 1000).toFixed(1)}k`} sub={fmtNGN(totalMonthlyRevenue)} color="bg-emerald-600" />
        <StatCard icon={Target} label="Monthly Target (USD)" value={`$${(totalMonthlyTarget / 1000).toFixed(1)}k`} sub="based on target prices" color="bg-amber-600" />
        <StatCard icon={Package} label="Total Volume" value={`${(totalVolume / 1000).toFixed(1)}t`} sub="kg/month across accounts" color="bg-blue-600" />
      </div>

      <div className="glass-card rounded-2xl p-5 border border-white/5">
        <h3 className="font-semibold text-foreground text-sm mb-4">12-Month Revenue Forecast vs Target (USD)</h3>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyForecast} margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 11 }} />
              <YAxis tick={{ fill: axisColor, fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} formatter={(v: any) => [`$${Number(v).toLocaleString()}`, ""]} />
              <Line type="monotone" dataKey="projected" stroke="#8b5cf6" strokeWidth={2.5} dot={{ fill: "#8b5cf6", r: 3 }} name="Projected Revenue" />
              <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" dot={{ fill: "#f59e0b", r: 3 }} name="Target Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="w-6 h-0.5 bg-primary inline-block rounded" /> Projected Revenue</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="w-6 h-0.5 bg-amber-400 inline-block rounded" style={{ borderTop: "2px dashed #f59e0b" }} /> Target Revenue</div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 border border-white/5">
        <h3 className="font-semibold text-foreground text-sm mb-4">Top 10 Accounts by Projected Monthly Revenue</h3>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activeAcc
                .map(a => ({ company: `${a.company} (${a.productName.slice(0, 12)})`, revenue: Math.round(parseFloat(a.sellingPrice || 0) * parseFloat(a.volume || 0)) }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 10)
              }
              layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: axisColor, fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="company" tick={{ fill: axisColor, fontSize: 10 }} width={160} />
              <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} formatter={(v: any) => [`$${Number(v).toLocaleString()}`, "Monthly Revenue"]} />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
