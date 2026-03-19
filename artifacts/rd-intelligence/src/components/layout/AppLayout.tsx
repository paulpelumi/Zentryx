import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, FlaskConical, LineChart, Users, Bell, Activity,
  Search, LogOut, Menu, X, MessageSquare, Briefcase, Sun, Moon, Zap
} from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useGetCurrentUser, useListNotifications } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Project Portfolio", icon: FlaskConical },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/team", label: "Team Directory", icon: Users },
  { href: "/activity", label: "Activity Feed", icon: Activity },
  { href: "/business-dev", label: "Business Development", icon: Briefcase },
  { href: "/chat", label: "Chat Room", icon: MessageSquare },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: user } = useGetCurrentUser();
  const { data: notifications } = useListNotifications();
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const isLight = theme === "light";

  return (
    <div className={cn("min-h-screen flex flex-col md:flex-row overflow-hidden", isLight ? "bg-slate-100" : "bg-background")}>
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        isLight ? "bg-white border-slate-200 shadow-lg" : "glass-panel border-white/5"
      )}>
        <div className={cn("h-16 flex items-center px-6 border-b", isLight ? "border-slate-100" : "border-white/5")}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
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
              return (
                <Link 
                  key={item.href} href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group font-medium",
                    isActive 
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-inner" 
                      : isLight 
                        ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "text-primary")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className={cn("p-4 border-t", isLight ? "border-slate-100" : "border-white/5")}>
          <div className={cn("rounded-xl p-3 flex items-center gap-3", isLight ? "bg-slate-50 border border-slate-100" : "glass-card")}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-secondary to-primary flex items-center justify-center text-white font-bold shadow-md text-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
            <button onClick={logout} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className={cn(
          "h-16 flex items-center justify-between px-4 sm:px-6 z-40 sticky top-0 border-b",
          isLight ? "bg-white/90 backdrop-blur-xl border-slate-200 shadow-sm" : "glass-panel border-white/5"
        )}>
          <div className="flex items-center gap-4 flex-1">
            <button className="md:hidden p-2 text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <form onSubmit={handleSearch} className="max-w-md w-full relative hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search Zentryx..." 
                className={cn(
                  "w-full border rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground placeholder:text-muted-foreground",
                  isLight ? "bg-slate-100 border-slate-200 focus:bg-white" : "bg-black/20 border-white/10 focus:bg-black/40"
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={cn(
                "p-2 rounded-full transition-colors",
                isLight ? "hover:bg-slate-100 text-slate-600" : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
              )}
              title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <Link href="/notifications" className={cn(
              "relative p-2 rounded-full transition-colors",
              isLight ? "hover:bg-slate-100 text-slate-600" : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
            )}>
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full shadow-[0_0_8px_rgba(255,0,0,0.8)] animate-pulse" />
              )}
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
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
