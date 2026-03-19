import { useRoute, useLocation } from "wouter";
import { useGetProject, useListTasks, useCreateTask, useUpdateTask, useUpdateProject, useListUsers } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, MoreHorizontal, Clock, MessageSquare, Send, Trash2, Edit3, Check, X } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL;
const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done', 'blocked'] as const;
const STAGES = ["testing", "reformulation", "innovation", "cost_optimization", "modification"];
const STATUSES = ["approved", "awaiting_feedback", "on_hold", "in_progress", "new_inventory", "cancelled", "pushed_to_live"];
const STATUS_COLORS: Record<string, string> = {
  approved: "text-green-400", in_progress: "text-blue-400", awaiting_feedback: "text-yellow-400",
  on_hold: "text-orange-400", new_inventory: "text-purple-400", cancelled: "text-red-400", pushed_to_live: "text-emerald-400",
};

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = Number(params?.id);
  const [activeTab, setActiveTab] = useState<"tasks" | "comments" | "info">("tasks");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: project, isLoading: loadingProj } = useGetProject(projectId);
  const { data: tasks, isLoading: loadingTasks } = useListTasks({ projectId });
  const { data: users } = useListUsers();
  const updateTaskMut = useUpdateTask();
  const updateProjectMut = useUpdateProject();

  useEffect(() => { if (project) setTitleValue(project.name); }, [project]);

  if (loadingProj || loadingTasks) return <PageLoader />;
  if (!project) return <div>Project not found</div>;

  const moveTask = (taskId: number, newStatus: any) => {
    updateTaskMut.mutate({ id: taskId, data: { status: newStatus } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] })
    });
  };

  const saveTitle = () => {
    if (!titleValue.trim()) return;
    updateProjectMut.mutate({ id: projectId, data: { name: titleValue } as any }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/projects"] }); setEditingTitle(false); }
    });
  };

  const saveField = (field: string, value: any) => {
    updateProjectMut.mutate({ id: projectId, data: { [field]: value } as any }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/projects"] }),
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
                <input
                  value={titleValue}
                  onChange={e => setTitleValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                  className="text-2xl font-bold font-display bg-transparent border-b-2 border-primary focus:outline-none text-foreground w-full"
                  autoFocus
                />
                <button onClick={saveTitle} className="p-1 text-green-400 hover:text-green-300"><Check className="w-5 h-5" /></button>
                <button onClick={() => setEditingTitle(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
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
                {STATUSES.map(s => <option key={s} value={s} className={`bg-card capitalize`}>{s.replace(/_/g, ' ')}</option>)}
              </select>
              <Badge variant="outline" className="capitalize">{project.priority}</Badge>
            </div>
            <p className="text-muted-foreground mt-2 text-sm max-w-2xl">{project.description}</p>
          </div>

          <div className="text-right text-sm shrink-0">
            {project.customerName && <div className="font-medium text-foreground">{project.customerName}</div>}
            {project.productType && <div className="text-muted-foreground">{project.productType}</div>}
            {project.targetDate && <div className="text-muted-foreground mt-1">Due: {format(new Date(project.targetDate), "MMM d, yyyy")}</div>}
            {project.costTarget && <div className="text-green-400 font-medium mt-1">Cost Target: R{parseFloat(String(project.costTarget)).toLocaleString()}</div>}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Customer Name", value: project.customerName },
            { label: "Customer Email", value: project.customerEmail },
            { label: "Customer Phone", value: project.customerPhone },
            { label: "Product Type", value: project.productType },
            { label: "Cost Target", value: project.costTarget ? `R${parseFloat(String(project.costTarget)).toLocaleString()}` : null },
            { label: "Start Date", value: project.startDate ? format(new Date(project.startDate), "MMMM d, yyyy") : null },
            { label: "Due Date", value: project.targetDate ? format(new Date(project.targetDate), "MMMM d, yyyy") : null },
          ].map(({ label, value }) => (
            <div key={label} className="glass-card rounded-xl p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
              <div className="font-medium text-foreground">{value || <span className="text-muted-foreground italic">Not set</span>}</div>
            </div>
          ))}
          {(project as any).assignees?.length > 0 && (
            <div className="glass-card rounded-xl p-4 md:col-span-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Assignees</div>
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
        </div>
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
    }).then(r => r.json()).then(setComments).finally(() => setLoading(false));
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
          <div key={c.id} className="flex gap-3 group">
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
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); post(); } }}
          placeholder="Add a status report or comment... (Enter to send)"
          className="flex-1 min-h-[60px] rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground resize-none"
        />
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
  const selectCls = "flex h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm focus:outline-none text-foreground";

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
          <select value={priority} onChange={e => setPriority(e.target.value)} className={selectCls}>
            {["low", "medium", "high", "critical"].map(p => <option key={p} value={p} className="bg-card capitalize">{p} Priority</option>)}
          </select>
          <div className="pt-2 flex justify-end"><Button type="submit" disabled={createMutation.isPending}>Add Task</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
