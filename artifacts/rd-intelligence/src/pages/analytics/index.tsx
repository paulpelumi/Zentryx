import { useState, useRef, useEffect } from "react";
import { useListProjects } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/spinner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { TrendingUp, BarChart2, Send, Bot, User, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL;
const COLORS = ['hsl(252,89%,65%)', 'hsl(190,90%,50%)', 'hsl(280,80%,60%)', 'hsl(320,80%,60%)', 'hsl(150,80%,50%)', 'hsl(50,90%,55%)', 'hsl(10,80%,60%)', 'hsl(230,80%,60%)'];
const CHART_STYLE = {
  contentStyle: { backgroundColor: 'rgba(15,17,26,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px' },
  itemStyle: { color: '#fff' },
};

const PRODUCT_TYPES = ["Seasoning", "Snack Dusting", "Bread & Dough Premix", "Dairy Premix", "Functional Blend", "Pasta Sauce", "Sweet Flavour", "Savoury Flavour"];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function Analytics() {
  const { data: projects, isLoading } = useListProjects({});
  const [activeTab, setActiveTab] = useState<"overview" | "ai_chat">("overview");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm your AI R&D analyst. I can help with product formulation strategies, stage analysis, ingredient optimization, cost reduction, and market insights. What would you like to explore?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (isLoading) return <PageLoader />;

  const projectsList = projects || [];

  const byProductType = PRODUCT_TYPES.map(type => ({
    name: type,
    count: projectsList.filter(p => p.productType === type).length,
    approved: projectsList.filter(p => p.productType === type && p.status === "approved").length,
    inProgress: projectsList.filter(p => p.productType === type && p.status === "in_progress").length,
  })).filter(d => d.count > 0);

  const byStage = Object.entries(
    projectsList.reduce((acc: Record<string, number>, p) => {
      acc[p.stage] = (acc[p.stage] || 0) + 1;
      return acc;
    }, {})
  ).map(([stage, count]) => ({ stage: stage.replace(/_/g, ' '), count }));

  const byStatus = Object.entries(
    projectsList.reduce((acc: Record<string, number>, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({ status: status.replace(/_/g, ' '), count }));

  const radarData = PRODUCT_TYPES.slice(0, 6).map(type => ({
    subject: type.length > 12 ? type.slice(0, 12) + '…' : type,
    A: projectsList.filter(p => p.productType === type && p.status === "approved").length,
    B: projectsList.filter(p => p.productType === type && p.status === "in_progress").length,
  }));

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user" as const, content: chatInput.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch(`${BASE}api/ai-chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("rd_token")}` },
        body: JSON.stringify({
          message: userMsg.content,
          history: chatMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error("API error");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No stream");

      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const token = JSON.parse(data)?.choices?.[0]?.delta?.content || "";
              accumulated += token;
              setChatMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: accumulated };
                return updated;
              });
            } catch {}
          }
        }
      }
    } catch {
      setChatMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Sorry, I encountered an error. Please check that the AI integration is configured and try again." };
        return updated;
      });
    } finally {
      setChatLoading(false);
    }
  };

  const clearChat = () => {
    setChatMessages([{ role: "assistant", content: "Hi! I'm your AI R&D analyst. I can help with product formulation strategies, stage analysis, ingredient optimization, cost reduction, and market insights. What would you like to explore?" }]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Analytics & AI Intelligence</h1>
        <p className="text-muted-foreground mt-1">Insights, metrics, and live AI-powered analysis for your R&D pipeline.</p>
      </div>

      <div className="flex gap-2 p-1 bg-white/5 rounded-xl w-fit">
        <button onClick={() => setActiveTab("overview")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "overview" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
          <BarChart2 className="w-4 h-4" /> Overview
        </button>
        <button onClick={() => setActiveTab("ai_chat")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "ai_chat" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
          <Sparkles className="w-4 h-4" /> AI Analyst
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Projects", value: projectsList.length, color: "text-primary" },
              { label: "Approved", value: projectsList.filter(p => p.status === "approved").length, color: "text-green-400" },
              { label: "In Progress", value: projectsList.filter(p => p.status === "in_progress").length, color: "text-blue-400" },
              { label: "Pushed to Live", value: projectsList.filter(p => p.status === "pushed_to_live").length, color: "text-emerald-400" },
            ].map(kpi => (
              <div key={kpi.label} className="glass-card p-5 rounded-2xl">
                <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                <p className={`text-3xl font-bold font-display ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6 rounded-2xl">
              <h3 className="text-base font-semibold font-display mb-4">Projects by Product Category</h3>
              {byProductType.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byProductType} margin={{ top: 5, right: 5, bottom: 70, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} angle={-35} textAnchor="end" interval={0} />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                      <RechartsTooltip {...CHART_STYLE} />
                      <Bar dataKey="count" name="Projects" radius={[4,4,0,0]}>
                        {byProductType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState label="No product type data. Assign product types to projects." />}
            </div>

            <div className="glass-card p-6 rounded-2xl">
              <h3 className="text-base font-semibold font-display mb-4">Stage Distribution</h3>
              {byStage.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byStage} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="count" nameKey="stage" stroke="none">
                        {byStage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip {...CHART_STYLE} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState label="No stage data available yet" />}
            </div>

            <div className="glass-card p-6 rounded-2xl">
              <h3 className="text-base font-semibold font-display mb-4">Status Breakdown</h3>
              {byStatus.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byStatus} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} />
                      <YAxis type="category" dataKey="status" stroke="rgba(255,255,255,0.3)" fontSize={11} width={100} />
                      <RechartsTooltip {...CHART_STYLE} />
                      <Bar dataKey="count" name="Count" radius={[0,4,4,0]}>
                        {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState label="No status data" />}
            </div>

            <div className="glass-card p-6 rounded-2xl">
              <h3 className="text-base font-semibold font-display mb-4">Category Performance Radar</h3>
              {radarData.some(d => d.A > 0 || d.B > 0) ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                      <PolarRadiusAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
                      <Radar name="Approved" dataKey="A" stroke="hsl(150,80%,50%)" fill="hsl(150,80%,50%)" fillOpacity={0.2} />
                      <Radar name="In Progress" dataKey="B" stroke="hsl(190,90%,50%)" fill="hsl(190,90%,50%)" fillOpacity={0.2} />
                      <Legend />
                      <RechartsTooltip {...CHART_STYLE} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState label="Assign product types to projects to see the radar" />}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl flex flex-col" style={{ height: "calc(100vh - 18rem)", minHeight: "500px" }}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold font-display text-foreground">AI R&D Analyst</h3>
                <p className="text-xs text-muted-foreground">Powered by GPT · Streaming live responses</p>
              </div>
            </div>
            <button onClick={clearChat} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
              <RefreshCw className="w-3.5 h-3.5" /> Clear
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-4">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "user" ? "bg-primary" : "bg-gradient-to-br from-primary to-accent"}`}>
                  {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
                <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-primary text-white rounded-tr-sm" : "bg-white/[0.07] text-foreground rounded-tl-sm"}`}>
                  {msg.content ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className="flex gap-1.5 items-center py-1 px-1">
                      <span className="w-2 h-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="px-6 py-4 border-t border-white/5 shrink-0">
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                "Analyze our R&D portfolio trends",
                "Cost optimization for Seasoning line",
                "Dairy Premix reformulation tips",
                "Predict pipeline success rates",
              ].map(prompt => (
                <button key={prompt} onClick={() => setChatInput(prompt)}
                  className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-muted-foreground hover:text-foreground transition-colors">
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask your AI R&D analyst anything..."
                disabled={chatLoading}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground disabled:opacity-60"
              />
              <Button onClick={sendMessage} disabled={chatLoading || !chatInput.trim()} className="gap-2 h-11 px-5">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
      <div className="text-center">
        <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-20" />
        <p>{label}</p>
      </div>
    </div>
  );
}
