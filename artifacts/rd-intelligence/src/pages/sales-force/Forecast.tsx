import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, DollarSign, Package, Download, Bell, ChevronLeft, ChevronRight,
  Filter, Star, AlertTriangle, CheckCircle, Clock, X, Search, Send,
  BarChart2, PieChartIcon, Donut,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isWithinInterval } from "date-fns";

const BASE = import.meta.env.BASE_URL;

type ForecastStatus = "pending" | "confirmed" | "probable";

interface Forecast {
  id: number;
  accountId: number | null;
  company: string;
  productName: string;
  productType: string | null;
  customerType: string | null;
  isStrategic: boolean;
  lastOrderDate: string | null;
  lastOrderVolume: string | null;
  forecastDate: string;
  forecastVolume: string | null;
  confidence: number;
  status: ForecastStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const PIE_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1", "#84cc16"];

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("rd_token")}`, "Content-Type": "application/json" };
}

function getRowColor(confidence: number) {
  if (confidence >= 75) return "bg-emerald-500/8 border-emerald-500/15";
  if (confidence >= 50) return "bg-amber-500/8 border-amber-500/15";
  return "bg-red-500/8 border-red-500/15";
}

function getConfidenceColor(confidence: number) {
  if (confidence >= 75) return "text-emerald-400";
  if (confidence >= 50) return "text-amber-400";
  return "text-red-400";
}

function getCalColor(confidence: number) {
  if (confidence >= 75) return "bg-emerald-500/20 border-emerald-500/30 text-emerald-300";
  if (confidence >= 50) return "bg-amber-500/20 border-amber-500/30 text-amber-300";
  return "bg-red-500/20 border-red-500/30 text-red-300";
}

const STATUS_CONFIG: Record<ForecastStatus, { label: string; dot: string; badge: string }> = {
  pending:   { label: "Pending",   dot: "bg-red-500",    badge: "bg-red-500/15 text-red-400 border-red-500/20" },
  confirmed: { label: "Confirmed", dot: "bg-emerald-500", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  probable:  { label: "Probable",  dot: "bg-amber-500",  badge: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
};

function StatusBadge({ status, onChange }: { status: ForecastStatus; onChange?: (s: ForecastStatus) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[status];
  return (
    <div className="relative">
      <button
        onClick={() => onChange && setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${cfg.badge} ${onChange ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </button>
      {open && onChange && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-[#1e1e2e] border border-white/10 rounded-xl shadow-xl py-1 min-w-[130px]">
          {(["pending", "confirmed", "probable"] as ForecastStatus[]).map(s => (
            <button key={s} onClick={() => { onChange(s); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/5 text-left ${STATUS_CONFIG[s].badge.split(" ")[1]}`}>
              <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

type ChartViewType = "bar" | "pie" | "donut";

function ChartPanel({
  title, data, views, defaultView,
}: {
  title: string;
  data: { name: string; value: number }[];
  views: ChartViewType[];
  defaultView: ChartViewType;
}) {
  const [view, setView] = useState<ChartViewType>(defaultView);
  const axisColor = "#64748b";
  const icons: Record<ChartViewType, any> = { bar: BarChart2, pie: PieChartIcon, donut: Donut };

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
        <div className="flex items-center gap-1">
          {views.map(v => {
            const Icon = icons[v];
            return (
              <button key={v} onClick={() => setView(v)}
                className={`p-1.5 rounded-lg transition-colors ${view === v ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/5"}`}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          {view === "bar" ? (
            <BarChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 10 }} />
              <YAxis tick={{ fill: axisColor, fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                formatter={(v: any) => [`${Number(v).toLocaleString()} kg`]} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          ) : (
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={view === "donut" ? 60 : 0} outerRadius={100}
                paddingAngle={view === "donut" ? 3 : 0}>
                {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                formatter={(v: any) => [`${Number(v).toLocaleString()} kg`]} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 10, color: axisColor }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface CalendarTooltip { forecast: Forecast; x: number; y: number }

function ForecastCalendar({ forecasts, filters }: { forecasts: Forecast[]; filters: any }) {
  const today = new Date();
  const [calDate, setCalDate] = useState(today);
  const [tooltip, setTooltip] = useState<CalendarTooltip | null>(null);
  const [selected, setSelected] = useState<Forecast | null>(null);
  const calRef = useRef<HTMLDivElement>(null);

  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const monthStart = startOfMonth(calDate);
  const monthEnd = endOfMonth(calDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startPad = monthStart.getDay();
  const grid: (Date | null)[] = [...Array(startPad).fill(null), ...daysInMonth];
  while (grid.length % 7 !== 0) grid.push(null);

  const forecastsByDay = useMemo(() => {
    const map = new Map<string, Forecast[]>();
    forecasts.forEach(f => {
      const key = f.forecastDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    });
    return map;
  }, [forecasts]);

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="glass-card rounded-2xl border border-white/5 overflow-hidden" ref={calRef}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <h3 className="font-semibold text-foreground text-sm">Forecast Calendar</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/50" /> High ≥75%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-500/50" /> Med 50-74%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/30 border border-red-500/50" /> Low &lt;50%</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCalDate(new Date(year, month - 1))}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground w-28 text-center">
              {format(calDate, "MMMM yyyy")}
            </span>
            <button onClick={() => setCalDate(new Date(year, month + 1))}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-white/5">
        {DAYS.map(d => (
          <div key={d} className="px-2 py-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {grid.map((day, i) => {
          const dayForecasts = day ? forecastsByDay.get(format(day, "yyyy-MM-dd")) || [] : [];
          const isToday = day ? isSameDay(day, today) : false;
          const visible = dayForecasts.slice(0, 2);
          const extra = dayForecasts.length - 2;
          return (
            <div key={i}
              className={`min-h-[90px] p-1.5 border-r border-b border-white/4 last:border-r-0 ${!day ? "bg-black/10" : "hover:bg-white/2 transition-colors"}`}>
              {day && (
                <>
                  <span className={`text-xs font-medium mb-1 block w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-white" : "text-muted-foreground"}`}>
                    {day.getDate()}
                  </span>
                  <div className="space-y-0.5">
                    {visible.map((f, fi) => (
                      <div key={fi}
                        className={`text-[9px] px-1 py-0.5 rounded border cursor-pointer truncate leading-tight ${getCalColor(f.confidence)}`}
                        title={`${f.company} · ${f.productName} · ${f.forecastVolume ?? "?"} kg · ${f.confidence}%`}
                        onMouseEnter={e => {
                          const rect = (e.target as HTMLElement).getBoundingClientRect();
                          const calRect = calRef.current?.getBoundingClientRect();
                          setTooltip({ forecast: f, x: rect.left - (calRect?.left ?? 0), y: rect.bottom - (calRect?.top ?? 0) + 4 });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={() => setSelected(f)}>
                        {f.company}
                      </div>
                    ))}
                    {extra > 0 && (
                      <span className="text-[9px] text-muted-foreground pl-1">+{extra} more</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {tooltip && (
        <div className="absolute z-50 pointer-events-none bg-[#1e1e2e] border border-white/15 rounded-xl p-3 shadow-2xl text-xs"
          style={{ left: tooltip.x, top: tooltip.y, minWidth: 200 }}>
          <p className="font-semibold text-foreground">{tooltip.forecast.company}</p>
          <p className="text-muted-foreground">{tooltip.forecast.productName}</p>
          {tooltip.forecast.productType && <p className="text-muted-foreground capitalize">{tooltip.forecast.productType.replace(/_/g, " ")}</p>}
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/10">
            <span className="text-foreground font-medium">{tooltip.forecast.forecastVolume ?? "—"} kg</span>
            <span className={`font-semibold ${getConfidenceColor(tooltip.forecast.confidence)}`}>{tooltip.forecast.confidence}%</span>
            <StatusBadge status={tooltip.forecast.status} />
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e1e2e] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-foreground">{selected.company}</h3>
              <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              {[
                ["Product", selected.productName],
                ["Product Type", selected.productType?.replace(/_/g, " ") ?? "—"],
                ["Customer Type", selected.customerType ?? "—"],
                ["Forecast Date", selected.forecastDate],
                ["Forecast Volume", `${selected.forecastVolume ?? "—"} kg`],
                ["Last Order Date", selected.lastOrderDate ?? "—"],
                ["Last Order Volume", selected.lastOrderVolume ? `${selected.lastOrderVolume} kg` : "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium text-foreground capitalize">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Confidence</dt>
                <dd className={`font-bold ${getConfidenceColor(selected.confidence)}`}>{selected.confidence}%</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground">Status</dt>
                <dd><StatusBadge status={selected.status} /></dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

function NotifyModal({ onClose, users }: { onClose: () => void; users: any[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [title, setTitle] = useState("Procurement Forecast Notification");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: number) => setSelected(prev =>
    prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
  );

  const handleSend = async () => {
    if (!selected.length || !message.trim()) return;
    setSending(true);
    try {
      await fetch(`${BASE}api/forecasts/notify-procurement`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ userIds: selected, title, message }),
      });
      setSent(true);
      setTimeout(onClose, 1500);
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <div>
            <h3 className="font-bold text-foreground">Notify Procurement</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Select staff and compose your message</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
            <p className="text-foreground font-semibold">Notifications sent!</p>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Notification Title
                </label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Message Content
                </label>
                <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Enter notification message..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none" />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Select Staff ({selected.length} selected)
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search staff..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors" />
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {filtered.map(u => (
                    <label key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                      <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)}
                        className="rounded border-white/20 accent-primary" />
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {u.name?.charAt(0) ?? "?"}
                      </div>
                      <div>
                        <p className="text-sm text-foreground font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </label>
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-4">No staff found</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-white/8 flex gap-3">
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-muted-foreground hover:bg-white/5 text-sm transition-colors">
                Cancel
              </button>
              <button onClick={handleSend} disabled={!selected.length || !message.trim() || sending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {sending ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send to {selected.length} Staff
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SalesForecastPage() {
  const { fmtNGN } = useExchangeRate();
  const qc = useQueryClient();

  const [companyFilter, setCompanyFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [productTypeFilter, setProductTypeFilter] = useState("all");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);
  const [strategicOnly, setStrategicOnly] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: accounts = [] } = useQuery({
    queryKey: ["/api/accounts"],
    queryFn: async () => {
      const res = await fetch(`${BASE}api/accounts`, { headers: authHeaders() });
      return res.json();
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch(`${BASE}api/users`, { headers: authHeaders() });
      return res.json();
    },
  });

  const { data: rawForecasts = [], isLoading: loadingForecasts } = useQuery({
    queryKey: ["/api/forecasts"],
    queryFn: async () => {
      const res = await fetch(`${BASE}api/forecasts`, { headers: authHeaders() });
      return res.json() as Promise<Forecast[]>;
    },
  });

  const seedIfEmpty = useCallback(async () => {
    if (rawForecasts.length === 0 && !loadingForecasts && !seeding) {
      setSeeding(true);
      try {
        await fetch(`${BASE}api/forecasts/seed`, { method: "POST", headers: authHeaders() });
        qc.invalidateQueries({ queryKey: ["/api/forecasts"] });
      } finally { setSeeding(false); }
    }
  }, [rawForecasts.length, loadingForecasts, seeding, qc]);

  useEffect(() => { seedIfEmpty(); }, [rawForecasts.length, loadingForecasts]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Forecast> }) => {
      const res = await fetch(`${BASE}api/forecasts/${id}`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/forecasts"] }),
  });

  const acc = accounts as any[];
  const activeAcc = acc.filter(a => a.isActive);
  const totalMonthlyRevenue = activeAcc.reduce((sum, a) => sum + parseFloat(a.sellingPrice || 0) * parseFloat(a.volume || 0), 0);
  const totalVolume = activeAcc.reduce((sum, a) => sum + parseFloat(a.volume || 0), 0);

  const rangeEnd = addDays(new Date(), timeRange);

  const filteredForecasts = useMemo(() => {
    return rawForecasts.filter(f => {
      if (companyFilter !== "all" && f.company !== companyFilter) return false;
      if (productFilter !== "all" && f.productName !== productFilter) return false;
      if (productTypeFilter !== "all" && f.productType !== productTypeFilter) return false;
      if (customerTypeFilter !== "all" && f.customerType !== customerTypeFilter) return false;
      if (confidenceFilter === "high" && f.confidence < 75) return false;
      if (confidenceFilter === "medium" && (f.confidence < 50 || f.confidence >= 75)) return false;
      if (confidenceFilter === "low" && f.confidence >= 50) return false;
      if (strategicOnly && !f.isStrategic) return false;
      try {
        const fDate = parseISO(f.forecastDate);
        if (!isWithinInterval(fDate, { start: new Date(), end: rangeEnd })) return false;
      } catch { return false; }
      return true;
    });
  }, [rawForecasts, companyFilter, productFilter, productTypeFilter, customerTypeFilter, confidenceFilter, timeRange, strategicOnly]);

  const uniqueCompanies = useMemo(() => [...new Set(rawForecasts.map(f => f.company))].sort(), [rawForecasts]);
  const uniqueProducts = useMemo(() => [...new Set(rawForecasts.map(f => f.productName))].sort(), [rawForecasts]);
  const uniqueProductTypes = useMemo(() => [...new Set(rawForecasts.map(f => f.productType).filter(Boolean))].sort() as string[], [rawForecasts]);
  const uniqueCustomerTypes = useMemo(() => [...new Set(rawForecasts.map(f => f.customerType).filter(Boolean))].sort() as string[], [rawForecasts]);

  const upcomingOrders = filteredForecasts.length;
  const forecastVolume = filteredForecasts.reduce((s, f) => s + parseFloat(f.forecastVolume || "0"), 0);
  const highConfOrders = filteredForecasts.filter(f => f.confidence >= 75).length;
  const strategicCustomers = filteredForecasts.filter(f => f.isStrategic).length;

  const volumeByMonth = useMemo(() => {
    const map = new Map<string, number>();
    filteredForecasts.forEach(f => {
      try {
        const key = format(parseISO(f.forecastDate), "MMM yy");
        map.set(key, (map.get(key) ?? 0) + parseFloat(f.forecastVolume || "0"));
      } catch {}
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).slice(0, 12);
  }, [filteredForecasts]);

  const volumeByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    filteredForecasts.forEach(f => {
      map.set(f.company, (map.get(f.company) ?? 0) + parseFloat(f.forecastVolume || "0"));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredForecasts]);

  const volumeByType = useMemo(() => {
    const map = new Map<string, number>();
    filteredForecasts.forEach(f => {
      const k = f.productType?.replace(/_/g, " ") || "Unknown";
      map.set(k, (map.get(k) ?? 0) + parseFloat(f.forecastVolume || "0"));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredForecasts]);

  const exportCSV = () => {
    const rows = [
      ["Company", "Product Name", "Last Order Date", "Last Order Volume (KG)", "Forecast Date", "Forecast Volume (KG)", "Confidence (%)", "Status"],
      ...filteredForecasts.map(f => [f.company, f.productName, f.lastOrderDate ?? "", f.lastOrderVolume ?? "", f.forecastDate, f.forecastVolume ?? "", f.confidence, f.status]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `forecast_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(filteredForecasts.map(f => ({
      "Company": f.company,
      "Product Name": f.productName,
      "Last Order Date": f.lastOrderDate ?? "",
      "Last Order Volume (KG)": f.lastOrderVolume ?? "",
      "Forecast Date": f.forecastDate,
      "Forecast Volume (KG)": f.forecastVolume ?? "",
      "Confidence (%)": f.confidence,
      "Status": f.status,
      "Strategic": f.isStrategic ? "Yes" : "No",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Forecast");
    XLSX.writeFile(wb, `forecast_export_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const FilterSelect = ({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors">
      <option value="all">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
    </select>
  );

  return (
    <div className="space-y-6">
      {/* ── Row 1: Existing KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={TrendingUp} label="Active Accounts" value={activeAcc.length.toString()} sub="generating revenue" color="bg-primary" />
        <StatCard icon={DollarSign} label="Monthly Revenue (USD)" value={`$${(totalMonthlyRevenue / 1000).toFixed(1)}k`} sub={fmtNGN(totalMonthlyRevenue)} color="bg-emerald-600" />
        <StatCard icon={Package} label="Total Volume" value={`${(totalVolume / 1000).toFixed(1)}t`} sub="kg/month across accounts" color="bg-blue-600" />
      </div>

      {/* ── Row 2: New Forecast Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label={`Upcoming Orders (${timeRange}d)`} value={upcomingOrders.toString()} sub="filtered forecast entries" color="bg-violet-600" />
        <StatCard icon={Package} label="Forecast Volume (KG)" value={`${forecastVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`} sub="total filtered volume" color="bg-cyan-600" />
        <StatCard icon={CheckCircle} label="High Confidence Orders" value={highConfOrders.toString()} sub="≥75% confidence" color="bg-emerald-600" />
        <StatCard icon={Star} label="Strategic Customers" value={strategicCustomers.toString()} sub="existing customers" color="bg-amber-600" />
      </div>

      {/* ── Filters + Export/Notify ── */}
      <div className="glass-card rounded-2xl p-4 border border-white/5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
            <Filter className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Filters</span>
          </div>
          <FilterSelect value={companyFilter} onChange={setCompanyFilter} options={uniqueCompanies} placeholder="All Companies" />
          <FilterSelect value={productFilter} onChange={setProductFilter} options={uniqueProducts} placeholder="All Products" />
          <FilterSelect value={productTypeFilter} onChange={setProductTypeFilter} options={uniqueProductTypes} placeholder="All Product Types" />
          <FilterSelect value={customerTypeFilter} onChange={setCustomerTypeFilter} options={uniqueCustomerTypes} placeholder="All Customer Types" />
          <select value={confidenceFilter} onChange={e => setConfidenceFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors">
            <option value="all">All Confidence</option>
            <option value="high">High (≥75%)</option>
            <option value="medium">Medium (50–74%)</option>
            <option value="low">Low (&lt;50%)</option>
          </select>
          <select value={timeRange} onChange={e => setTimeRange(Number(e.target.value) as 7 | 30 | 90)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors">
            <option value={7}>Next 7 Days</option>
            <option value={30}>Next 30 Days</option>
            <option value={90}>Next 90 Days</option>
          </select>
          <label className="flex items-center gap-2 cursor-pointer ml-1">
            <div onClick={() => setStrategicOnly(v => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors ${strategicOnly ? "bg-primary" : "bg-white/10"}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${strategicOnly ? "left-4" : "left-0.5"}`} />
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400" /> Strategic Only
            </span>
          </label>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative" ref={exportMenuRef}>
              <button onClick={() => setShowExportMenu(v => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/20 text-emerald-400 text-sm font-medium transition-colors">
                <Download className="w-4 h-4" />
                Export Forecast
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-[#1e1e2e] border border-white/10 rounded-xl shadow-xl py-1 min-w-[150px]">
                  <button onClick={() => { exportCSV(); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-white/5 text-left">
                    <Download className="w-3.5 h-3.5 text-muted-foreground" /> Export as CSV
                  </button>
                  <button onClick={() => { exportXLSX(); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-white/5 text-left">
                    <Download className="w-3.5 h-3.5 text-muted-foreground" /> Export as XLSX
                  </button>
                </div>
              )}
            </div>
            <button onClick={() => setShowNotify(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/20 text-primary text-sm font-medium transition-colors">
              <Bell className="w-4 h-4" />
              Notify Procurement
            </button>
          </div>
        </div>
      </div>

      {/* ── Forecast Table ── */}
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">Forecast Table</h3>
          <span className="text-xs text-muted-foreground bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
            {filteredForecasts.length} entries
          </span>
        </div>
        {loadingForecasts || seeding ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
            <Clock className="w-4 h-4 animate-spin" />
            {seeding ? "Auto-generating forecasts from accounts…" : "Loading forecasts…"}
          </div>
        ) : filteredForecasts.length === 0 ? (
          <div className="text-center py-16">
            <AlertTriangle className="w-8 h-8 mx-auto text-muted-foreground opacity-30 mb-3" />
            <p className="text-muted-foreground text-sm">No forecasts match the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {["Company", "Product Name", "Last Order Date", "Last Order Vol (KG)", "Forecast Date", "Forecast Vol (KG)", "Confidence", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {filteredForecasts.map(f => (
                  <tr key={f.id} className={`border-l-2 transition-colors hover:bg-white/3 ${getRowColor(f.confidence)}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {f.isStrategic && <Star className="w-3 h-3 text-amber-400 shrink-0" />}
                        <span className="text-sm font-medium text-foreground">{f.company}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{f.productName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{f.lastOrderDate ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {f.lastOrderVolume ? Number(f.lastOrderVolume).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground font-medium">{f.forecastDate}</td>
                    <td className="px-4 py-3 text-sm text-foreground font-medium">
                      {f.forecastVolume ? Number(f.forecastVolume).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className={`h-full rounded-full ${f.confidence >= 75 ? "bg-emerald-500" : f.confidence >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${f.confidence}%` }} />
                        </div>
                        <span className={`text-xs font-bold ${getConfidenceColor(f.confidence)}`}>
                          {f.confidence}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={f.status}
                        onChange={(s) => updateMutation.mutate({ id: f.id, data: { status: s } })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Charts Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartPanel
          title="Forecast Volume by Month"
          data={volumeByMonth}
          views={["bar", "donut", "pie"]}
          defaultView="bar"
        />
        <ChartPanel
          title="Forecast by Customer"
          data={volumeByCustomer}
          views={["pie", "bar"]}
          defaultView="pie"
        />
        <ChartPanel
          title="Forecast by Product Type"
          data={volumeByType}
          views={["donut", "pie", "bar"]}
          defaultView="donut"
        />
      </div>

      {/* ── Calendar Forecast ── */}
      <div className="relative">
        <ForecastCalendar forecasts={filteredForecasts} filters={{}} />
      </div>

      {showNotify && <NotifyModal onClose={() => setShowNotify(false)} users={users} />}
    </div>
  );
}
