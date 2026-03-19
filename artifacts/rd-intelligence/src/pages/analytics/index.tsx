import { useState } from "react";
import { useGetTrends, useRunCostSimulation, useGetAiSuggestions } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/spinner";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from "recharts";
import { BrainCircuit, Calculator, LineChart as ChartIcon, Sparkles } from "lucide-react";

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<'trends' | 'simulator' | 'ai'>('trends');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <ChartIcon className="w-8 h-8 text-primary" /> Advanced Analytics
        </h1>
        <p className="text-muted-foreground mt-1">Data-driven insights for formulation optimization.</p>
      </div>

      <div className="flex gap-2 p-1 bg-white/5 rounded-xl w-fit">
        <TabButton active={activeTab === 'trends'} onClick={() => setActiveTab('trends')} icon={ChartIcon} label="Market Trends" />
        <TabButton active={activeTab === 'simulator'} onClick={() => setActiveTab('simulator')} icon={Calculator} label="Cost Simulator" />
        <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={BrainCircuit} label="AI Suggestions" />
      </div>

      <div className="mt-8">
        {activeTab === 'trends' && <TrendsTab />}
        {activeTab === 'simulator' && <CostSimulatorTab />}
        {activeTab === 'ai' && <AiSuggestionsTab />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function TrendsTab() {
  const { data: trends, isLoading } = useGetTrends();

  if (isLoading) return <div className="h-[400px] flex items-center justify-center"><PageLoader /></div>;
  if (!trends) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-card p-6 rounded-2xl">
        <h3 className="text-lg font-semibold mb-6 font-display">Success Rate by Category</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trends.successByCategory} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={12} unit="%" />
              <YAxis dataKey="category" type="category" stroke="rgba(255,255,255,0.8)" fontSize={12} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: 'rgba(15, 17, 26, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
              />
              <Bar dataKey="successRate" fill="hsl(252, 89%, 65%)" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-6 rounded-2xl">
        <h3 className="text-lg font-semibold mb-6 font-display">Sensory vs Success Correlation</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" dataKey="overallScore" name="Sensory Score" stroke="rgba(255,255,255,0.3)" domain={[0, 10]} />
              <YAxis type="number" dataKey="successRate" name="Success %" stroke="rgba(255,255,255,0.3)" unit="%" />
              <ZAxis type="number" range={[60, 400]} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{ backgroundColor: 'rgba(15, 17, 26, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
              />
              <Scatter name="Formulations" data={trends.sensoryCorrelation} fill="hsl(190, 90%, 50%)" opacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">Correlation showing formulations with higher overall sensory scores have higher market success probability.</p>
      </div>
    </div>
  );
}

function CostSimulatorTab() {
  return (
    <div className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center min-h-[400px] text-center border-dashed border-2 border-white/10">
      <Calculator className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
      <h3 className="text-xl font-semibold mb-2">Cost Impact Simulator</h3>
      <p className="text-muted-foreground max-w-md">Select a formulation and adjust ingredient market prices to simulate impact on unit economics and margins.</p>
      <button className="mt-6 px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors">
        Select Formulation to Begin
      </button>
    </div>
  );
}

function AiSuggestionsTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold font-display">Optimization Goal</h3>
        </div>
        <div className="space-y-2">
           <label className="text-sm text-muted-foreground">Target Profile</label>
           <textarea className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm min-h-[100px] focus:outline-none focus:ring-1 focus:ring-accent" placeholder="e.g. Increase protein content while maintaining current texture profile..."></textarea>
        </div>
        <div className="space-y-2">
           <label className="text-sm text-muted-foreground">Constraints</label>
           <textarea className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm min-h-[100px] focus:outline-none focus:ring-1 focus:ring-accent" placeholder="e.g. Must be vegan, max cost $0.50/unit..."></textarea>
        </div>
        <button className="w-full py-3 bg-gradient-to-r from-accent to-primary rounded-xl font-semibold text-white shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all flex items-center justify-center gap-2">
          <BrainCircuit className="w-4 h-4" /> Generate Intelligence
        </button>
      </div>

      <div className="lg:col-span-2 glass-panel rounded-2xl relative overflow-hidden flex items-center justify-center min-h-[400px]">
        <img src={`${import.meta.env.BASE_URL}images/ai-glow.png`} alt="AI Core" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-screen" />
        <div className="relative z-10 text-center">
           <p className="text-muted-foreground font-mono text-sm">AWAITING INPUT PARAMETERS</p>
        </div>
      </div>
    </div>
  );
}
