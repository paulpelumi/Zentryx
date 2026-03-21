import { useState, useRef, useCallback, useEffect } from "react";
import { useGetDashboardStats, useListProjects, useListUsers } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/spinner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from "recharts";
import { FlaskConical, Users, Award, FolderOpen, GripHorizontal } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Link } from "wouter";

const COLORS = ['hsl(252, 89%, 65%)', 'hsl(190, 90%, 50%)', 'hsl(280, 80%, 60%)', 'hsl(320, 80%, 60%)', 'hsl(150, 80%, 50%)', 'hsl(50, 90%, 55%)', 'hsl(10, 80%, 60%)'];
const CHART_BG = 'rgba(15, 17, 26, 0.9)';

type ChartType = "pie" | "donut" | "bar" | "histogram" | "line";
type TeamView = "list" | "pie" | "donut" | "bar";

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-500/10 text-green-400 border-green-500/20",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  awaiting_feedback: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  on_hold: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  new_inventory: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  pushed_to_live: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

function TooltipStyle() {
  return {
    contentStyle: { backgroundColor: CHART_BG, borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' },
    itemStyle: { color: '#fff' },
  };
}

function useResize(defaultH: number, minH: number, maxH: number) {
  const [height, setHeight] = useState(defaultH);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(defaultH);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = height;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ns-resize";
  }, [height]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientY - startY.current;
      setHeight(Math.min(maxH, Math.max(minH, startH.current + delta)));
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [minH, maxH]);

  return { height, onMouseDown };
}

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="flex items-center justify-center py-2 cursor-ns-resize hover:bg-white/5 transition-colors group mt-2 rounded-b-xl -mx-6 -mb-6"
      title="Drag to resize">
      <GripHorizontal className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading, error } = useGetDashboardStats();
  const { data: projects } = useListProjects({});
  const { data: users } = useListUsers();
  const [pipelineChartType, setPipelineChartType] = useState<ChartType>("donut");
  const [teamView, setTeamView] = useState<TeamView>("list");
  const [selectedMember, setSelectedMember] = useState<number | null>(null);

  const velocityResize = useResize(280, 160, 600);
  const pipelineResize = useResize(220, 140, 600);

  if (isLoading) return <PageLoader />;
  if (error || !stats) return <div className="p-8 text-destructive">Failed to load dashboard data.</div>;

  const teamSize = Math.min(500, stats.teamSize || 0);

  const kpis = [
    { label: "Total Projects", value: formatNumber(stats.totalProjects || 0), icon: FolderOpen, color: "text-primary", bg: "bg-primary/10" },
    { label: "Active Projects", value: formatNumber(stats.activeProjects || 0), icon: FlaskConical, color: "text-secondary", bg: "bg-secondary/10" },
    { label: "Completed Projects", value: formatNumber(stats.completedProjects || 0), icon: Award, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Team Size", value: formatNumber(teamSize), icon: Users, color: "text-accent", bg: "bg-accent/10" },
  ];

  const memberProjects = selectedMember
    ? (projects || []).filter(p => Array.isArray(p.assignees) && p.assignees.some((a: any) => a.id === selectedMember))
    : [];

  const teamChartData = (users || []).map(u => ({
    name: u.name.split(' ')[0],
    fullName: u.name,
    id: u.id,
    projects: (projects || []).filter(p => Array.isArray(p.assignees) && p.assignees.some((a: any) => a.id === u.id)).length,
  })).filter(u => u.projects > 0);

  const pipelineData = stats.projectsByStage || [];

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Intelligence Overview</h1>
        <p className="text-muted-foreground mt-1">Zentryx R&D metrics and project insights.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            key={kpi.label} className="glass-card p-6 rounded-2xl flex items-start justify-between"
          >
            <div>
              <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
              <h3 className="text-3xl font-bold font-display text-foreground mt-2">{kpi.value}</h3>
              {kpi.label === "Team Size" && (stats.teamSize || 0) > 500 && (
                <p className="text-xs text-muted-foreground mt-1">(capped at 500)</p>
              )}
            </div>
            <div className={`p-3 rounded-xl ${kpi.bg}`}>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold font-display">Innovation Velocity</h3>
            <span className="text-xs text-muted-foreground">Drag handle to resize</span>
          </div>
          <div style={{ height: velocityResize.height }} className="transition-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyProjects || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cProj" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(252, 89%, 65%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(252, 89%, 65%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip {...TooltipStyle()} />
                <Area type="monotone" dataKey="projects" stroke="hsl(252, 89%, 65%)" strokeWidth={2} fillOpacity={1} fill="url(#cProj)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <ResizeHandle onMouseDown={velocityResize.onMouseDown} />
        </div>

        <div className="glass-card p-6 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold font-display">Pipeline Distribution</h3>
            <span className="text-xs text-muted-foreground">Drag ↕ to resize</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {(["pie", "donut", "bar", "histogram", "line"] as ChartType[]).map(t => (
              <button key={t} onClick={() => setPipelineChartType(t)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-all capitalize ${pipelineChartType === t ? "bg-primary text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ height: pipelineResize.height }} className="transition-none">
            <ResponsiveContainer width="100%" height="100%">
              {pipelineChartType === "pie" ? (
                <PieChart>
                  <Pie data={pipelineData} cx="50%" cy="50%" outerRadius="70%" dataKey="count" nameKey="stage" stroke="none">
                    {pipelineData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip {...TooltipStyle()} />
                </PieChart>
              ) : pipelineChartType === "donut" ? (
                <PieChart>
                  <Pie data={pipelineData} cx="50%" cy="50%" innerRadius="40%" outerRadius="70%" paddingAngle={4} dataKey="count" nameKey="stage" stroke="none">
                    {pipelineData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip {...TooltipStyle()} />
                </PieChart>
              ) : (
                <BarChart data={pipelineData} margin={{ top: 5, right: 5, bottom: 20, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="stage" stroke="rgba(255,255,255,0.3)" fontSize={10} angle={-30} textAnchor="end" />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} />
                  <RechartsTooltip {...TooltipStyle()} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {pipelineData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 mb-1">
            {pipelineData.slice(0, 5).map((s: any, i: number) => (
              <div key={s.stage} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="capitalize">{s.stage.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
          <ResizeHandle onMouseDown={pipelineResize.onMouseDown} />
        </div>
      </div>

      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold font-display">Team Overview</h3>
          <div className="flex gap-1">
            {(["list", "pie", "donut", "bar"] as TeamView[]).map(v => (
              <button key={v} onClick={() => setTeamView(v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize ${teamView === v ? "bg-primary text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teamView === "list" ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {(users || []).map(u => {
                const projectCount = (projects || []).filter(p => Array.isArray(p.assignees) && p.assignees.some((a: any) => a.id === u.id)).length;
                return (
                  <button key={u.id} onClick={() => setSelectedMember(selectedMember === u.id ? null : u.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${selectedMember === u.id ? "bg-primary/10 border border-primary/20" : "hover:bg-white/5"}`}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-secondary/50 to-primary/50 flex items-center justify-center text-white font-bold text-sm border border-white/10">
                      {u.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm">{u.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{u.role.replace(/_/g, ' ')}</div>
                    </div>
                    <div className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{projectCount} proj</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                {teamView === "bar" ? (
                  <BarChart data={teamChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                    <RechartsTooltip {...TooltipStyle()} />
                    <Bar dataKey="projects" fill="hsl(252, 89%, 65%)" radius={[4, 4, 0, 0]} onClick={(d: any) => setSelectedMember(d.id)} />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie data={teamChartData} cx="50%" cy="50%"
                      innerRadius={teamView === "donut" ? 50 : 0} outerRadius={100}
                      paddingAngle={4} dataKey="projects" nameKey="name" stroke="none"
                      onClick={(d: any) => setSelectedMember(d.id)}>
                      {teamChartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip {...TooltipStyle()} />
                    <Legend />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          <div>
            {selectedMember ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">
                    {users?.find(u => u.id === selectedMember)?.name}'s Projects
                  </h4>
                  <button onClick={() => setSelectedMember(null)} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
                </div>
                <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                  {memberProjects.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">No projects assigned.</p>
                  ) : memberProjects.map((p: any) => (
                    <Link key={p.id} href={`/projects/${p.id}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-white/5 group">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{p.stage?.replace(/_/g, ' ')}</div>
                      </div>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs border capitalize ${STATUS_COLORS[p.status] || "bg-white/5 text-muted-foreground border-white/10"}`}>
                        {p.status?.replace(/_/g, ' ')}
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground opacity-20 mb-3" />
                <p className="text-muted-foreground text-sm">Select a team member to view their projects</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-semibold font-display">Recent Projects</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-white/5 uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Project Name</th>
                <th className="px-6 py-4 font-medium">Stage</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(stats.recentProjects || []).slice(0, 5).map((project: any) => (
                <tr key={project.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">
                    <Link href={`/projects/${project.id}`} className="hover:text-primary transition-colors">{project.name}</Link>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="capitalize bg-white/5 text-xs">{project.stage?.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs border capitalize ${STATUS_COLORS[project.status] || "bg-white/5 text-muted-foreground border-white/10"}`}>
                      {project.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 w-full max-w-[150px]">
                      <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${project.taskCount > 0 ? (project.completedTaskCount / project.taskCount) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-8">
                        {project.taskCount > 0 ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
