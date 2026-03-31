import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { Camera, User, Mail, Phone, Globe, Building2, Briefcase, Lock, Save, X, Eye, EyeOff, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

const BASE = import.meta.env.BASE_URL;

const COUNTRIES = [
  "Nigeria", "South Africa", "Kenya", "Ghana", "Ethiopia", "Tanzania", "Uganda",
  "United Kingdom", "United States", "Canada", "Australia", "Germany", "France",
  "India", "China", "Brazil", "Mexico", "UAE", "Saudi Arabia", "Other"
];

const DEPARTMENTS = [
  "NPD", "Marketing & Sales", "Account Management", "Finance", "Procurement",
  "Quality Control", "Operations", "Research & Development", "Human Resources", "IT"
];

function AvatarUploader({ avatar, name, onChange }: { avatar: string | null; name: string; onChange: (v: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const gradient = (() => {
    const colors = ["from-violet-500 to-purple-600", "from-blue-500 to-cyan-600", "from-emerald-500 to-teal-600", "from-rose-500 to-pink-600", "from-amber-500 to-orange-600"];
    return colors[name ? name.charCodeAt(0) % colors.length : 0];
  })();
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Image must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = ev => onChange(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
        <div className={`w-24 h-24 rounded-2xl overflow-hidden shadow-xl ring-4 ring-white/10 ${!avatar ? `bg-gradient-to-br ${gradient}` : ""} flex items-center justify-center`}>
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-3xl">{initials}</span>
          )}
        </div>
        <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => inputRef.current?.click()}
          className="text-xs text-primary hover:text-primary/80 underline">
          Upload photo
        </button>
        {avatar && (
          <button type="button" onClick={() => onChange(null)}
            className="text-xs text-destructive hover:text-destructive/80 underline">
            Remove
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">JPG, PNG — max 2MB</p>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}

function FieldRow({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { data: currentUser, isLoading } = useGetCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const inputCls = cn(
    "w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground",
    isLight ? "border-gray-200 bg-white text-gray-900" : "border-white/10 bg-black/30 text-foreground"
  );
  const selectCls = inputCls + " cursor-pointer";

  const [form, setForm] = useState({ name: "", department: "", jobPosition: "", phone: "", country: "", avatar: null as string | null });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const u = currentUser as any;
      setForm({
        name: u.name || "",
        department: u.department || "",
        jobPosition: u.jobPosition || "",
        phone: u.phone || "",
        country: u.country || "",
        avatar: u.avatar || null,
      });
    }
  }, [currentUser]);

  const setF = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem("rd_token");
      const res = await fetch(`${BASE}api/users/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDirty(false);
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (currentUser) {
      const u = currentUser as any;
      setForm({ name: u.name || "", department: u.department || "", jobPosition: u.jobPosition || "", phone: u.phone || "", country: u.country || "", avatar: u.avatar || null });
      setDirty(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!pwForm.current) { toast({ title: "Enter your current password", variant: "destructive" }); return; }
    if (pwForm.next.length < 6) { toast({ title: "New password must be at least 6 characters", variant: "destructive" }); return; }
    if (pwForm.next !== pwForm.confirm) { toast({ title: "New passwords do not match", variant: "destructive" }); return; }
    setSavingPw(true);
    try {
      const token = localStorage.getItem("rd_token");
      const res = await fetch(`${BASE}api/users/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.message || "Failed to change password", variant: "destructive" }); return; }
      setPwForm({ current: "", next: "", confirm: "" });
      toast({ title: "Password changed", description: "Your password has been updated." });
    } catch {
      toast({ title: "Failed to change password", variant: "destructive" });
    } finally {
      setSavingPw(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!currentUser) return null;

  const u = currentUser as any;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <User className="w-8 h-8 text-primary" /> My Profile
        </h1>
        <p className="text-muted-foreground mt-1">Manage your personal information and account settings.</p>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-6">
        <div className={`flex flex-col sm:flex-row gap-6 items-start sm:items-center border-b pb-6 ${isLight ? "border-gray-200" : "border-white/5"}`}>
          <AvatarUploader avatar={form.avatar} name={form.name} onChange={v => setF("avatar", v)} />
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold text-foreground">{u.name}</p>
            <p className="text-sm text-muted-foreground capitalize mt-0.5">{u.role?.replace(/_/g, " ")}</p>
            <p className="text-xs text-muted-foreground mt-1">{u.email}</p>
            <div className={cn("mt-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium", isLight ? "bg-emerald-50 text-emerald-600" : "bg-green-500/10 text-green-400")}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" /> Active Account
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FieldRow label="Full Name" icon={<User className="w-3.5 h-3.5" />}>
            <input value={form.name} onChange={e => setF("name", e.target.value)} placeholder="Your full name" className={inputCls} />
          </FieldRow>

          <FieldRow label="Email Address" icon={<Mail className="w-3.5 h-3.5" />}>
            <input value={u.email} readOnly className={inputCls + " opacity-50 cursor-not-allowed"} />
          </FieldRow>

          <FieldRow label="Department" icon={<Building2 className="w-3.5 h-3.5" />}>
            <select value={form.department} onChange={e => setF("department", e.target.value)} className={selectCls}>
              <option value="">Select department…</option>
              {DEPARTMENTS.map(d => <option key={d} value={d} className="bg-card">{d}</option>)}
            </select>
          </FieldRow>

          <FieldRow label="Job Position / Title" icon={<Briefcase className="w-3.5 h-3.5" />}>
            <input value={form.jobPosition} onChange={e => setF("jobPosition", e.target.value)} placeholder="e.g. Senior NPD Technologist" className={inputCls} />
          </FieldRow>

          <FieldRow label="Phone Number" icon={<Phone className="w-3.5 h-3.5" />}>
            <input value={form.phone} onChange={e => setF("phone", e.target.value)} placeholder="+234 xxx xxxx xxxx" className={inputCls} type="tel" />
          </FieldRow>

          <FieldRow label="Country" icon={<Globe className="w-3.5 h-3.5" />}>
            <select value={form.country} onChange={e => setF("country", e.target.value)} className={selectCls}>
              <option value="">Select country…</option>
              {COUNTRIES.map(c => <option key={c} value={c} className="bg-card">{c}</option>)}
            </select>
          </FieldRow>
        </div>

        {dirty && (
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
              <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={handleCancel} disabled={saving}
              className={`flex items-center gap-2 px-5 py-2.5 border rounded-xl text-sm font-medium transition-colors ${isLight ? "border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300" : "border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20"}`}>
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className={`flex items-center gap-2 border-b pb-4 ${isLight ? "border-gray-200" : "border-white/5"}`}>
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Change Password</p>
            <p className="text-xs text-muted-foreground">Choose a strong password to keep your account secure.</p>
          </div>
        </div>

        <div className="space-y-4">
          <FieldRow label="Current Password" icon={<Lock className="w-3.5 h-3.5" />}>
            <div className="relative">
              <input type={showCurrent ? "text" : "password"} value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} placeholder="Enter current password" className={inputCls + " pr-10"} />
              <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FieldRow>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="New Password" icon={<Lock className="w-3.5 h-3.5" />}>
              <div className="relative">
                <input type={showNext ? "text" : "password"} value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} placeholder="Min. 6 characters" className={inputCls + " pr-10"} />
                <button type="button" onClick={() => setShowNext(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FieldRow>

            <FieldRow label="Confirm New Password" icon={<Lock className="w-3.5 h-3.5" />}>
              <div className="relative">
                <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" className={cn(inputCls, pwForm.confirm && pwForm.next !== pwForm.confirm ? "border-destructive/50 ring-destructive/30" : "")} />
                {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                  <p className="text-[11px] text-destructive mt-1">Passwords do not match</p>
                )}
              </div>
            </FieldRow>
          </div>

          <button onClick={handlePasswordChange} disabled={savingPw || !pwForm.current || !pwForm.next || pwForm.next !== pwForm.confirm}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-sm font-semibold hover:bg-amber-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Shield className="w-4 h-4" /> {savingPw ? "Updating…" : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
