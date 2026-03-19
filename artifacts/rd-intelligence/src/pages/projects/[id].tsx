import { useRoute } from "wouter";
import { useGetProject, useListTasks, useCreateTask, useUpdateTask } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, MoreHorizontal, Clock } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";

const STATUSES = ['todo', 'in_progress', 'review', 'done', 'blocked'] as const;

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = Number(params?.id);
  
  const { data: project, isLoading: loadingProj } = useGetProject(projectId);
  const { data: tasks, isLoading: loadingTasks } = useListTasks({ projectId });
  const updateTaskMut = useUpdateTask();
  const queryClient = useQueryClient();

  if (loadingProj || loadingTasks) return <PageLoader />;
  if (!project) return <div>Project not found</div>;

  const moveTask = (taskId: number, newStatus: any) => {
    updateTaskMut.mutate({ id: taskId, data: { status: newStatus } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] })
    });
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between shrink-0">
        <div className="space-y-2">
          <Link href="/projects" className="text-sm text-primary hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Portfolio
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-display font-bold text-foreground">{project.name}</h1>
            <Badge variant="outline" className="capitalize bg-white/5">{project.stage.replace('_', ' ')}</Badge>
            <Badge variant={project.status === 'completed' ? 'success' : 'default'} className="capitalize">{project.status}</Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">{project.description}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground mb-1">Target Commercialization</div>
          <div className="font-semibold text-foreground">
            {project.targetDate ? format(new Date(project.targetDate), "MMMM d, yyyy") : 'Not set'}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex gap-6 h-full min-w-max">
          {STATUSES.map(status => {
            const columnTasks = tasks?.filter(t => t.status === status) || [];
            
            return (
              <div key={status} className="w-80 flex flex-col max-h-full">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h3 className="font-semibold text-foreground capitalize flex items-center gap-2">
                    {status.replace('_', ' ')}
                    <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full text-muted-foreground">
                      {columnTasks.length}
                    </span>
                  </h3>
                  {status === 'todo' && <CreateTaskModal projectId={projectId} />}
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 pb-2">
                  {columnTasks.map(task => (
                    <div key={task.id} className="glass-card p-4 rounded-xl cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant={
                          task.priority === 'critical' ? 'destructive' : 
                          task.priority === 'high' ? 'warning' : 'outline'
                        } className="text-[10px] px-1.5 py-0">
                          {task.priority}
                        </Badge>
                        <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                      <h4 className="text-sm font-medium text-foreground mb-2">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{format(new Date(task.createdAt), "MMM d")}</span>
                        </div>
                        
                        {/* Fake move actions for demo */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {status !== 'todo' && (
                            <button onClick={() => moveTask(task.id, STATUSES[STATUSES.indexOf(status)-1])} className="p-1 hover:bg-white/10 rounded text-xs">←</button>
                          )}
                          {status !== 'done' && (
                            <button onClick={() => moveTask(task.id, STATUSES[STATUSES.indexOf(status)+1])} className="p-1 hover:bg-white/10 rounded text-xs">→</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="border-2 border-dashed border-white/5 rounded-xl h-24 flex items-center justify-center text-muted-foreground text-sm">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      data: {
        projectId,
        title,
        status: "todo",
        priority
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        setOpen(false);
        setTitle("");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-1 hover:bg-white/10 rounded-md text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] glass-panel">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title..." autoFocus />
          <select 
            className="flex h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 text-foreground"
            value={priority} onChange={e => setPriority(e.target.value)}
          >
            <option value="low" className="bg-card">Low Priority</option>
            <option value="medium" className="bg-card">Medium Priority</option>
            <option value="high" className="bg-card">High Priority</option>
            <option value="critical" className="bg-card">Critical Priority</option>
          </select>
          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={createMutation.isPending}>Add</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
