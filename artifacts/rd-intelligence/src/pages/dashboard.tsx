import { useGetDashboardStats } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/spinner";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import { FlaskConical, Target, TrendingUp, Clock, DollarSign, Users, Award, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const COLORS = ['hsl(252, 89%, 65%)', 'hsl(190, 90%, 50%)', 'hsl(280, 80%, 60%)', 'hsl(320, 80%, 60%)', 'hsl(150, 80%, 50%)'];

export default function Dashboard() {
  const { data: stats, isLoading, error } = useGetDashboardStats();

  if (isLoading) return <PageLoader />;
  if (error || !stats) return <div className="p-8 text-destructive">Failed to load dashboard data.</div>;

  const kpis = [
    { label: "Active Projects", value: stats.activeProjects, icon: FlaskConical, color: "text-primary", bg: "bg-primary/10" },
    { label: "Success Rate", value: `${stats.successRate}%`, icon: Target, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Avg Time to Market", value: `${stats.avgTimeToMarket}d`, icon: Clock, color: "text-secondary", bg: "bg-secondary/10" },
    { label: "Revenue Impact", value: formatCurrency(stats.totalRevenueImpact), icon: DollarSign, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  ];

  const secondaryKpis = [
    { label: "Total Formulations", value: stats.totalFormulations, icon: BeakerIcon },
    { label: "Approved Formulations", value: stats.approvedFormulations, icon: CheckCircle2 },
    { label: "Completed Projects", value: stats.completedProjects, icon: Award },
    { label: "R&D Team Size", value: stats.teamSize, icon: Users },
  ];

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Intelligence Overview</h1>
        <p className="text-muted-foreground mt-1">High-level metrics across all R&D operations.</p>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={kpi.label} 
            className="glass-card p-6 rounded-2xl flex items-start justify-between"
          >
            <div>
              <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
              <h3 className="text-3xl font-bold font-display text-foreground mt-2">{kpi.value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${kpi.bg}`}>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {secondaryKpis.map((kpi, i) => (
          <div key={kpi.label} className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center gap-4">
            <kpi.icon className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">{formatNumber(kpi.value)}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-6 font-display">Innovation Velocity</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyProjects} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(252, 89%, 65%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(252, 89%, 65%)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFormulations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(190, 90%, 50%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(190, 90%, 50%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 17, 26, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="projects" stroke="hsl(252, 89%, 65%)" strokeWidth={2} fillOpacity={1} fill="url(#colorProjects)" />
                <Area type="monotone" dataKey="formulations" stroke="hsl(190, 90%, 50%)" strokeWidth={2} fillOpacity={1} fill="url(#colorFormulations)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Stages */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-6 font-display">Pipeline Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.projectsByStage}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="stage"
                  stroke="none"
                >
                  {stats.projectsByStage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 17, 26, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {stats.projectsByStage.map((stage, i) => (
              <div key={stage.stage} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="capitalize">{stage.stage.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-lg font-semibold font-display">Active Priority Projects</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-white/5 uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Project Name</th>
                <th className="px-6 py-4 font-medium">Stage</th>
                <th className="px-6 py-4 font-medium">Priority</th>
                <th className="px-6 py-4 font-medium">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.recentProjects.slice(0, 5).map((project) => (
                <tr key={project.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{project.name}</td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="capitalize bg-white/5">{project.stage.replace('_', ' ')}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={project.priority === 'high' || project.priority === 'critical' ? 'destructive' : 'default'} className="capitalize">
                      {project.priority}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 w-full max-w-[150px]">
                      <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full" 
                          style={{ width: `${project.taskCount > 0 ? (project.completedTaskCount / project.taskCount) * 100 : 0}%` }}
                        />
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

// Icon placeholder
function BeakerIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4.5 3h15"/><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"/><path d="M6 14h12"/></svg>;
}
