import { useState, useMemo } from "react";
import { useListProjects, useCreateProject, useDeleteProject, useListUsers, useUpdateProject } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Download } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { ViewSwitcher, type ViewType } from "./views/ViewSwitcher";
import { PortfolioView } from "./views/PortfolioView";
import { KanbanView } from "./views/KanbanView";
import { AnalyticsView } from "./views/AnalyticsView";
import { MatrixView } from "./views/MatrixView";
import { ListView } from "./views/ListView";

const STAGES = ["testing", "reformulation", "innovation", "cost_optimization", "modification"] as const;
const STATUSES = ["approved", "awaiting_feedback", "on_hold", "in_progress", "new_inventory", "cancelled", "pushed_to_live"] as const;
const PRODUCT_TYPES = ["Seasoning", "Snack Dusting", "Bread & Dough Premix", "Dairy Premix", "Functional Blend", "Pasta Sauce", "Sweet Flavour", "Savoury Flavour"] as const;

export default function ProjectsList() {
  const [searchTerm, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"projects" | "export">("projects");
  const [view, setView] = useState<ViewType>("portfolio");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: projects, isLoading } = useListProjects({});
  const { data: users } = useListUsers();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteProject();
  const updateMutation = useUpdateProject();
  const { toast } = useToast();

  const handleDateChange = (id: number, date: string) => {
    updateMutation.mutate({ id, data: { targetDate: date || null } as any }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/projects"] }),
    });
  };

  const filteredProjects = useMemo(() => {
    return (projects || []).filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (p.productType?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [projects, searchTerm, statusFilter]);

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

  const handleExport = (fmt: "csv" | "excel") => {
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl w-fit border border-white/10">
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "projects" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            Projects
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "export" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Download className="w-4 h-4" /> Export Data
          </button>
        </div>

        {activeTab === "projects" && (
          <ViewSwitcher active={view} onChange={setView} />
        )}
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
            {view !== "analytics" && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${statusFilter === "all" ? "bg-primary text-white border-primary" : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
                >
                  All
                </button>
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s === statusFilter ? "all" : s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border capitalize ${statusFilter === s ? "bg-primary text-white border-primary" : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              {view === "portfolio" && (
                <PortfolioView
                  projects={filteredProjects}
                  onDelete={handleDelete}
                  onDateChange={handleDateChange}
                />
              )}
              {view === "kanban" && <KanbanView projects={filteredProjects} />}
              {view === "analytics" && <AnalyticsView projects={projects || []} />}
              {view === "matrix" && <MatrixView projects={filteredProjects} />}
              {view === "list" && <ListView projects={filteredProjects} />}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function ExportTab({ projects, onExport }: { projects: any[]; onExport: (fmt: "csv" | "excel") => void }) {
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
      } as any,
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
                {STAGES.map(s => <option key={s} value={s} className="bg-card capitalize">{s.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <select value={form.status} onChange={e => setF("status", e.target.value)} className={selectCls}>
                {STATUSES.map(s => <option key={s} value={s} className="bg-card capitalize">{s.replace(/_/g, " ")}</option>)}
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
