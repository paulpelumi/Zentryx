import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useRouter } from "wouter";
import {
  LayoutDashboard, FlaskConical, LineChart, Users, Bell, Activity,
  Search, LogOut, Menu, X, MessageSquare, Briefcase, Sun, Moon, Zap,
  ChevronDown, User, FlaskConical as Flask, CheckSquare, Building2,
  ArrowRight, Loader2, CalendarDays, UserCircle, TrendingUp, ClipboardList
} from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useGetCurrentUser, useListNotifications } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL;

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Project Portfolio", icon: FlaskConical },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/weekly-activities", label: "Weekly Activities", icon: ClipboardList },
  { href: "/sales-force", label: "Sales Force", icon: TrendingUp },
  { href: "/team", label: "Team Directory", icon: Users },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/activity", label: "Activity Feed", icon: Activity },
  { href: "/business-dev", label: "Business Development", icon: Briefcase },
  { href: "/chat", label: "Chat Room", icon: MessageSquare },
  { href: "/profile", label: "My Profile", icon: UserCircle },
];

function useAvatarColor(name: string) {
  const colors = [
    "from-violet-500 to-purple-600", "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600", "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600", "from-indigo-500 to-blue-600",
  ];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  return colors[idx];
}

function UserMenu({ user, logout, isLight }: { user: any; logout: () => void; isLight: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const gradient = useAvatarColor(user?.name || "");

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border transition-all hover:shadow-lg",
          isLight ? "border-slate-200 bg-white hover:border-slate-300" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8",
        )}
      >
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs shadow-md ring-2 ring-white/10`}>
          {initials}
        </div>
        <div className="hidden sm:block text-left leading-tight">
          <p className="text-xs font-semibold text-foreground leading-tight">{user?.name?.split(" ")[0] || "User"}</p>
          <p className={cn("text-[10px] capitalize leading-tight", isLight ? "text-slate-500" : "text-muted-foreground")}>
            {user?.role?.replace(/_/g, " ") || "Member"}
          </p>
        </div>
        <ChevronDown className={cn("w-3 h-3 transition-transform", isLight ? "text-slate-400" : "text-muted-foreground", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className={cn("absolute right-0 top-full mt-2 w-64 rounded-2xl border z-50 overflow-hidden",
              isLight
                ? "border-white/50 shadow-[0_16px_48px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.9)]"
                : "glass-panel border-white/10 shadow-2xl",
              isLight && "backdrop-blur-2xl saturate-200"
            )}
            style={isLight ? { background: "rgba(255,255,255,0.82)" } : undefined}
          >
            <div className={cn("p-4 border-b", isLight ? "border-slate-100" : "border-white/5")}>
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{user?.name}</p>
                  <p className={cn("text-xs capitalize mt-0.5", isLight ? "text-slate-500" : "text-muted-foreground")}>{user?.role?.replace(/_/g, " ")}</p>
                  <p className={cn("text-[11px] mt-1 truncate", isLight ? "text-slate-400" : "text-muted-foreground/60")}>{user?.email}</p>
                </div>
              </div>
              <div className={cn("mt-3 flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg w-fit", isLight ? "bg-emerald-50 text-emerald-600" : "bg-green-500/10 text-green-400")}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" /> Active
              </div>
            </div>
            <div className="p-2">
              <Link href="/profile" onClick={() => setOpen(false)}
                className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors", isLight ? "text-slate-600 hover:bg-slate-50" : "text-muted-foreground hover:bg-white/5 hover:text-foreground")}>
                <User className="w-4 h-4" /> Edit Profile
              </Link>
              <button onClick={() => { logout(); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-destructive hover:bg-destructive/10 mt-1">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string; href: (item: any) => string }> = {
  projects: { label: "Projects", icon: FlaskConical, color: "text-purple-400", href: (p) => `/projects/${p.id}` },
  tasks: { label: "Tasks", icon: CheckSquare, color: "text-blue-400", href: (t) => `/projects/${t.projectId}` },
  formulations: { label: "Formulations", icon: Flask, color: "text-teal-400", href: (f) => `/projects/${f.projectId}` },
  team: { label: "Team", icon: Users, color: "text-amber-400", href: () => `/team` },
  deals: { label: "Business Dev", icon: Building2, color: "text-rose-400", href: () => `/business-dev` },
};

function GlobalSearch({ isLight }: { isLight: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults(null); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE}api/search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("rd_token")}` }
        });
        const data = await res.json();
        setResults(data);
        setOpen(true);
      } catch {} finally { setLoading(false); }
    }, 300);
  }, [query]);

  const totalResults = results ? Object.values(results).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0) : 0;

  const handleSelect = (href: string) => {
    setQuery(""); setOpen(false); setResults(null);
    navigate(href);
  };

  return (
    <div className="relative max-w-md w-full" ref={ref}>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        {loading && <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />}
        <input
          type="text"
          placeholder="Search projects, tasks, team, deals..."
          className={cn(
            "w-full border rounded-full pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground placeholder:text-muted-foreground",
            isLight ? "bg-slate-100 border-slate-200 focus:bg-white" : "bg-black/20 border-white/10 focus:bg-black/40"
          )}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (results && totalResults > 0) setOpen(true); }}
          onKeyDown={e => { if (e.key === "Escape") { setQuery(""); setOpen(false); } }}
        />
      </div>

      <AnimatePresence>
        {open && results && totalResults > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute top-full left-0 mt-2 w-full min-w-[420px] rounded-2xl border z-50 overflow-hidden max-h-[70vh] overflow-y-auto",
              isLight ? "backdrop-blur-2xl border-white/50 shadow-[0_16px_48px_rgba(0,0,0,0.10)]" : "glass-panel border-white/10 shadow-2xl"
            )}
            style={isLight ? { background: "rgba(255,255,255,0.88)" } : undefined}
          >
            <div className={cn("px-4 py-2.5 border-b flex items-center justify-between", isLight ? "border-white/40" : "border-white/5")}>
              <span className="text-xs text-muted-foreground">{totalResults} result{totalResults !== 1 ? "s" : ""} for <span className="text-foreground font-medium">"{query}"</span></span>
              <button onClick={() => { setQuery(""); setOpen(false); }} className="text-muted-foreground hover:text-foreground p-0.5"><X className="w-3.5 h-3.5" /></button>
            </div>

            {Object.entries(CATEGORY_META).map(([key, meta]) => {
              const items: any[] = results[key] || [];
              if (items.length === 0) return null;
              const Icon = meta.icon;
              return (
                <div key={key} className={cn("border-b last:border-0", isLight ? "border-slate-100/60" : "border-white/5")}>
                  <div className="px-4 py-2 flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                  </div>
                  {items.map((item, i) => {
                    const href = meta.href(item);
                    const title = item.name || item.title || item.label || "Untitled";
                    const subtitle = item.customerName || item.clientName || item.status || item.stage || item.department || item.role || "";
                    return (
                      <button key={i} onClick={() => handleSelect(href)}
                        className={cn("w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors group",
                          isLight ? "hover:bg-violet-50/60" : "hover:bg-white/5"
                        )}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{title}</p>
                          {subtitle && <p className="text-xs text-muted-foreground truncate capitalize">{subtitle.toString().replace(/_/g, " ")}</p>}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </motion.div>
        )}
        {open && results && totalResults === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={cn("absolute top-full left-0 mt-2 w-full rounded-2xl border z-50 p-6 text-center backdrop-blur-2xl",
              isLight ? "border-white/50 shadow-[0_12px_40px_rgba(0,0,0,0.08)]" : "glass-panel border-white/10 shadow-2xl"
            )}
            style={isLight ? { background: "rgba(255,255,255,0.88)" } : undefined}>
            <p className="text-sm text-muted-foreground">No results for <span className="text-foreground font-medium">"{query}"</span></p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(false);

  const { data: user } = useGetCurrentUser();
  const { data: notifications } = useListNotifications();
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  const isLight = theme === "light";

  useEffect(() => {
    const check = () => setChatUnread(!!localStorage.getItem("rd_chat_unread"));
    check();
    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (location === "/chat") { localStorage.removeItem("rd_chat_unread"); setChatUnread(false); }
  }, [location]);

  return (
    <div className={cn("min-h-screen flex flex-col md:flex-row overflow-hidden", isLight ? "light-app-bg" : "bg-background")}>
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        isLight ? "light-sidebar" : "glass-panel border-white/5"
      )}>
        <div className={cn("h-16 flex items-center px-6 border-b", isLight ? "border-white/40" : "border-white/5")}>
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30", isLight && "logo-glow")}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-wide text-gradient">Zentryx</span>
          </div>
          <button className="md:hidden ml-auto text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const isChatWithUnread = item.href === "/chat" && chatUnread && !isActive;
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group font-medium relative",
                    isActive
                      ? isLight ? "light-nav-active" : "bg-primary/10 text-primary border border-primary/20 shadow-inner"
                      : isLight ? "light-nav-item" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="relative">
                    <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "text-primary")} />
                    {isChatWithUnread && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_6px_rgba(239,68,68,0.8)] animate-pulse" />}
                  </div>
                  {item.label}
                  {isChatWithUnread && <span className="ml-auto text-[9px] font-bold text-red-400 uppercase tracking-wider">New</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className={cn(
          "h-16 flex items-center justify-between px-4 sm:px-6 z-40 sticky top-0 border-b gap-3",
          isLight ? "light-header" : "glass-panel border-white/5"
        )}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button className="md:hidden p-2 text-muted-foreground hover:text-foreground shrink-0" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>

            {/* Welcome Greeting */}
            {user?.name && (
              <div className="hidden lg:flex flex-col leading-tight shrink-0">
                <span className="text-[11px] text-muted-foreground">{getGreeting()},</span>
                <span className="text-sm font-semibold text-foreground leading-tight">{user.name.split(" ")[0]} 👋</span>
              </div>
            )}

            {user?.name && <div className="hidden lg:block w-px h-6 bg-white/10 shrink-0" />}

            <div className="hidden sm:block flex-1 min-w-0">
              <GlobalSearch isLight={isLight} />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={toggleTheme}
              className={cn("p-2 rounded-full transition-colors", isLight ? "hover:bg-slate-100 text-slate-600" : "hover:bg-white/10 text-muted-foreground hover:text-foreground")}
              title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}>
              {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <Link href="/notifications" className={cn("relative p-2 rounded-full transition-colors",
              isLight ? "hover:bg-slate-100 text-slate-600" : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
            )}>
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full shadow-[0_0_8px_rgba(255,0,0,0.8)] animate-pulse" />}
            </Link>

            <UserMenu user={user} logout={logout} isLight={isLight} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 relative">
          <AnimatePresence mode="wait">
            <motion.div key={location} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="max-w-7xl mx-auto">
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  );
}
