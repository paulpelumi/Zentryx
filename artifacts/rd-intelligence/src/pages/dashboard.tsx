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
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const DARK_COLORS = ['hsl(252, 89%, 65%)', 'hsl(190, 90%, 50%)', 'hsl(280, 80%, 60%)', 'hsl(320, 80%, 60%)', 'hsl(150, 80%, 50%)', 'hsl(50, 90%, 55%)', 'hsl(10, 80%, 60%)'];
const LIGHT_COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const DARK_STATUS: Record<string, string> = {
  approved: "bg-green-500/10 text-green-400 border-green-500/20",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  awaiting_feedback: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  on_hold: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  new_inventory: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  pushed_to_live: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};
const LIGHT_STATUS: Record<string, string> = {
  approved: "bg-green-50 text-green-700 border-green-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  awaiting_feedback: "bg-amber-50 text-amber-700 border-amber-200",
  on_hold: "bg-orange-50 text-orange-700 border-orange-200",
  new_inventory: "bg-purple-50 text-purple-700 border-purple-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  pushed_to_live: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

type ChartType = "pie" | "donut" | "bar" | "histogram" | "line";
type TeamView = "list" | "pie" | "donut" | "bar";

function TooltipStyle(isLight: boolean) {
  return {
    contentStyle: {
      backgroundColor: isLight ? '#FFFFFF' : 'rgba(15, 17, 26, 0.9)',
      borderColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.1)',
      borderRadius: '10px',
      boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.10)' : 'none',
      color: isLight ? '#111827' : '#fff',
      fontSize: 13,
    },
    itemStyle: { color: isLight ? '#374151' : '#fff' },
    labelStyle: { color: isLight ? '#111827' : '#e2e8f0', fontWeight: 600 },
    cursor: { fill: isLight ? 'rgba(79,70,229,0.05)' : 'rgba(255,255,255,0.03)' },
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

function ResizeHandle({ onMouseDown, isLight }: { onMouseDown: (e: React.MouseEvent) => void; isLight: boolean }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={cn("flex items-center justify-center py-2 cursor-ns-resize transition-colors group mt-2 rounded-b-xl -mx-6 -mb-6",
        isLight ? "hover:bg-slate-50" : "hover:bg-white/5"
      )}
      title="Drag to resize">
      <GripHorizontal className={cn("w-4 h-4 transition-colors", isLight ? "text-slate-300 group-hover:text-slate-500" : "text-white/20 group-hover:text-white/40")} />
    </div>
  );
}

export default function Dashboard() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const { data: stats, isLoading, error } = useGetDashboardStats();
  const { data: projects } = useListProjects({});
  const { data: users } = useListUsers();
  const [pipelineChartType, setPipelineChartType] = useState<ChartType>("donut");
  const [teamView, setTeamView] = useState<TeamView>("list");
  const [selectedMember, setSelectedMember] = useState<number | null>(null);

  const velocityResize = useResize(280, 160, 600);
  const pipelineResize = useResize(220, 140, 600);

  const COLORS = isLight ? LIGHT_COLORS : DARK_COLORS;
  const STATUS_COLORS = isLight ? LIGHT_STATUS : DARK_STATUS;

  const gridStroke = isLight ? "#E5E7EB" : "rgba(255,255,255,0.05)";
  const axisStroke = isLight ? "#9CA3AF" : "rgba(255,255,255,0.3)";
  const axisTickFill = isLight ? "#374151" : "rgba(255,255,255,0.6)";

  if (isLoading) return <PageLoader />;
  if (error || !stats) return <div className="p-8 text-destructive">Failed to load dashboard data.</div>;

  const teamSize = Math.min(500, stats.teamSize || 0);

  const kpis = [
    { label: "Total Projects", value: formatNumber(stats.totalProjects || 0), icon: FolderOpen, color: isLight ? "text-indigo-600" : "text-primary", bg: isLight ? "bg-indigo-50" : "bg-primary/10" },
    { label: "Active Projects", value: formatNumber(stats.activeProjects || 0), icon: FlaskConical, color: isLight ? "text-cyan-600" : "text-secondary", bg: isLight ? "bg-cyan-50" : "bg-secondary/10" },
    { label: "Completed Projects", value: formatNumber(stats.completedProjects || 0), icon: Award, color: isLight ? "text-emerald-600" : "text-green-400", bg: isLight ? "bg-emerald-50" : "bg-green-400/10" },
    { label: "Team Size", value: formatNumber(teamSize), icon: Users, color: isLight ? "text-purple-600" : "text-accent", bg: isLight ? "bg-purple-50" : "bg-accent/10" },
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

  const chartTypeBtn = (t: string, active: boolean) => cn(
    "px-2 py-0.5 rounded text-xs font-medium transition-all capitalize",
    active
      ? "bg-primary text-white shadow-sm"
      : isLight
        ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
        : "bg-white/5 text-muted-foreground hover:bg-white/10"
  );

  const primaryAreaColor = isLight ? '#4F46E5' : 'hsl(252, 89%, 65%)';

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className={cn("text-3xl font-display font-bold", isLight ? "text-gray-900" : "text-foreground")}>Intelligence Overview</h1>
        <p className={cn("mt-1 text-sm", isLight ? "text-gray-500" : "text-muted-foreground")}>Zentryx R&D metrics and project insights.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            key={kpi.label}
            className={cn("glass-card p-6 rounded-2xl flex items-start justify-between", isLight && "border border-slate-200")}
          >
            <div>
              <p className={cn("text-sm font-medium", isLight ? "text-gray-500" : "text-muted-foreground")}>{kpi.label}</p>
              <h3 className={cn("text-3xl font-bold font-display mt-2", isLight ? "text-gray-900" : "text-foreground")}>{kpi.value}</h3>
              {kpi.label === "Team Size" && (stats.teamSize || 0) > 500 && (
                <p className={cn("text-xs mt-1", isLight ? "text-gray-400" : "text-muted-foreground")}>(capped at 500)</p>
              )}
            </div>
            <div className={`p-3 rounded-xl ${kpi.bg}`}>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Velocity chart */}
        <div className={cn("lg:col-span-2 glass-card p-6 rounded-2xl flex flex-col", isLight && "border border-slate-200")}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={cn("text-lg font-semibold font-display", isLight ? "text-gray-900" : "")}> Innovation Velocity</h3>
            <span className={cn("text-xs", isLight ? "text-gray-400" : "text-muted-foreground")}>Drag handle to resize</span>
          </div>
          <div style={{ height: velocityResize.height }} className="transition-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyProjects || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cProj" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primaryAreaColor} stopOpacity={isLight ? 0.15 : 0.3}/>
                    <stop offset="95%" stopColor={primaryAreaColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="month" stroke={axisStroke} tick={{ fill: axisTickFill, fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis stroke={axisStroke} tick={{ fill: axisTickFill, fontSize: 12 }} tickLine={false} axisLine={false} />
                <RechartsTooltip {...TooltipStyle(isLight)} />
                <Area type="monotone" dataKey="projects" stroke={primaryAreaColor} strokeWidth={2} fillOpacity={1} fill="url(#cProj)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <ResizeHandle onMouseDown={velocityResize.onMouseDown} isLight={isLight} />
        </div>

        {/* Pipeline chart */}
        <div className={cn("glass-card p-6 rounded-2xl flex flex-col", isLight && "border border-slate-200")}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={cn("text-lg font-semibold font-display", isLight ? "text-gray-900" : "")}>Pipeline Distribution</h3>
            <span className={cn("text-xs", isLight ? "text-gray-400" : "text-muted-foreground")}>Drag ↕ to resize</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {(["pie", "donut", "bar", "histogram", "line"] as ChartType[]).map(t => (
              <button key={t} onClick={() => setPipelineChartType(t)} className={chartTypeBtn(t, pipelineChartType === t)}>
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
                  <RechartsTooltip {...TooltipStyle(isLight)} />
                </PieChart>
              ) : pipelineChartType === "donut" ? (
                <PieChart>
                  <Pie data={pipelineData} cx="50%" cy="50%" innerRadius="40%" outerRadius="70%" paddingAngle={4} dataKey="count" nameKey="stage" stroke="none">
                    {pipelineData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip {...TooltipStyle(isLight)} />
                </PieChart>
              ) : (
                <BarChart data={pipelineData} margin={{ top: 5, right: 5, bottom: 20, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="stage" stroke={axisStroke} tick={{ fill: axisTickFill, fontSize: 10 }} angle={-30} textAnchor="end" />
                  <YAxis stroke={axisStroke} tick={{ fill: axisTickFill, fontSize: 11 }} />
                  <RechartsTooltip {...TooltipStyle(isLight)} />
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
                <span className={cn("capitalize", isLight ? "text-gray-600" : "")}>{s.stage.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
          <ResizeHandle onMouseDown={pipelineResize.onMouseDown} isLight={isLight} />
        </div>
      </div>

      {/* Team Overview */}
      <div className={cn("glass-card p-6 rounded-2xl", isLight && "border border-slate-200")}>
        <div className="flex items-center justify-between mb-6">
          <h3 className={cn("text-lg font-semibold font-display", isLight ? "text-gray-900" : "")}>Team Overview</h3>
          <div className="flex gap-1">
            {(["list", "pie", "donut", "bar"] as TeamView[]).map(v => (
              <button key={v} onClick={() => setTeamView(v)} className={chartTypeBtn(v, teamView === v)}>{v}</button>
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
                    className={cn("w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                      selectedMember === u.id
                        ? isLight ? "bg-indigo-50 border border-indigo-200" : "bg-primary/10 border border-primary/20"
                        : isLight ? "hover:bg-slate-50 border border-transparent" : "hover:bg-white/5"
                    )}>
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm",
                      isLight
                        ? "bg-gradient-to-tr from-indigo-400 to-purple-500 text-white border border-indigo-200"
                        : "bg-gradient-to-tr from-secondary/50 to-primary/50 text-white border border-white/10"
                    )}>
                      {u.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn("font-medium text-sm", isLight ? "text-gray-900" : "text-foreground")}>{u.name}</div>
                      <div className={cn("text-xs capitalize", isLight ? "text-gray-500" : "text-muted-foreground")}>{u.role.replace(/_/g, ' ')}</div>
                    </div>
                    <div className={cn("text-xs px-2 py-0.5 rounded-full font-medium", isLight ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-primary/10 text-primary")}>{projectCount} proj</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                {teamView === "bar" ? (
                  <BarChart data={teamChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="name" stroke={axisStroke} tick={{ fill: axisTickFill, fontSize: 12 }} />
                    <YAxis stroke={axisStroke} tick={{ fill: axisTickFill, fontSize: 12 }} />
                    <RechartsTooltip {...TooltipStyle(isLight)} />
                    <Bar dataKey="projects" fill={COLORS[0]} radius={[4, 4, 0, 0]} onClick={(d: any) => setSelectedMember(d.id)} />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie data={teamChartData} cx="50%" cy="50%"
                      innerRadius={teamView === "donut" ? 50 : 0} outerRadius={100}
                      paddingAngle={4} dataKey="projects" nameKey="name" stroke="none"
                      onClick={(d: any) => setSelectedMember(d.id)}>
                      {teamChartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip {...TooltipStyle(isLight)} />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: isLight ? '#374151' : undefined }}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          <div>
            {selectedMember ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className={cn("font-semibold", isLight ? "text-gray-900" : "text-foreground")}>
                    {users?.find(u => u.id === selectedMember)?.name}'s Projects
                  </h4>
                  <button onClick={() => setSelectedMember(null)} className={cn("text-xs", isLight ? "text-gray-400 hover:text-gray-700" : "text-muted-foreground hover:text-foreground")}>Clear</button>
                </div>
                <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                  {memberProjects.length === 0 ? (
                    <p className={cn("text-sm py-4 text-center", isLight ? "text-gray-500" : "text-muted-foreground")}>No projects assigned.</p>
                  ) : memberProjects.map((p: any) => (
                    <Link key={p.id} href={`/projects/${p.id}`}
                      className={cn("flex items-center justify-between p-3 rounded-xl transition-colors group",
                        isLight ? "hover:bg-slate-50 border border-slate-200" : "hover:bg-white/5 border border-white/5"
                      )}>
                      <div className="flex-1 min-w-0">
                        <div className={cn("font-medium text-sm group-hover:text-primary transition-colors truncate", isLight ? "text-gray-900" : "text-foreground")}>{p.name}</div>
                        <div className={cn("text-xs capitalize", isLight ? "text-gray-500" : "text-muted-foreground")}>{p.stage?.replace(/_/g, ' ')}</div>
                      </div>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs border capitalize ${STATUS_COLORS[p.status] || (isLight ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-white/5 text-muted-foreground border-white/10")}`}>
                        {p.status?.replace(/_/g, ' ')}
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Users className={cn("w-12 h-12 mb-3 opacity-20", isLight ? "text-slate-400" : "text-muted-foreground")} />
                <p className={cn("text-sm", isLight ? "text-gray-500" : "text-muted-foreground")}>Select a team member to view their projects</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Projects Table */}
      <div className={cn("glass-card rounded-2xl overflow-hidden", isLight && "border border-slate-200")}>
        <div className={cn("p-6", isLight ? "border-b border-slate-200" : "border-b border-white/5")}>
          <h3 className={cn("text-lg font-semibold font-display", isLight ? "text-gray-900" : "")}>Recent Projects</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className={cn("text-xs uppercase", isLight ? "bg-slate-50 text-slate-500 border-b border-slate-200" : "text-muted-foreground bg-white/5")}>
              <tr>
                <th className="px-6 py-4 font-semibold">Project Name</th>
                <th className="px-6 py-4 font-semibold">Stage</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Progress</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isLight ? "divide-slate-100" : "divide-white/5")}>
              {(stats.recentProjects || []).slice(0, 5).map((project: any) => (
                <tr key={project.id} className={cn("transition-colors", isLight ? "hover:bg-slate-50" : "hover:bg-white/[0.02]")}>
                  <td className={cn("px-6 py-4 font-medium", isLight ? "text-gray-900" : "text-foreground")}>
                    <Link href={`/projects/${project.id}`} className={cn("hover:text-primary transition-colors", isLight ? "text-gray-900" : "")}>{project.name}</Link>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={cn("capitalize text-xs", isLight ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-white/5")}>{project.stage?.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs border capitalize ${STATUS_COLORS[project.status] || (isLight ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-white/5 text-muted-foreground border-white/10")}`}>
                      {project.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 w-full max-w-[150px]">
                      <div className={cn("h-2 w-full rounded-full overflow-hidden", isLight ? "bg-slate-100" : "bg-black/40")}>
                        <div className="h-full bg-primary rounded-full" style={{ width: `${project.taskCount > 0 ? (project.completedTaskCount / project.taskCount) * 100 : 0}%` }} />
                      </div>
                      <span className={cn("text-xs w-8", isLight ? "text-gray-500" : "text-muted-foreground")}>
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
