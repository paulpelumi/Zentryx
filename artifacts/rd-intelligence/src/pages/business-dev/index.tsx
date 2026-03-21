import { useState, useEffect } from "react";
import { useListUsers } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Calendar, Trash2, Briefcase, Edit3, X, Check, Download } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL;
const STAGES = ["testing", "reformulation", "innovation", "cost_optimization", "modification"] as const;
const STATUSES = ["approved", "awaiting_feedback", "on_hold", "in_progress", "new_inventory", "cancelled", "pushed_to_live"] as const;
const PRODUCT_TYPES = ["Seasoning", "Snack Dusting", "Bread & Dough Premix", "Dairy Premix", "Functional Blend", "Pasta Sauce", "Sweet Flavour", "Savoury Flavour"] as const;
const PRIORITIES = ["low", "medium", "high", "critical"] as const;

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-500/10 text-green-400 border-green-500/20",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  awaiting_feedback: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  on_hold: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  new_inventory: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  pushed_to_live: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const STAGE_COLORS: Record<string, string> = {
  testing: "text-cyan-400 bg-cyan-500/10",
  reformulation: "text-amber-400 bg-amber-500/10",
  innovation: "text-violet-400 bg-violet-500/10",
  cost_optimization: "text-green-400 bg-green-500/10",
  modification: "text-rose-400 bg-rose-500/10",
};

const token = () => localStorage.getItem("rd_token");
const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

function useBDItems() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}api/business-dev`, { headers: authHeaders() });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (body: any) => {
    const res = await fetch(`${BASE}api/business-dev`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(await res.text());
    const item = await res.json();
    setItems(prev => [item, ...prev]);
    return item;
  };

  const update = async (id: number, body: any) => {
    const res = await fetch(`${BASE}api/business-dev/${id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(await res.text());
    const item = await res.json();
    setItems(prev => prev.map(x => x.id === id ? item : x));
    return item;
  };

  const remove = async (id: number) => {
    await fetch(`${BASE}api/business-dev/${id}`, { method: "DELETE", headers: authHeaders() });
    setItems(prev => prev.filter(x => x.id !== id));
  };

  return { items, loading, error, create, update, remove, reload: load };
}

export default function BusinessDev() {
  const { items, loading, error, create, update, remove } = useBDItems();
  const { data: users } = useListUsers();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const { toast } = useToast();

  const filtered = items.filter(item => {
    const matchSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productType?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Permanently delete "${name}"?`)) return;
    await remove(id);
    toast({ title: "Deleted", description: `"${name}" removed.` });
  };

  const handleExport = () => {
    const headers = ["ID","Title","Stage","Status","Product Type","Customer Name","Customer Email","Customer Phone","Cost Target","Start Date","Due Date","Assignees"];
    const rows = items.map(i => [
      i.id, i.name, i.stage, i.status, i.productType || "", i.customerName || "",
      i.customerEmail || "", i.customerPhone || "", i.costTarget || "",
      i.startDate ? format(new Date(i.startDate), "yyyy-MM-dd") : "",
      i.targetDate ? format(new Date(i.targetDate), "yyyy-MM-dd") : "",
      (i.assignees || []).map((a: any) => a.name).join("; "),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `bd-items-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${items.length} BD items exported.` });
  };

  if (loading) return <PageLoader />;
  if (error) return (
    <div className="glass-card rounded-2xl p-8 text-center">
      <p className="text-destructive">{error}</p>
      <Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-primary" /> Business Development
          </h1>
          <p className="text-muted-foreground mt-1">Track and manage BD opportunities and customer pipelines.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2"><Download className="w-4 h-4" /> Export</Button>
          <CreateBDModal users={users || []} onCreate={create} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search BD items..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", ...STATUSES].map(s => (
            <button key={s} onClick={() => setStatusFilter(s === statusFilter && s !== "all" ? "all" : s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${statusFilter === s ? "bg-primary text-white border-primary" : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
              {s === "all" ? "All" : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(item => (
          <BDCard key={item.id} item={item} onUpdate={update} onDelete={handleDelete} onEdit={setEditingCard} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 glass-card rounded-2xl">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium text-foreground">No BD items found</h3>
          <p className="text-muted-foreground text-sm mt-1">Create a new opportunity or adjust your filters.</p>
        </div>
      )}

      {editingCard && (
        <EditBDModal item={editingCard} users={users || []} onUpdate={update} onClose={() => setEditingCard(null)} />
      )}
    </div>
  );
}

function BDCard({ item, onUpdate, onDelete, onEdit }: { item: any; onUpdate: any; onDelete: any; onEdit: any }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(item.name);

  const saveTitle = async () => {
    if (!titleVal.trim()) return;
    await onUpdate(item.id, { name: titleVal });
    setEditingTitle(false);
  };

  const cls = "h-8 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground";

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col relative group">
      <div className="flex justify-between items-start mb-3">
        <select value={item.stage} onChange={e => onUpdate(item.id, { stage: e.target.value })} className={`${cls} text-xs capitalize`} onClick={e => e.stopPropagation()}>
          {STAGES.map(s => <option key={s} value={s} className="bg-card capitalize">{s.replace(/_/g,' ')}</option>)}
        </select>
        <select value={item.status} onChange={e => onUpdate(item.id, { status: e.target.value })} className={`${cls} capitalize`} onClick={e => e.stopPropagation()}>
          {STATUSES.map(s => <option key={s} value={s} className="bg-card capitalize">{s.replace(/_/g,' ')}</option>)}
        </select>
      </div>

      {editingTitle ? (
        <div className="flex items-center gap-2 mb-2">
          <input value={titleVal} onChange={e => setTitleVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setEditingTitle(false); setTitleVal(item.name); } }}
            className="text-base font-bold bg-transparent border-b border-primary focus:outline-none text-foreground flex-1" autoFocus />
          <button onClick={saveTitle} className="text-green-400"><Check className="w-4 h-4" /></button>
          <button onClick={() => { setEditingTitle(false); setTitleVal(item.name); }} className="text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <div className="flex items-start gap-1.5 group/title mb-2">
          <h3 className="text-lg font-bold font-display text-foreground line-clamp-1 flex-1">{item.name}</h3>
          <button onClick={() => setEditingTitle(true)} className="opacity-0 group-hover/title:opacity-100 p-0.5 text-muted-foreground hover:text-foreground shrink-0">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {item.productType && <p className="text-xs text-muted-foreground mb-1">📦 {item.productType}</p>}
      {item.customerName && <p className="text-xs text-muted-foreground mb-1">👤 {item.customerName}</p>}
      {item.customerEmail && <p className="text-xs text-muted-foreground mb-1">✉ {item.customerEmail}</p>}
      {item.customerPhone && <p className="text-xs text-muted-foreground mb-2">📞 {item.customerPhone}</p>}
      {item.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">{item.description}</p>}

      {item.assignees?.length > 0 && (
        <div className="flex items-center gap-1 mb-3">
          {item.assignees.slice(0, 4).map((a: any) => (
            <div key={a.id} title={a.name} className="w-6 h-6 rounded-full bg-gradient-to-tr from-secondary/50 to-primary/50 border border-white/20 flex items-center justify-center text-white text-[10px] font-bold">
              {a.name.charAt(0)}
            </div>
          ))}
          {item.assignees.length > 4 && <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs text-muted-foreground">+{item.assignees.length - 4}</div>}
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          <input type="date"
            value={item.targetDate ? format(new Date(item.targetDate), "yyyy-MM-dd") : ""}
            onChange={e => onUpdate(item.id, { targetDate: e.target.value || null })}
            className="bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/50 rounded cursor-pointer text-muted-foreground text-xs w-32"
            title="Set due date" />
        </div>
        {item.costTarget && <span className="text-green-400 font-medium">R{parseFloat(item.costTarget).toLocaleString()}</span>}
      </div>

      <div className="absolute top-3 right-12 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
        <button onClick={() => onEdit(item)} className="p-1.5 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground rounded-lg" title="Edit all details">
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
        <button onClick={() => onDelete(item.id, item.name)} className="p-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg" title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function EditBDModal({ item, users, onUpdate, onClose }: { item: any; users: any[]; onUpdate: any; onClose: () => void }) {
  const [form, setForm] = useState({
    name: item.name || "",
    description: item.description || "",
    stage: item.stage || "innovation",
    status: item.status || "in_progress",
    priority: item.priority || "medium",
    productType: item.productType || "",
    customerName: item.customerName || "",
    customerEmail: item.customerEmail || "",
    customerPhone: item.customerPhone || "",
    costTarget: item.costTarget || "",
    startDate: item.startDate ? format(new Date(item.startDate), "yyyy-MM-dd") : "",
    targetDate: item.targetDate ? format(new Date(item.targetDate), "yyyy-MM-dd") : "",
    assigneeIds: (item.assignees || []).map((a: any) => a.id) as number[],
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const toggleAssignee = (id: number) => setForm(f => ({ ...f, assigneeIds: f.assigneeIds.includes(id) ? f.assigneeIds.filter(x => x !== id) : [...f.assigneeIds, id] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(item.id, { ...form, costTarget: form.costTarget || undefined, startDate: form.startDate || null, targetDate: form.targetDate || null });
      toast({ title: "Saved!" });
      onClose();
    } catch { toast({ title: "Error saving", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const cls = "flex h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px] glass-panel border-white/10 bg-card/95 max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-xl font-display">Edit BD Item — {item.name}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5"><label className="text-sm font-medium">Title *</label><input value={form.name} onChange={e => setF("name", e.target.value)} className={cls} /></div>
            <div className="sm:col-span-2 space-y-1.5"><label className="text-sm font-medium">Description</label><textarea value={form.description} onChange={e => setF("description", e.target.value)} className="flex min-h-[60px] w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Stage</label><select value={form.stage} onChange={e => setF("stage", e.target.value)} className={cls}>{STAGES.map(s => <option key={s} value={s} className="bg-card capitalize">{s.replace(/_/g,' ')}</option>)}</select></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Status</label><select value={form.status} onChange={e => setF("status", e.target.value)} className={cls}>{STATUSES.map(s => <option key={s} value={s} className="bg-card capitalize">{s.replace(/_/g,' ')}</option>)}</select></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Priority</label><select value={form.priority} onChange={e => setF("priority", e.target.value)} className={cls}>{PRIORITIES.map(p => <option key={p} value={p} className="bg-card capitalize">{p}</option>)}</select></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Product Type</label><select value={form.productType} onChange={e => setF("productType", e.target.value)} className={cls}><option value="" className="bg-card">Select...</option>{PRODUCT_TYPES.map(p => <option key={p} value={p} className="bg-card">{p}</option>)}</select></div>
            <div className="sm:col-span-2 border-t border-white/10 pt-2"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Customer</p></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Name</label><input value={form.customerName} onChange={e => setF("customerName", e.target.value)} className={cls} placeholder="Customer name" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Email</label><input type="email" value={form.customerEmail} onChange={e => setF("customerEmail", e.target.value)} className={cls} placeholder="email@example.com" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Phone</label><input value={form.customerPhone} onChange={e => setF("customerPhone", e.target.value)} className={cls} placeholder="+27 xx xxx xxxx" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Cost Target (R)</label><input type="number" value={form.costTarget} onChange={e => setF("costTarget", e.target.value)} className={cls} placeholder="0.00" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Start Date</label><input type="date" value={form.startDate} onChange={e => setF("startDate", e.target.value)} className={cls} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Due Date</label><input type="date" value={form.targetDate} onChange={e => setF("targetDate", e.target.value)} className={cls} /></div>
          </div>
          {users.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignees</label>
              <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-white/10 bg-black/10 max-h-28 overflow-y-auto">
                {users.map(u => (
                  <button key={u.id} type="button" onClick={() => toggleAssignee(u.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${form.assigneeIds.includes(u.id) ? "bg-primary text-white border-primary" : "border-white/10 text-muted-foreground hover:text-foreground"}`}>
                    <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px]">{u.name.charAt(0)}</span>
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateBDModal({ users, onCreate }: { users: any[]; onCreate: (data: any) => Promise<any> }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const emptyForm = { name: "", description: "", stage: "innovation", status: "in_progress", priority: "medium", productType: "", customerName: "", customerEmail: "", customerPhone: "", startDate: "", targetDate: "", costTarget: "", assigneeIds: [] as number[] };
  const [form, setForm] = useState(emptyForm);
  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const toggleAssignee = (id: number) => setForm(f => ({ ...f, assigneeIds: f.assigneeIds.includes(id) ? f.assigneeIds.filter(x => x !== id) : [...f.assigneeIds, id] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await onCreate({ ...form, productType: form.productType || undefined, customerName: form.customerName || undefined, customerEmail: form.customerEmail || undefined, customerPhone: form.customerPhone || undefined, costTarget: form.costTarget || undefined, startDate: form.startDate || null, targetDate: form.targetDate || null });
      toast({ title: "BD item created!", description: form.name });
      setOpen(false);
      setForm(emptyForm);
    } catch { toast({ title: "Error", description: "Failed to create", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const cls = "flex h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> New BD Item</Button></DialogTrigger>
      <DialogContent className="sm:max-w-[620px] glass-panel border-white/10 bg-card/95 max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-xl font-display">New Business Development</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5"><label className="text-sm font-medium">Title *</label><input required value={form.name} onChange={e => setF("name", e.target.value)} placeholder="e.g. Seasoning Launch for Client X" className={cls} /></div>
            <div className="sm:col-span-2 space-y-1.5"><label className="text-sm font-medium">Description</label><textarea value={form.description} onChange={e => setF("description", e.target.value)} placeholder="BD opportunity details..." className="flex min-h-[60px] w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Stage</label><select value={form.stage} onChange={e => setF("stage", e.target.value)} className={cls}>{STAGES.map(s => <option key={s} value={s} className="bg-card capitalize">{s.replace(/_/g,' ')}</option>)}</select></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Status</label><select value={form.status} onChange={e => setF("status", e.target.value)} className={cls}>{STATUSES.map(s => <option key={s} value={s} className="bg-card capitalize">{s.replace(/_/g,' ')}</option>)}</select></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Priority</label><select value={form.priority} onChange={e => setF("priority", e.target.value)} className={cls}>{PRIORITIES.map(p => <option key={p} value={p} className="bg-card capitalize">{p}</option>)}</select></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Product Type</label><select value={form.productType} onChange={e => setF("productType", e.target.value)} className={cls}><option value="" className="bg-card">Select type...</option>{PRODUCT_TYPES.map(p => <option key={p} value={p} className="bg-card">{p}</option>)}</select></div>
            <div className="sm:col-span-2 border-t border-white/10 pt-2"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Customer Info</p></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Customer Name</label><input value={form.customerName} onChange={e => setF("customerName", e.target.value)} className={cls} placeholder="Customer / Client name" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Customer Email</label><input type="email" value={form.customerEmail} onChange={e => setF("customerEmail", e.target.value)} className={cls} placeholder="customer@email.com" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Customer Phone</label><input value={form.customerPhone} onChange={e => setF("customerPhone", e.target.value)} className={cls} placeholder="+27 xx xxx xxxx" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Cost Target (R)</label><input type="number" value={form.costTarget} onChange={e => setF("costTarget", e.target.value)} className={cls} placeholder="0.00" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Start Date</label><input type="date" value={form.startDate} onChange={e => setF("startDate", e.target.value)} className={cls} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Due Date</label><input type="date" value={form.targetDate} onChange={e => setF("targetDate", e.target.value)} className={cls} /></div>
          </div>
          {users.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignees</label>
              <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-white/10 bg-black/10 max-h-28 overflow-y-auto">
                {users.map(u => (
                  <button key={u.id} type="button" onClick={() => toggleAssignee(u.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${form.assigneeIds.includes(u.id) ? "bg-primary text-white border-primary" : "border-white/10 text-muted-foreground hover:text-foreground"}`}>
                    <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px]">{u.name.charAt(0)}</span>
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="pt-2 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create BD Item"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
