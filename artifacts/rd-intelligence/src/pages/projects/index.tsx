import { useState } from "react";
import { useListProjects, useCreateProject, useDeleteProject, useListUsers } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Calendar, CheckSquare, Trash2, Download, Filter, X } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const STAGES = ["testing", "reformulation", "innovation", "cost_optimization", "modification"] as const;
const STATUSES = ["approved", "awaiting_feedback", "on_hold", "in_progress", "new_inventory", "cancelled", "pushed_to_live"] as const;
const PRODUCT_TYPES = ["Seasoning", "Snack Dusting", "Bread & Dough Premix", "Dairy Premix", "Functional Blend", "Pasta Sauce", "Sweet Flavour", "Savoury Flavour"] as const;

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

export default function ProjectsList() {
  const [searchTerm, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "export">("list");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: projects, isLoading } = useListProjects({});
  const { data: users } = useListUsers();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteProject();
  const { toast } = useToast();

  const filteredProjects = (projects || []).filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (p.productType?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = (id: number, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        toast({ title: "Project deleted", description: `"${name}" was permanently deleted.` });
      },
    });
  };

  const handleExport = (format: "csv" | "excel") => {
    if (!projects || projects.length === 0) return;
    const headers = ["ID", "Name", "Stage", "Status", "Product Type", "Customer Name", "Customer Email", "Customer Phone", "Cost Target", "Start Date", "Due Date", "Lead", "Assignees", "Tasks", "Progress %", "Tags", "Created At"];
    const rows = projects.map(p => [
      p.id, p.name, p.stage, p.status, p.productType || "", p.customerName || "", p.customerEmail || "", p.customerPhone || "",
      p.costTarget || "", p.startDate ? format(new Date(p.startDate), "yyyy-MM-dd") : "", p.targetDate ? format(new Date(p.targetDate), "yyyy-MM-dd") : "",
      (p as any).lead?.name || "", ((p as any).assignees || []).map((a: any) => a.name).join("; "),
      p.taskCount, p.taskCount > 0 ? Math.round((p.completedTaskCount / p.taskCount) * 100) : 0,
      (p.tags || []).join("; "), format(new Date(p.createdAt), "yyyy-MM-dd"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `zentryx-projects-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: "Export complete", description: `${projects.length} projects exported.` });
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Project Portfolio</h1>
          <p className="text-muted-foreground mt-1">Manage end-to-end R&D lifecycles.</p>
        </div>
        <div className="flex items-center gap-2">
          <CreateProjectModal users={users || []} />
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-white/5 rounded-xl w-fit">
        <button onClick={() => setActiveTab("list")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "list" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>Projects</button>
        <button onClick={() => setActiveTab("export")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "export" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
          <Download className="w-4 h-4" /> Export Data
        </button>
      </div>

      {activeTab === "export" ? (
        <ExportTab projects={projects || []} onExport={handleExport} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search projects..." className="pl-9" value={searchTerm} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${statusFilter === "all" ? "bg-primary text-white border-primary" : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                All
              </button>
              {STATUSES.map(s => (
                <button key={s} onClick={() => setStatusFilter(s === statusFilter ? "all" : s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border capitalize ${statusFilter === s ? "bg-primary text-white border-primary" : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map(project => (
              <div key={project.id} className="relative group">
                <Link href={`/projects/${project.id}`} className="block">
                  <div className="glass-card h-full rounded-2xl p-6 relative overflow-hidden flex flex-col">
                    <div className={`absolute top-0 left-0 right-0 h-1 ${
                      project.priority === 'critical' ? 'bg-destructive' :
                      project.priority === 'high' ? 'bg-orange-500' : 'bg-primary'
                    }`} />

                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium capitalize ${STAGE_COLORS[project.stage] || "text-muted-foreground bg-white/5"}`}>
                        {project.stage.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[project.status] || "bg-white/5 text-muted-foreground border-white/10"}`}>
                        {project.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold font-display text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">{project.name}</h3>
                    {project.productType && <p className="text-xs text-muted-foreground mb-1">📦 {project.productType}</p>}
                    {project.customerName && <p className="text-xs text-muted-foreground mb-2">👤 {project.customerName}</p>}
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{project.description || "No description."}</p>

                    {(project as any).assignees?.length > 0 && (
                      <div className="flex items-center gap-1 mb-3">
                        {(project as any).assignees.slice(0, 3).map((a: any) => (
                          <div key={a.id} className="w-6 h-6 rounded-full bg-gradient-to-tr from-secondary/50 to-primary/50 border border-white/20 flex items-center justify-center text-white text-[10px] font-bold" title={a.name}>
                            {a.name.charAt(0)}
                          </div>
                        ))}
                        {(project as any).assignees.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs text-muted-foreground">+{(project as any).assignees.length - 3}</div>
                        )}
                      </div>
                    )}

                    <div className="space-y-1.5 mt-auto">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground flex items-center gap-1"><CheckSquare className="w-3 h-3"/> Tasks</span>
                        <span className="text-foreground">{project.completedTaskCount}/{project.taskCount}</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${project.taskCount > 0 ? (project.completedTaskCount / project.taskCount) * 100 : 0}%` }} />
                      </div>
                    </div>

                    {project.targetDate && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3 pt-3 border-t border-white/5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Due: {format(new Date(project.targetDate), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>
                </Link>
                <button
                  onClick={(e) => handleDelete(project.id, project.name, e)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-all z-10"
                  title="Delete project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-20 glass-card rounded-2xl">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium text-foreground">No projects found</h3>
              <p className="text-muted-foreground">Adjust your filters or create a new project.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ExportTab({ projects, onExport }: { projects: any[], onExport: (fmt: "csv" | "excel") => void }) {
  return (
    <div className="glass-card rounded-2xl p-8">
      <h2 className="text-xl font-display font-bold mb-2">Export Project Data</h2>
      <p className="text-muted-foreground text-sm mb-6">Export all structured project data for analysis. The export includes all project metadata, customer details, stages, statuses, assignees, and progress metrics.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold mb-3">What's Included</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {["Product metadata & type", "Customer name, email, phone", "Project stage & status", "Start date & due date", "Cost targets & financial data", "Assignee information", "Task progress metrics", "Tags & categories"].map(item => (
              <li key={item} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" />{item}</li>
            ))}
          </ul>
        </div>
        <div className="border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold mb-3">Export Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Projects:</span><span className="font-medium">{projects.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Format:</span><span className="font-medium">CSV (Excel-compatible)</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Columns:</span><span className="font-medium">17</span></div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => onExport("csv")} className="gap-2"><Download className="w-4 h-4" /> Export as CSV</Button>
        <Button onClick={() => onExport("excel")} variant="outline" className="gap-2"><Download className="w-4 h-4" /> Export as Excel (CSV)</Button>
      </div>
    </div>
  );
}

function CreateProjectModal({ users }: { users: any[] }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createMutation = useCreateProject();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", description: "", stage: "innovation" as any, status: "in_progress" as any,
    priority: "medium" as any, productType: "" as any,
    customerName: "", customerEmail: "", customerPhone: "",
    startDate: "", targetDate: "", costTarget: "",
    assigneeIds: [] as number[],
  });

  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const toggleAssignee = (id: number) => {
    setForm(f => ({
      ...f,
      assigneeIds: f.assigneeIds.includes(id) ? f.assigneeIds.filter(x => x !== id) : [...f.assigneeIds, id],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      data: {
        name: form.name, description: form.description,
        stage: form.stage, status: form.status, priority: form.priority,
        productType: form.productType || undefined,
        customerName: form.customerName || undefined, customerEmail: form.customerEmail || undefined,
        customerPhone: form.customerPhone || undefined,
        costTarget: form.costTarget || undefined,
        startDate: form.startDate || undefined, targetDate: form.targetDate || undefined,
        assigneeIds: form.assigneeIds,
      } as any
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        setOpen(false);
        toast({ title: "Project created!", description: form.name });
        setForm({ name: "", description: "", stage: "innovation", status: "in_progress", priority: "medium", productType: "", customerName: "", customerEmail: "", customerPhone: "", startDate: "", targetDate: "", costTarget: "", assigneeIds: [] });
      },
      onError: () => toast({ title: "Error", description: "Failed to create project", variant: "destructive" }),
    });
  };

  const selectCls = "flex h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground";
  const inputCls = "flex h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> New Project</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] glass-panel border-white/10 bg-card/95 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Create New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Project Title *</label>
              <input required value={form.name} onChange={e => setF("name", e.target.value)} placeholder="Project name..." className={inputCls} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <textarea value={form.description} onChange={e => setF("description", e.target.value)} placeholder="Project objectives..." className="flex min-h-[70px] w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Stage</label>
              <select value={form.stage} onChange={e => setF("stage", e.target.value)} className={selectCls}>
                {STAGES.map(s => <option key={s} value={s} className="bg-card capitalize">{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <select value={form.status} onChange={e => setF("status", e.target.value)} className={selectCls}>
                {STATUSES.map(s => <option key={s} value={s} className="bg-card capitalize">{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Priority</label>
              <select value={form.priority} onChange={e => setF("priority", e.target.value)} className={selectCls}>
                {["low", "medium", "high", "critical"].map(p => <option key={p} value={p} className="bg-card capitalize">{p}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Product Type</label>
              <select value={form.productType} onChange={e => setF("productType", e.target.value)} className={selectCls}>
                <option value="" className="bg-card">Select type...</option>
                {PRODUCT_TYPES.map(p => <option key={p} value={p} className="bg-card">{p}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2 border-t border-white/10 pt-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Customer Information</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Customer Name</label>
              <input value={form.customerName} onChange={e => setF("customerName", e.target.value)} placeholder="Customer / Client name" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Customer Email</label>
              <input type="email" value={form.customerEmail} onChange={e => setF("customerEmail", e.target.value)} placeholder="customer@email.com" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Customer Phone</label>
              <input value={form.customerPhone} onChange={e => setF("customerPhone", e.target.value)} placeholder="+1 234 567 8900" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cost Target (R)</label>
              <input type="number" value={form.costTarget} onChange={e => setF("costTarget", e.target.value)} placeholder="0.00" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setF("startDate", e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Due Date</label>
              <input type="date" value={form.targetDate} onChange={e => setF("targetDate", e.target.value)} className={inputCls} />
            </div>
          </div>

          {users.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Assignees</label>
              <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-white/10 bg-black/10 max-h-32 overflow-y-auto">
                {users.map(u => (
                  <button key={u.id} type="button" onClick={() => toggleAssignee(u.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${form.assigneeIds.includes(u.id) ? "bg-primary text-white border-primary" : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                    <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px]">{u.name.charAt(0)}</span>
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
