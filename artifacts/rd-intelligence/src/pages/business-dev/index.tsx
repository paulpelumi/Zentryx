import { useState } from "react";
import { useListUsers } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Calendar, Trash2, Briefcase, Edit3, X, Check } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const BASE = import.meta.env.BASE_URL;
const STAGES = ["testing", "reformulation", "innovation", "cost_optimization", "modification"];
const STATUSES = ["approved", "awaiting_feedback", "on_hold", "in_progress", "new_inventory", "cancelled", "pushed_to_live"];
const PRODUCT_TYPES = ["Seasoning", "Snack Dusting", "Bread & Dough Premix", "Dairy Premix", "Functional Blend", "Pasta Sauce", "Sweet Flavour", "Savoury Flavour"];

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-500/10 text-green-400 border-green-500/20",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  awaiting_feedback: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  on_hold: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  new_inventory: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  pushed_to_live: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

function useBusinessDev() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("rd_token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const load = () => {
    fetch(`${BASE}api/business-dev`, { headers }).then(r => r.json()).then(setItems).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async (data: any) => {
    const res = await fetch(`${BASE}api/business-dev`, { method: "POST", headers, body: JSON.stringify(data) });
    const item = await res.json();
    setItems(prev => [...prev, item]);
    return item;
  };

  const update = async (id: number, data: any) => {
    const res = await fetch(`${BASE}api/business-dev/${id}`, { method: "PUT", headers, body: JSON.stringify(data) });
    const item = await res.json();
    setItems(prev => prev.map(x => x.id === id ? item : x));
    return item;
  };

  const remove = async (id: number) => {
    await fetch(`${BASE}api/business-dev/${id}`, { method: "DELETE", headers });
    setItems(prev => prev.filter(x => x.id !== id));
  };

  return { items, loading, create, update, remove };
}

export default function BusinessDev() {
  const { items, loading, create, update, remove } = useBusinessDev();
  const { data: users } = useListUsers();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const { toast } = useToast();

  const filtered = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Permanently delete "${name}"?`)) return;
    await remove(id);
    toast({ title: "Deleted", description: `"${name}" removed.` });
  };

  const startEdit = (item: any) => { setEditingId(item.id); setEditTitle(item.name); };
  const saveTitle = async (id: number) => {
    if (!editTitle.trim()) return;
    await update(id, { name: editTitle });
    setEditingId(null);
    toast({ title: "Updated" });
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-primary" /> Business Development
          </h1>
          <p className="text-muted-foreground mt-1">Track and manage BD opportunities and customer pipelines.</p>
        </div>
        <CreateBDModal users={users || []} onCreate={create} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search BD items..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${statusFilter === "all" ? "bg-primary text-white border-primary" : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
            All
          </button>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s === statusFilter ? "all" : s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${statusFilter === s ? "bg-primary text-white border-primary" : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(item => (
          <div key={item.id} className="glass-card rounded-2xl p-6 flex flex-col relative group">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-medium capitalize text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md">
                {item.stage?.replace(/_/g, ' ')}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[item.status] || "bg-white/5 text-muted-foreground border-white/10"}`}>
                {item.status?.replace(/_/g, ' ')}
              </span>
            </div>

            {editingId === item.id ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveTitle(item.id); if (e.key === "Escape") setEditingId(null); }}
                  className="text-base font-bold bg-transparent border-b border-primary focus:outline-none text-foreground flex-1"
                  autoFocus
                />
                <button onClick={() => saveTitle(item.id)} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingId(null)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-start gap-1.5 group/title mb-2">
                <h3 className="text-lg font-bold font-display text-foreground line-clamp-1 flex-1">{item.name}</h3>
                <button onClick={() => startEdit(item)} className="opacity-0 group-hover/title:opacity-100 p-0.5 text-muted-foreground hover:text-foreground transition-opacity shrink-0">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {item.productType && <p className="text-xs text-muted-foreground mb-1">📦 {item.productType}</p>}
            {item.customerName && <p className="text-xs text-muted-foreground mb-1">👤 {item.customerName}</p>}
            {item.customerEmail && <p className="text-xs text-muted-foreground mb-1">✉ {item.customerEmail}</p>}
            {item.customerPhone && <p className="text-xs text-muted-foreground mb-3">📞 {item.customerPhone}</p>}

            {item.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{item.description}</p>}

            {item.assignees?.length > 0 && (
              <div className="flex items-center gap-1 mb-3">
                {item.assignees.slice(0, 4).map((a: any) => (
                  <div key={a.id} className="w-6 h-6 rounded-full bg-gradient-to-tr from-secondary/50 to-primary/50 border border-white/20 flex items-center justify-center text-white text-[10px] font-bold" title={a.name}>
                    {a.name.charAt(0)}
                  </div>
                ))}
                {item.assignees.length > 4 && (
                  <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs text-muted-foreground">+{item.assignees.length - 4}</div>
                )}
              </div>
            )}

            <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground">
              {item.targetDate ? (
                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Due: {format(new Date(item.targetDate), "MMM d, yyyy")}</div>
              ) : <span />}
              {item.costTarget && <span className="text-green-400 font-medium">R{parseFloat(item.costTarget).toLocaleString()}</span>}
            </div>

            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
              <BDStatusEditor item={item} onUpdate={update} />
              <button onClick={() => handleDelete(item.id, item.name)}
                className="p-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-all" title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 glass-card rounded-2xl">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium text-foreground">No BD items found</h3>
          <p className="text-muted-foreground text-sm">Create a new business development opportunity to get started.</p>
        </div>
      )}
    </div>
  );
}

function BDStatusEditor({ item, onUpdate }: { item: any; onUpdate: (id: number, data: any) => void }) {
  return (
    <select
      value={item.status}
      onChange={e => onUpdate(item.id, { status: e.target.value })}
      className="h-7 rounded-lg border border-white/10 bg-black/50 px-1.5 py-0.5 text-xs focus:outline-none text-muted-foreground"
      onClick={e => e.stopPropagation()}
    >
      {STATUSES.map(s => <option key={s} value={s} className="bg-card capitalize">{s.replace(/_/g, ' ')}</option>)}
    </select>
  );
}

function CreateBDModal({ users, onCreate }: { users: any[]; onCreate: (data: any) => Promise<any> }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "", description: "", stage: "innovation", status: "in_progress",
    productType: "", customerName: "", customerEmail: "", customerPhone: "",
    startDate: "", targetDate: "", costTarget: "", assigneeIds: [] as number[],
  });
  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const toggleAssignee = (id: number) => setForm(f => ({ ...f, assigneeIds: f.assigneeIds.includes(id) ? f.assigneeIds.filter(x => x !== id) : [...f.assigneeIds, id] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreate({
        name: form.name, description: form.description, stage: form.stage, status: form.status,
        productType: form.productType || undefined, customerName: form.customerName || undefined,
        customerEmail: form.customerEmail || undefined, customerPhone: form.customerPhone || undefined,
        startDate: form.startDate || undefined, targetDate: form.targetDate || undefined,
        costTarget: form.costTarget || undefined, assigneeIds: form.assigneeIds,
      });
      toast({ title: "BD item created!", description: form.name });
      setOpen(false);
      setForm({ name: "", description: "", stage: "innovation", status: "in_progress", productType: "", customerName: "", customerEmail: "", customerPhone: "", startDate: "", targetDate: "", costTarget: "", assigneeIds: [] });
    } catch { toast({ title: "Error", description: "Failed to create", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const cls = "flex h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> New BD Item</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px] glass-panel border-white/10 bg-card/95 max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-xl font-display">New Business Development</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Title *</label>
              <input required value={form.name} onChange={e => setF("name", e.target.value)} placeholder="e.g. New Seasoning Launch for Client X" className={cls} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <textarea value={form.description} onChange={e => setF("description", e.target.value)} placeholder="BD opportunity details..." className="flex min-h-[60px] w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Stage</label>
              <select value={form.stage} onChange={e => setF("stage", e.target.value)} className={cls}>
                {STAGES.map(s => <option key={s} value={s} className="bg-card capitalize">{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <select value={form.status} onChange={e => setF("status", e.target.value)} className={cls}>
                {STATUSES.map(s => <option key={s} value={s} className="bg-card capitalize">{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Product Type</label>
              <select value={form.productType} onChange={e => setF("productType", e.target.value)} className={cls}>
                <option value="" className="bg-card">Select product type...</option>
                {PRODUCT_TYPES.map(p => <option key={p} value={p} className="bg-card">{p}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-white/10">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Customer Information</p>
            </div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Customer Name</label><input value={form.customerName} onChange={e => setF("customerName", e.target.value)} placeholder="Customer name" className={cls} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Customer Email</label><input type="email" value={form.customerEmail} onChange={e => setF("customerEmail", e.target.value)} placeholder="customer@email.com" className={cls} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Customer Phone</label><input value={form.customerPhone} onChange={e => setF("customerPhone", e.target.value)} placeholder="+27 xx xxx xxxx" className={cls} /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">Cost Target (R)</label><input type="number" value={form.costTarget} onChange={e => setF("costTarget", e.target.value)} placeholder="0.00" className={cls} /></div>
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
          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create BD Item"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
