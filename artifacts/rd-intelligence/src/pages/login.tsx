import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Lock, Mail, User, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL;

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("admin@rnd.com");
  const [password, setPassword] = useState("admin123");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [_, setLocation] = useLocation();
  const { setToken } = useAuthStore();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ data: { email, password } }, {
      onSuccess: (data) => {
        setToken(data.token);
        toast({ title: "Welcome back!", description: `Signed in as ${data.user.name}` });
        setLocation("/");
      },
      onError: () => {
        setError("Invalid email or password. Please try again.");
      }
    });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      setToken(data.token);
      toast({ title: "Account created!", description: `Welcome to Zentryx, ${data.user.name}` });
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: "login" | "signup") => {
    setMode(m);
    setError("");
    if (m === "login") { setEmail("admin@rnd.com"); setPassword("admin123"); setName(""); setConfirmPassword(""); }
    else { setEmail(""); setPassword(""); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-background">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md p-8 sm:p-10 glass-panel rounded-3xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/30 mb-6">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Zentryx</h1>
          <p className="text-muted-foreground mt-1 text-center text-sm">R&D Intelligence Suite</p>
        </div>

        <div className="flex p-1 bg-white/5 rounded-xl mb-6">
          <button
            onClick={() => switchMode("login")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === "login" ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
          >Sign In</button>
          <button
            onClick={() => switchMode("signup")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === "signup" ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
          >Create Account</button>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, x: mode === "login" ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={mode === "login" ? handleLogin : handleSignup}
            className="space-y-4"
          >
            {mode === "signup" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input type="text" value={name} onChange={e => setName(e.target.value)} required className="pl-10 h-12" placeholder="Jane Smith" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="pl-10 h-12" placeholder="name@company.com" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="pl-10 h-12" placeholder="••••••••" />
              </div>
            </div>

            {mode === "signup" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="pl-10 h-12" placeholder="••••••••" />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold mt-2"
              disabled={loginMutation.isPending || loading}
            >
              {(loginMutation.isPending || loading) ? "Please wait..." : mode === "login" ? "Sign In to Workspace" : "Create Account"}
            </Button>
          </motion.form>
        </AnimatePresence>

        {mode === "login" && (
          <div className="mt-4 p-3 bg-white/5 rounded-xl text-xs text-muted-foreground text-center">
            <span className="font-medium text-foreground">Demo:</span> admin@rnd.com / admin123
          </div>
        )}
      </motion.div>
    </div>
  );
}
