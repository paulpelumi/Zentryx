import { useState } from "react";
import { useListProjects, useCreateProject, useGetGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Calendar, CheckSquare, Target } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ProjectsList() {
  const [searchTerm, setSearchQuery] = useState("");
  const { data: projects, isLoading } = useListProjects({});
  
  const filteredProjects = projects?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.productCategory?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Project Portfolio</h1>
          <p className="text-muted-foreground mt-1">Manage end-to-end R&D lifecycles.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search projects..." 
              className="pl-9 bg-glass"
              value={searchTerm}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <CreateProjectModal />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProjects?.map(project => (
          <Link key={project.id} href={`/projects/${project.id}`} className="block group">
            <div className="glass-card h-full rounded-2xl p-6 relative overflow-hidden flex flex-col">
              {/* Subtle top accent line based on priority */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                project.priority === 'critical' ? 'bg-destructive' : 
                project.priority === 'high' ? 'bg-orange-500' : 'bg-primary'
              }`} />
              
              <div className="flex justify-between items-start mb-4">
                <Badge variant="outline" className="bg-white/5 backdrop-blur-md border-white/10 capitalize">
                  {project.stage.replace('_', ' ')}
                </Badge>
                <Badge variant={
                  project.status === 'completed' ? 'success' : 
                  project.status === 'active' ? 'default' : 'secondary'
                } className="capitalize">
                  {project.status.replace('_', ' ')}
                </Badge>
              </div>
              
              <h3 className="text-xl font-bold font-display text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-2">
                {project.name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-1">
                {project.description || "No description provided."}
              </p>

              <div className="space-y-4 mt-auto">
                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground flex items-center gap-1"><CheckSquare className="w-3 h-3"/> Tasks</span>
                    <span className="text-foreground">{project.completedTaskCount} / {project.taskCount}</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500" 
                      style={{ width: `${project.taskCount > 0 ? (project.completedTaskCount / project.taskCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-white/10">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{project.targetDate ? format(new Date(project.targetDate), "MMM d, yyyy") : 'No target'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-green-400" />
                    <span>{project.successRate ? `${project.successRate}% Conf` : 'TBD'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {filteredProjects?.length === 0 && (
        <div className="text-center py-20 glass-card rounded-2xl">
          <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground">No projects found</h3>
          <p className="text-muted-foreground">Try adjusting your search terms.</p>
        </div>
      )}
    </div>
  );
}

function CreateProjectModal() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createMutation = useCreateProject();
  
  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState<any>("ideation");
  const [priority, setPriority] = useState<any>("medium");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      data: {
        name,
        description,
        stage,
        status: "active",
        priority,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        setOpen(false);
        setName("");
        setDescription("");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-primary/20"><Plus className="w-4 h-4" /> New Project</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] glass-panel border-white/10 bg-card/95">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Initialize New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Name</label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. NextGen Plant Protein" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea 
              className="flex min-h-[80px] w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              value={description} onChange={e => setDescription(e.target.value)} placeholder="Project objectives..." 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Stage</label>
              <select 
                className="flex h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 text-foreground"
                value={stage} onChange={e => setStage(e.target.value)}
              >
                <option value="ideation" className="bg-card">Ideation</option>
                <option value="research" className="bg-card">Research</option>
                <option value="formulation" className="bg-card">Formulation</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <select 
                className="flex h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 text-foreground"
                value={priority} onChange={e => setPriority(e.target.value)}
              >
                <option value="low" className="bg-card">Low</option>
                <option value="medium" className="bg-card">Medium</option>
                <option value="high" className="bg-card">High</option>
                <option value="critical" className="bg-card">Critical</option>
              </select>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Launch Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
