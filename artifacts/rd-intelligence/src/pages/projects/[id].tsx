import { useRoute } from "wouter";
import { useGetProject, useListTasks, useCreateTask, useUpdateTask, useUpdateProject, useListUsers } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Clock, MessageSquare, Send, Edit3, Check, X, Calendar, User, Phone, Mail, DollarSign, Package } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL;
const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done', 'blocked'] as const;
const STAGES = ["testing", "reformulation", "innovation", "cost_optimization", "modification"];
const STATUSES = ["approved", "awaiting_feedback", "on_hold", "in_progress", "new_inventory", "cancelled", "pushed_to_live"];
const PRIORITIES = ["low", "medium", "high", "critical"];
const PRODUCT_TYPES = ["Seasoning", "Snack Dusting", "Bread & Dough Premix", "Dairy Premix", "Functional Blend", "Pasta Sauce", "Sweet Flavour", "Savoury Flavour"];

function InlineEdit({ value, onSave, type = "text", options, placeholder, icon, label }: {
  value: string; onSave: (v: string) => void; type?: string; options?: string[];
  placeholder?: string; icon?: React.ReactNode; label: string;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);

  const save = () => { if (val !== value) onSave(val); setEditing(false); };
  const cancel = () => { setVal(value); setEditing(false); };
  const cls = "flex h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground";

  return (
    <div className="glass-card rounded-xl p-4 group/field relative">
      <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground uppercase tracking-wide font-medium">
        {icon}{label}
      </div>
      {editing ? (
        <div className="flex items-center gap-2">
          {options ? (
            <select value={val} onChange={e => setVal(e.target.value)} className={cls} autoFocus>
              <option value="" className="bg-card">— not set —</option>
              {options.map(o => <option key={o} value={o} className="bg-card capitalize">{o.replace(/_/g,' ')}</option>)}
            </select>
          ) : (
            <input type={type} value={val} onChange={e => setVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
              className={cls} placeholder={placeholder} autoFocus />
          )}
          <button onClick={save} className="p-1.5 text-green-400 hover:text-green-300 shrink-0"><Check className="w-4 h-4" /></button>
          <button onClick={cancel} className="p-1.5 text-muted-foreground hover:text-foreground shrink-0"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 group/val">
          <span className={`text-sm font-medium ${!value ? "text-muted-foreground italic" : "text-foreground"}`}>
            {type === "date" && value ? format(new Date(value), "MMMM d, yyyy") : (value || "Not set")}
          </span>
          <button onClick={() => setEditing(true)}
            className="opacity-0 group-hover/field:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-opacity shrink-0">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = Number(params?.id);
  const [activeTab, setActiveTab] = useState<"tasks" | "comments" | "info">("tasks");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: project, isLoading: loadingProj } = useGetProject(projectId);
  const { data: tasks, isLoading: loadingTasks } = useListTasks({ projectId });
  const { data: users } = useListUsers();
  const updateTaskMut = useUpdateTask();
  const updateProjectMut = useUpdateProject();

  useEffect(() => {
    if (project) { setTitleValue(project.name); setDescValue(project.description || ""); }
  }, [project]);

  if (loadingProj || loadingTasks) return <PageLoader />;
  if (!project) return <div className="glass-card p-12 text-center rounded-2xl text-muted-foreground">Project not found</div>;

  const moveTask = (taskId: number, newStatus: any) => {
    updateTaskMut.mutate({ id: taskId, data: { status: newStatus } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] })
    });
  };

  const saveField = (field: string, value: any) => {
    updateProjectMut.mutate({ id: projectId, data: { [field]: value || null } as any }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); toast({ title: "Saved", description: `${field.replace(/([A-Z])/g,' $1')} updated.` }); },
    });
  };

  const saveTitle = () => {
    if (!titleValue.trim()) return;
    updateProjectMut.mutate({ id: projectId, data: { name: titleValue } as any }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); setEditingTitle(false); }
    });
  };

  const saveDesc = () => {
    updateProjectMut.mutate({ id: projectId, data: { description: descValue } as any }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); setEditingDesc(false); }
    });
  };

  const selectCls = "h-8 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="text-sm text-primary hover:underline flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Portfolio
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input value={titleValue} onChange={e => setTitleValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                  className="text-2xl font-bold font-display bg-transparent border-b-2 border-primary focus:outline-none text-foreground w-full" autoFocus />
                <button onClick={saveTitle} className="p-1 text-green-400"><Check className="w-5 h-5" /></button>
                <button onClick={() => setEditingTitle(false)} className="p-1 text-muted-foreground"><X className="w-5 h-5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">{project.name}</h1>
                <button onClick={() => setEditingTitle(true)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-opacity">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <select value={project.stage} onChange={e => saveField("stage", e.target.value)} className={selectCls}>
                {STAGES.map(s => <option key={s} value={s} className="bg-card capitalize">{s.replace(/_/g, ' ')}</option>)}
              </select>
              <select value={project.status} onChange={e => saveField("status", e.target.value)} className={selectCls}>
                {STATUSES.map(s => <option key={s} value={s} className="bg-card capitalize">{s.replace(/_/g, ' ')}</option>)}
              </select>
              <select value={project.priority || "medium"} onChange={e => saveField("priority", e.target.value)} className={selectCls}>
                {PRIORITIES.map(p => <option key={p} value={p} className="bg-card capitalize">{p} Priority</option>)}
              </select>
            </div>

            <div className="mt-3 max-w-2xl">
              {editingDesc ? (
                <div className="space-y-2">
                  <textarea value={descValue} onChange={e => setDescValue(e.target.value)} autoFocus
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground min-h-[80px] resize-none" />
                  <div className="flex gap-2">
                    <button onClick={saveDesc} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs"><Check className="w-3 h-3" /> Save</button>
                    <button onClick={() => { setEditingDesc(false); setDescValue(project.description || ""); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 text-muted-foreground text-xs"><X className="w-3 h-3" /> Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 group">
                  <p className="text-muted-foreground text-sm flex-1">{project.description || <span className="italic">No description. Click to add.</span>}</p>
                  <button onClick={() => setEditingDesc(true)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground shrink-0"><Edit3 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          </div>

          <div className="text-right text-sm shrink-0 space-y-1">
            {project.customerName && <div className="font-medium text-foreground">{project.customerName}</div>}
            {project.productType && <div className="text-muted-foreground">{project.productType}</div>}
            {project.targetDate && (
              <div className="text-muted-foreground flex items-center justify-end gap-1">
                <Calendar className="w-3.5 h-3.5" /> Due: {format(new Date(project.targetDate), "MMM d, yyyy")}
              </div>
            )}
            {project.costTarget && <div className="text-green-400 font-medium">R{parseFloat(String(project.costTarget)).toLocaleString()}</div>}
          </div>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-white/5 rounded-xl w-fit">
        {[{ id: "tasks", label: "Tasks" }, { id: "comments", label: "Status Reports" }, { id: "info", label: "Project Info" }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "tasks" && (
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex gap-6 min-w-max">
            {TASK_STATUSES.map(status => {
              const columnTasks = (tasks || []).filter(t => t.status === status);
              return (
                <div key={status} className="w-72 flex flex-col max-h-[60vh]">
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <h3 className="font-semibold text-foreground capitalize flex items-center gap-2 text-sm">
                      {status.replace(/_/g, ' ')}
                      <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full text-muted-foreground">{columnTasks.length}</span>
                    </h3>
                    {status === 'todo' && <CreateTaskModal projectId={projectId} />}
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {columnTasks.map(task => (
                      <div key={task.id} className="glass-card p-4 rounded-xl group">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant={task.priority === 'critical' ? 'destructive' : task.priority === 'high' ? 'warning' : 'outline'} className="text-[10px]">{task.priority}</Badge>
                        </div>
                        <h4 className="text-sm font-medium text-foreground mb-1">{task.title}</h4>
                        {task.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />{format(new Date(task.createdAt), "MMM d")}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {status !== 'todo' && <button onClick={() => moveTask(task.id, TASK_STATUSES[TASK_STATUSES.indexOf(status) - 1])} className="p-1 hover:bg-white/10 rounded text-xs text-muted-foreground">←</button>}
                            {status !== 'done' && <button onClick={() => moveTask(task.id, TASK_STATUSES[TASK_STATUSES.indexOf(status) + 1])} className="p-1 hover:bg-white/10 rounded text-xs text-muted-foreground">→</button>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {columnTasks.length === 0 && <div className="border-2 border-dashed border-white/5 rounded-xl h-16 flex items-center justify-center text-muted-foreground text-xs">Empty</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "comments" && <CommentsTab projectId={projectId} />}

      {activeTab === "info" && (
        <div className="space-y-6">
          <p className="text-xs text-muted-foreground">Click any field to edit it directly.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <InlineEdit label="Customer Name" value={project.customerName || ""} onSave={v => saveField("customerName", v)} icon={<User className="w-3.5 h-3.5" />} placeholder="Customer / client name" />
            <InlineEdit label="Customer Email" value={project.customerEmail || ""} onSave={v => saveField("customerEmail", v)} type="email" icon={<Mail className="w-3.5 h-3.5" />} placeholder="email@example.com" />
            <InlineEdit label="Customer Phone" value={project.customerPhone || ""} onSave={v => saveField("customerPhone", v)} icon={<Phone className="w-3.5 h-3.5" />} placeholder="+27 xx xxx xxxx" />
            <InlineEdit label="Product Type" value={project.productType || ""} onSave={v => saveField("productType", v)} options={PRODUCT_TYPES} icon={<Package className="w-3.5 h-3.5" />} />
            <InlineEdit label="Cost Target (R)" value={project.costTarget ? String(parseFloat(String(project.costTarget))) : ""} onSave={v => saveField("costTarget", v)} type="number" icon={<DollarSign className="w-3.5 h-3.5" />} placeholder="0.00" />
            <InlineEdit label="Priority" value={project.priority || "medium"} onSave={v => saveField("priority", v)} options={PRIORITIES} icon={<Edit3 className="w-3.5 h-3.5" />} />
            <InlineEdit label="Stage" value={project.stage || ""} onSave={v => saveField("stage", v)} options={STAGES} icon={<Edit3 className="w-3.5 h-3.5" />} />
            <InlineEdit label="Status" value={project.status || ""} onSave={v => saveField("status", v)} options={STATUSES} icon={<Edit3 className="w-3.5 h-3.5" />} />
            <InlineEdit label="Start Date" value={project.startDate ? format(new Date(project.startDate), "yyyy-MM-dd") : ""} onSave={v => saveField("startDate", v)} type="date" icon={<Calendar className="w-3.5 h-3.5" />} />
            <InlineEdit label="Due Date" value={project.targetDate ? format(new Date(project.targetDate), "yyyy-MM-dd") : ""} onSave={v => saveField("targetDate", v)} type="date" icon={<Calendar className="w-3.5 h-3.5" />} />
          </div>

          {(project as any).assignees?.length > 0 && (
            <div className="glass-card rounded-xl p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2"><User className="w-3.5 h-3.5" /> Assignees</div>
              <div className="flex flex-wrap gap-2">
                {(project as any).assignees.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-secondary/50 to-primary/50 flex items-center justify-center text-white text-[10px] font-bold">{a.name.charAt(0)}</div>
                    <span className="text-sm text-foreground">{a.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">· {a.role.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <AssigneeEditor projectId={projectId} currentAssigneeIds={((project as any).assignees || []).map((a: any) => a.id)} users={users || []} onSave={(ids) => saveField("assigneeIds", ids)} />
        </div>
      )}
    </div>
  );
}

function AssigneeEditor({ projectId, currentAssigneeIds, users, onSave }: { projectId: number; currentAssigneeIds: number[]; users: any[]; onSave: (ids: number[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<number[]>(currentAssigneeIds);
  useEffect(() => { setSelected(currentAssigneeIds); }, [JSON.stringify(currentAssigneeIds)]);
  const toggle = (id: number) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  if (users.length === 0) return null;

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-2"><User className="w-3.5 h-3.5" /> Edit Assignees</div>
        {!editing && <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Edit3 className="w-3.5 h-3.5 mr-1" /> Edit</Button>}
      </div>
      {editing ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {users.map(u => (
              <button key={u.id} type="button" onClick={() => toggle(u.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${selected.includes(u.id) ? "bg-primary text-white border-primary" : "border-white/10 text-muted-foreground hover:text-foreground"}`}>
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">{u.name.charAt(0)}</span>
                {u.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { onSave(selected); setEditing(false); }}><Check className="w-3.5 h-3.5 mr-1" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setSelected(currentAssigneeIds); setEditing(false); }}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{selected.length === 0 ? "No assignees set." : `${selected.length} assignee(s) assigned.`}</p>
      )}
    </div>
  );
}

function CommentsTab({ projectId }: { projectId: number }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${BASE}api/projects/${projectId}/comments`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("rd_token")}` },
    }).then(r => r.json()).then(d => setComments(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, [projectId]);

  const post = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`${BASE}api/projects/${projectId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("rd_token")}` },
        body: JSON.stringify({ content: newComment }),
      });
      const data = await res.json();
      setComments(c => [...c, data]);
      setNewComment("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } finally { setPosting(false); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="glass-card rounded-2xl p-6 space-y-4">
      <h3 className="text-lg font-semibold font-display flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> Status Reports & Comments</h3>
      <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
        {comments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>No status reports yet. Add the first one below.</p>
          </div>
        ) : comments.map(c => (
          <div key={c.id} className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-secondary/50 to-primary/50 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {c.authorName?.charAt(0) || "?"}
            </div>
            <div className="flex-1 bg-white/5 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-foreground">{c.authorName}</span>
                <span className="text-xs text-muted-foreground">{format(new Date(c.createdAt), "MMM d, yyyy · h:mm a")}</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 pt-2 border-t border-white/5">
        <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); post(); } }}
          placeholder="Add a status report or comment... (Enter to send)"
          className="flex-1 min-h-[60px] rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground resize-none" />
        <Button onClick={post} disabled={posting || !newComment.trim()} className="self-end gap-2">
          <Send className="w-4 h-4" /> {posting ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}

function CreateTaskModal({ projectId }: { projectId: number }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createMutation = useCreateTask();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<any>("medium");
  const cls = "flex h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm focus:outline-none text-foreground";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: { projectId, title, status: "todo" as any, priority } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); setOpen(false); setTitle(""); }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-1 hover:bg-white/10 rounded-md text-muted-foreground hover:text-foreground transition-colors"><Plus className="w-4 h-4" /></button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] glass-panel">
        <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title..." autoFocus />
          <select value={priority} onChange={e => setPriority(e.target.value)} className={cls}>
            {["low", "medium", "high", "critical"].map(p => <option key={p} value={p} className="bg-card capitalize">{p} Priority</option>)}
          </select>
          <div className="pt-2 flex justify-end"><Button type="submit" disabled={createMutation.isPending}>Add Task</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
