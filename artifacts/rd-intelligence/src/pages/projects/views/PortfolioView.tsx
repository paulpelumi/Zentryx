import { motion } from "framer-motion";
import { Link } from "wouter";
import { Calendar, CheckSquare, Trash2 } from "lucide-react";
import { format } from "date-fns";

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

interface Props {
  projects: any[];
  onDelete: (id: number, name: string, e: React.MouseEvent) => void;
  onDateChange: (id: number, date: string) => void;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export function PortfolioView({ projects, onDelete, onDateChange }: Props) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-20 glass-card rounded-2xl">
        <h3 className="text-lg font-medium text-foreground">No projects found</h3>
        <p className="text-muted-foreground">Adjust your filters or create a new project.</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
    >
      {projects.map((project) => (
        <motion.div key={project.id} variants={item} className="relative group">
          <Link href={`/projects/${project.id}`} className="block">
            <div className="glass-card h-full rounded-2xl p-6 relative overflow-hidden flex flex-col hover:border-white/20 transition-all duration-300 hover:shadow-[0_0_30px_rgba(124,58,237,0.15)]">
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${
                  project.priority === "critical"
                    ? "bg-destructive"
                    : project.priority === "high"
                    ? "bg-orange-500"
                    : "bg-primary"
                }`}
              />

              <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium capitalize ${STAGE_COLORS[project.stage] || "text-muted-foreground bg-white/5"}`}>
                  {project.stage.replace(/_/g, " ")}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[project.status] || "bg-white/5 text-muted-foreground border-white/10"}`}>
                  {project.status.replace(/_/g, " ")}
                </span>
              </div>

              <h3 className="text-lg font-bold font-display text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">
                {project.name}
              </h3>
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
                    <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs text-muted-foreground">
                      +{(project as any).assignees.length - 3}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5 mt-auto">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <CheckSquare className="w-3 h-3" /> Tasks
                  </span>
                  <span className="text-foreground">{project.completedTaskCount}/{project.taskCount}</span>
                </div>
                <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${project.taskCount > 0 ? (project.completedTaskCount / project.taskCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3 pt-3 border-t border-white/5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <input
                  type="date"
                  value={project.targetDate ? format(new Date(project.targetDate), "yyyy-MM-dd") : ""}
                  onChange={(e) => { e.stopPropagation(); onDateChange(project.id, e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/50 rounded cursor-pointer text-muted-foreground text-xs hover:text-foreground transition-colors w-full"
                />
              </div>
            </div>
          </Link>
          <button
            onClick={(e) => onDelete(project.id, project.name, e)}
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-all z-10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      ))}
    </motion.div>
  );
}
