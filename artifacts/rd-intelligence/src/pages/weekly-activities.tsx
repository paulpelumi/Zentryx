import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Bell, Check,
  Loader2, ChevronDown, Users, X, Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

const BASE = import.meta.env.BASE_URL;

const MONTHS_LONG = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const PRODUCT_TYPES = [
  { value: "seasoning", label: "Seasoning" },
  { value: "dairy_premix", label: "Dairy Premix" },
  { value: "dough_and_bread_premix", label: "Dough & Bread Premix" },
  { value: "snack_dusting", label: "Snack Dusting" },
  { value: "functional_blend", label: "Functional Blend" },
  { value: "sweet_flavors", label: "Sweet Flavors" },
  { value: "savoury_flavours", label: "Savoury Flavours" },
];

const STATUS_OPTS = [
  { value: "not_started", label: "Not Started", cls: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
  { value: "ongoing", label: "Ongoing", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { value: "completed", label: "Completed", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
];

const PRIORITY_OPTS = [
  { value: "low", label: "Low", cls: "text-blue-400 bg-blue-500/10" },
  { value: "medium", label: "Medium", cls: "text-amber-400 bg-amber-500/10" },
  { value: "high", label: "High", cls: "text-red-400 bg-red-500/10" },
];

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("rd_token")}`, "Content-Type": "application/json" };
}

function initials(name: string) {
  return name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function avatarColor(name: string) {
  const c = ["from-violet-500 to-purple-600","from-blue-500 to-cyan-600","from-emerald-500 to-teal-600",
              "from-rose-500 to-pink-600","from-amber-500 to-orange-600","from-indigo-500 to-blue-600"];
  return c[name ? name.charCodeAt(0) % c.length : 0];
}

function MiniAvatar({ name, size = "sm" }: { name?: string; size?: "sm" | "xs" }) {
  const n = name || "?";
  const sz = size === "xs" ? "w-5 h-5 text-[9px]" : "w-6 h-6 text-[10px]";
  return (
    <div className={cn("rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold shrink-0", sz, avatarColor(n))}>
      {initials(n)}
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const s = STATUS_OPTS.find(o => o.value === value) ?? STATUS_OPTS[0];
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border", s.cls)}>{s.label}</span>;
}

function PriorityBadge({ value }: { value: string }) {
  const p = PRIORITY_OPTS.find(o => o.value === value) ?? PRIORITY_OPTS[1];
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", p.cls)}>{p.label}</span>;
}

function ProductLabel({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted-foreground text-xs italic">—</span>;
  const pt = PRODUCT_TYPES.find(p => p.value === value);
  return <span className="text-xs font-medium">{pt?.label ?? value}</span>;
}

function NotifyModal({ onClose, users }: { onClose: () => void; users: any[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
  const toggle = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const send = async () => {
    if (!selected.length) return;
    setSending(true);
    try {
      await fetch(`${BASE}api/weekly-activities/notify`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          userIds: selected,
          title: "Weekly Activity Update",
          message: message || "You have a new weekly activity notification.",
        }),
      });
      setSent(true);
      setTimeout(onClose, 1500);
    } finally { setSending(false); }
  };

  return (
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md glass-panel rounded-2xl border border-white/10 p-6 shadow-2xl z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Notify Account Manager
            </h3>
            <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative mb-3">
            <input type="text" placeholder="Search staff…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>

          <div className="space-y-1 max-h-52 overflow-y-auto custom-scrollbar mb-4">
            {filtered.map(u => (
              <button key={u.id} onClick={() => toggle(u.id)}
                className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all",
                  selected.includes(u.id) ? "bg-primary/15 border border-primary/30" : "hover:bg-white/5 border border-transparent"
                )}>
                <MiniAvatar name={u.name} />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">{u.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{u.role?.replace(/_/g, " ")}</p>
                </div>
                {selected.includes(u.id) && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>

          <textarea
            placeholder="Optional message…"
            rows={2}
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none mb-4"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{selected.length} selected</span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button onClick={send} disabled={!selected.length || sending || sent}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50">
                {sent ? <><Check className="w-3.5 h-3.5" /> Sent!</>
                  : sending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                  : <><Send className="w-3.5 h-3.5" /> Send Notification</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function InlineSelect({
  value, options, onChange, className,
}: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; className?: string }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn(
        "bg-transparent border-0 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-lg px-1 py-0.5 cursor-pointer w-full",
        "appearance-none", className
      )}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

interface ActivityRow {
  id: number;
  weeklyReportId: number;
  assignedUserId: number | null;
  assignedUser: { id: number; name: string; email: string; avatar?: string } | null;
  projectTitle: string;
  productType: string | null;
  status: string;
  priority: string;
  remarks: string;
  createdAt: string;
}

interface Week {
  id: number;
  month: number;
  year: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  label: string;
  samplesSent: string;
}

export default function WeeklyActivities() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [showNotify, setShowNotify] = useState(false);
  const [draftSamples, setDraftSamples] = useState("");
  const [sampleSaved, setSampleSaved] = useState(false);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [addingRow, setAddingRow] = useState(false);
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const { theme } = useTheme();
  const isLight = theme === "light";
  const qc = useQueryClient();

  const { data: usersData } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const r = await fetch(`${BASE}api/users`, { headers: authHeaders() });
      return r.json();
    },
  });

  const { data: meData } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const r = await fetch(`${BASE}api/auth/me`, { headers: authHeaders() });
      return r.json();
    },
  });

  const users: any[] = usersData ?? [];
  const me = meData;

  const { data: weeks = [], isLoading: weeksLoading } = useQuery<Week[]>({
    queryKey: ["/api/weekly-activities/weeks", month, year],
    queryFn: async () => {
      const r = await fetch(`${BASE}api/weekly-activities/weeks?month=${month}&year=${year}`, { headers: authHeaders() });
      return r.json();
    },
  });

  useEffect(() => {
    if (!weeks.length) return;
    if (selectedWeekId && weeks.find(w => w.id === selectedWeekId)) return;
    const todayStr = new Date().toISOString().split("T")[0];
    const current = weeks.find(w => w.startDate <= todayStr && w.endDate >= todayStr);
    setSelectedWeekId((current ?? weeks[0]).id);
  }, [weeks]);

  const selectedWeek = weeks.find(w => w.id === selectedWeekId) ?? null;

  useEffect(() => {
    if (selectedWeek) setDraftSamples(selectedWeek.samplesSent ?? "");
  }, [selectedWeekId, selectedWeek?.id]);

  const { data: activitiesData, isLoading: actLoading } = useQuery<ActivityRow[]>({
    queryKey: ["/api/weekly-activities/activities", selectedWeekId],
    queryFn: async () => {
      if (!selectedWeekId) return [];
      const r = await fetch(`${BASE}api/weekly-activities/weeks/${selectedWeekId}/activities`, { headers: authHeaders() });
      return r.json();
    },
    enabled: !!selectedWeekId,
  });

  useEffect(() => {
    if (activitiesData) setRows(activitiesData);
  }, [activitiesData]);

  const updateActivity = useCallback(async (id: number, patch: Partial<ActivityRow>) => {
    const r = await fetch(`${BASE}api/weekly-activities/activities/${id}`, {
      method: "PUT", headers: authHeaders(), body: JSON.stringify(patch),
    });
    return r.json();
  }, []);

  const deleteActivity = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${BASE}api/weekly-activities/activities/${id}`, { method: "DELETE", headers: authHeaders() });
    },
    onMutate: (id) => setRows(prev => prev.filter(r => r.id !== id)),
  });

  const addActivity = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE}api/weekly-activities/weeks/${selectedWeekId}/activities`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ assignedUserId: null, projectTitle: "", productType: null, status: "not_started", priority: "medium", remarks: "" }),
      });
      return r.json();
    },
    onSuccess: (newRow) => setRows(prev => [...prev, newRow]),
    onSettled: () => setAddingRow(false),
  });

  const addActivityForUser = useMutation({
    mutationFn: async (assignedUserId: number | null) => {
      const r = await fetch(`${BASE}api/weekly-activities/weeks/${selectedWeekId}/activities`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ assignedUserId, projectTitle: "", productType: null, status: "not_started", priority: "medium", remarks: "" }),
      });
      return r.json();
    },
    onSuccess: (newRow) => setRows(prev => [...prev, newRow]),
  });

  const saveSamples = async () => {
    if (!selectedWeekId) return;
    await fetch(`${BASE}api/weekly-activities/weeks/${selectedWeekId}`, {
      method: "PUT", headers: authHeaders(), body: JSON.stringify({ samplesSent: draftSamples }),
    });
    setSampleSaved(true);
    setTimeout(() => setSampleSaved(false), 2000);
    qc.invalidateQueries({ queryKey: ["/api/weekly-activities/weeks", month, year] });
  };

  const handleFieldChange = useCallback((id: number, field: keyof ActivityRow, value: any) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    if (field === "assignedUserId") {
      const uid = value ? parseInt(value) : null;
      const user = users.find(u => u.id === uid) ?? null;
      setRows(prev => prev.map(r => r.id === id ? { ...r, assignedUserId: uid, assignedUser: user } : r));
      updateActivity(id, { assignedUserId: uid });
      return;
    }
    const isText = field === "projectTitle" || field === "remarks";
    if (isText) {
      if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
      saveTimers.current[id] = setTimeout(() => updateActivity(id, { [field]: value }), 600);
    } else {
      updateActivity(id, { [field]: value });
    }
  }, [users, updateActivity]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedWeekId(null);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedWeekId(null);
  };

  const filteredRows = useMemo(() => {
    let r = [...rows];
    if (filterUser !== "all") r = r.filter(a => String(a.assignedUserId) === filterUser);
    if (filterProduct !== "all") r = r.filter(a => a.productType === filterProduct);
    r.sort((a, b) => (a.assignedUserId ?? 0) - (b.assignedUserId ?? 0));
    return r;
  }, [rows, filterUser, filterProduct]);

  const groupedRows = useMemo(() => {
    const out: (ActivityRow & { isGroupStart: boolean })[] = [];
    let lastUserId: number | null | undefined = undefined;
    for (const r of filteredRows) {
      out.push({ ...r, isGroupStart: r.assignedUserId !== lastUserId });
      lastUserId = r.assignedUserId;
    }
    return out;
  }, [filteredRows]);

  const cellBase = cn(
    "px-0.5 py-1 text-xs border-0 bg-transparent text-foreground w-full focus:outline-none focus:ring-1 focus:ring-primary/40 rounded placeholder:text-muted-foreground/40"
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Weekly Activities Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">Track team activities and samples by working week</p>
        </div>
      </div>

      {/* Week Selector Card */}
      <div className={cn("rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4",
        isLight ? "bg-white border-slate-200" : "glass-card border-white/10")}>
        {/* Month Navigation */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={prevMonth}
            className={cn("p-2 rounded-xl transition-colors", isLight ? "hover:bg-slate-100 text-slate-600" : "hover:bg-white/10 text-muted-foreground hover:text-foreground")}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[110px] text-center">
            {MONTHS_LONG[month - 1]} {year}
          </span>
          <button onClick={nextMonth}
            className={cn("p-2 rounded-xl transition-colors", isLight ? "hover:bg-slate-100 text-slate-600" : "hover:bg-white/10 text-muted-foreground hover:text-foreground")}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className={cn("w-px h-6 shrink-0", isLight ? "bg-slate-200" : "bg-white/10")} />

        {/* Week Dropdown */}
        <div className="flex-1 min-w-0">
          {weeksLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading weeks…</div>
          ) : (
            <div className="relative">
              <select
                value={selectedWeekId ?? ""}
                onChange={e => setSelectedWeekId(parseInt(e.target.value))}
                className={cn(
                  "w-full text-sm font-medium text-foreground pl-3 pr-8 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none",
                  isLight ? "bg-slate-50 border-slate-200" : "bg-black/20 border-white/10"
                )}
              >
                {weeks.map(w => (
                  <option key={w.id} value={w.id}>{w.label}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {selectedWeek && (
          <div className={cn("text-xs shrink-0 px-3 py-1.5 rounded-xl font-medium", isLight ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary")}>
            {selectedWeek.startDate} → {selectedWeek.endDate}
          </div>
        )}
      </div>

      {/* Activities Table */}
      <div className={cn("rounded-2xl border overflow-hidden", isLight ? "bg-white border-slate-200" : "glass-card border-white/10")}>
        {/* Table Header Row */}
        <div className={cn("px-4 py-3 flex items-center justify-between gap-3 border-b flex-wrap",
          isLight ? "border-slate-100 bg-slate-50/50" : "border-white/5 bg-white/2")}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">Weekly Activities</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
              isLight ? "bg-slate-100 text-slate-600" : "bg-white/5 text-muted-foreground")}>
              {filteredRows.length} row{filteredRows.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter: User */}
            <div className="relative">
              <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
                className={cn("text-xs rounded-lg border pl-2.5 pr-7 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40",
                  isLight ? "bg-white border-slate-200 text-slate-700" : "bg-black/20 border-white/10 text-foreground")}>
                <option value="all">All Staff</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <Users className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            {/* Filter: Product Type */}
            <div className="relative">
              <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
                className={cn("text-xs rounded-lg border pl-2.5 pr-7 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40",
                  isLight ? "bg-white border-slate-200 text-slate-700" : "bg-black/20 border-white/10 text-foreground")}>
                <option value="all">All Products</option>
                {PRODUCT_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            {/* Add Activity */}
            <button
              onClick={() => { setAddingRow(true); addActivity.mutate(); }}
              disabled={!selectedWeekId || addingRow || addActivity.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {addingRow || addActivity.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Plus className="w-3.5 h-3.5" />}
              Add Activity
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={cn("text-left border-b", isLight ? "border-slate-100 bg-slate-50/30" : "border-white/5 bg-white/2")}>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap w-40">Assigned User</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Project Title</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap w-40">Product Type</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap w-32">Status</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap w-28">Priority</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">Remarks</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground w-12 text-center">Del</th>
              </tr>
            </thead>
            <tbody>
              {actLoading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading activities…
                </td></tr>
              ) : groupedRows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isLight ? "bg-slate-100" : "bg-white/5")}>
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    </div>
                    No activities yet. Click "Add Activity" to get started.
                  </div>
                </td></tr>
              ) : groupedRows.map((row) => (
                <tr key={row.id}
                  className={cn(
                    "transition-colors border-b last:border-0",
                    row.isGroupStart
                      ? isLight ? "border-slate-200 bg-slate-50/20" : "border-white/8 bg-white/1"
                      : isLight ? "border-slate-100" : "border-white/3",
                    isLight ? "hover:bg-slate-50/60" : "hover:bg-white/3"
                  )}>
                  {/* Assigned User */}
                  <td className="px-3 py-2">
                    {row.isGroupStart ? (
                      <div className="flex items-center gap-1.5">
                        <MiniAvatar name={row.assignedUser?.name} size="sm" />
                        <select
                          value={row.assignedUserId ?? ""}
                          onChange={e => handleFieldChange(row.id, "assignedUserId", e.target.value || null)}
                          className={cn("flex-1 min-w-0 text-xs bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-lg px-1 py-0.5 appearance-none text-foreground", isLight ? "" : "text-foreground")}
                        >
                          <option value="">Unassigned</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <button
                          title={`Add row for ${row.assignedUser?.name ?? "this user"}`}
                          disabled={!selectedWeekId || addActivityForUser.isPending}
                          onClick={() => addActivityForUser.mutate(row.assignedUserId)}
                          className={cn(
                            "shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                            isLight
                              ? "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                              : "bg-primary/20 text-primary hover:bg-primary hover:text-white"
                          )}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pl-1 opacity-40">
                        <div className="w-1 h-4 rounded-full bg-primary/30" />
                        <span className="text-xs text-muted-foreground">{row.assignedUser?.name ?? "—"}</span>
                      </div>
                    )}
                  </td>

                  {/* Project Title */}
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.projectTitle}
                      onChange={e => handleFieldChange(row.id, "projectTitle", e.target.value)}
                      placeholder="Project title…"
                      className={cn(cellBase, "min-w-[140px]")}
                    />
                  </td>

                  {/* Product Type */}
                  <td className="px-2 py-2">
                    <select
                      value={row.productType ?? ""}
                      onChange={e => handleFieldChange(row.id, "productType", e.target.value || null)}
                      className={cn("text-xs rounded-lg border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40 w-full appearance-none",
                        isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-black/20 border-white/10 text-foreground")}
                    >
                      <option value="">— Select —</option>
                      {PRODUCT_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </td>

                  {/* Status */}
                  <td className="px-2 py-2">
                    <select
                      value={row.status}
                      onChange={e => handleFieldChange(row.id, "status", e.target.value)}
                      className={cn("text-xs rounded-lg border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40 w-full appearance-none",
                        STATUS_OPTS.find(s => s.value === row.status)?.cls ?? "",
                        "border-current/20 bg-current/5"
                      )}
                      style={{ colorScheme: "dark" }}
                    >
                      {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>

                  {/* Priority */}
                  <td className="px-2 py-2">
                    <select
                      value={row.priority}
                      onChange={e => handleFieldChange(row.id, "priority", e.target.value)}
                      className={cn("text-xs rounded-lg border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40 w-full appearance-none",
                        isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-black/20 border-white/10 text-foreground")}
                    >
                      {PRIORITY_OPTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </td>

                  {/* Remarks */}
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.remarks ?? ""}
                      onChange={e => handleFieldChange(row.id, "remarks", e.target.value)}
                      placeholder="Remarks…"
                      className={cn(cellBase, "min-w-[120px]")}
                    />
                  </td>

                  {/* Delete */}
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => deleteActivity.mutate(row.id)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Samples Sent Section */}
      <div className={cn("rounded-2xl border", isLight ? "bg-white border-slate-200" : "glass-card border-white/10")}>
        <div className={cn("px-4 py-3 flex items-center justify-between gap-3 border-b flex-wrap",
          isLight ? "border-slate-100 bg-slate-50/30" : "border-white/5")}>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Samples Sent</h3>
            {sampleSaved && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
          <button
            onClick={() => setShowNotify(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
          >
            <Bell className="w-3.5 h-3.5" /> Notify Account Manager
          </button>
        </div>
        <div className="p-4">
          <textarea
            rows={10}
            maxLength={5000}
            placeholder="Enter samples sent details for this week… (e.g. Sample A – 200g to Client X on Mon, Sample B – 500g to Client Y on Wed)"
            value={draftSamples}
            onChange={e => setDraftSamples(e.target.value)}
            onBlur={saveSamples}
            className={cn(
              "w-full rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all",
              isLight ? "bg-slate-50 border border-slate-200" : "bg-black/20 border border-white/10"
            )}
          />
          <p className="text-xs text-muted-foreground mt-1.5">Auto-saves on focus away · Max 20 lines</p>
        </div>
      </div>

      {showNotify && <NotifyModal onClose={() => setShowNotify(false)} users={users} />}
    </div>
  );
}
