import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Globe, TrendingDown, Mail, CalendarCheck, Flame, Snowflake, Search, RefreshCw, Lock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/lead-service";
import BackgroundEffect from "@/components/BackgroundEffect";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  domain: string | null;
  total_score: number | null;
  estimated_loss: string | null;
  lead_status: string;
  status: string;
  booking_clicked_at: string | null;
  created_at: string;
  biggest_problem: string | null;
  industry: string | null;
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  new: { bg: "hsla(210,80%,55%,0.1)", text: "hsl(210,80%,65%)", border: "hsla(210,80%,55%,0.2)" },
  analysis_sent: { bg: "hsla(175,85%,50%,0.1)", text: "hsl(175,85%,55%)", border: "hsla(175,85%,50%,0.2)" },
  meeting_booked: { bg: "hsla(160,85%,45%,0.1)", text: "hsl(160,85%,55%)", border: "hsla(160,85%,45%,0.2)" },
  follow_up_needed: { bg: "hsla(40,95%,55%,0.1)", text: "hsl(40,95%,55%)", border: "hsla(40,95%,55%,0.2)" },
  warm: { bg: "hsla(25,100%,55%,0.1)", text: "hsl(25,100%,60%)", border: "hsla(25,100%,55%,0.2)" },
  cold: { bg: "hsla(220,30%,50%,0.1)", text: "hsl(220,30%,60%)", border: "hsla(220,30%,50%,0.2)" },
};

const temperatureIcon = (status: string) => {
  if (status === "warm" || status === "meeting_booked") return <Flame className="w-3.5 h-3.5 text-neon-orange" />;
  if (status === "cold") return <Snowflake className="w-3.5 h-3.5 text-blue-400" />;
  return null;
};

const scoreColor = (score: number | null) => {
  if (!score) return "text-muted-foreground";
  if (score >= 70) return "text-score-high";
  if (score >= 45) return "text-score-mid";
  return "text-score-low";
};

const Admin = () => {
  useDocumentMeta({
    title: "Lead Dashboard – Webscore",
    description: "Intern adminvy.",
    canonical: "https://webscore.se/admin",
    noindex: true,
  });
  const navigate = useNavigate();

  // Auth gate — lead data (emails, domains) must not be open to anyone.
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("id, name, email, company, domain, total_score, estimated_loss, lead_status, status, booking_clicked_at, created_at, biggest_problem, industry")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      setLeads(data as Lead[]);
    }
    setLoading(false);
  };

  // Only load lead data once authenticated.
  useEffect(() => {
    if (session) fetchLeads();
  }, [session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    });
    if (error) setAuthError("Fel e-post eller lösenord.");
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLeads([]);
  };

  // While the session is being resolved, avoid flashing the login form.
  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not signed in → gate behind a simple email/password login.
  if (!session) {
    return (
      <div className="min-h-screen bg-background text-foreground relative flex items-center justify-center px-4">
        <BackgroundEffect />
        <div className="relative z-10 w-full max-w-sm card-surface p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/15">
              <Lock className="w-5 h-5 text-neon-cyan" />
            </div>
            <h1 className="text-xl font-bold font-display">Lead Dashboard</h1>
          </div>
          <p className="text-sm text-muted-foreground font-light mb-6">Inloggning krävs för att se lead-data.</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              placeholder="E-post"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              autoComplete="username"
              className="w-full bg-secondary/40 border border-border/30 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-neon-cyan/40 transition-colors text-sm"
              autoFocus
            />
            <input
              type="password"
              placeholder="Lösenord"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-secondary/40 border border-border/30 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-neon-cyan/40 transition-colors text-sm"
            />
            {authError && <p className="text-score-low text-xs">{authError}</p>}
            <Button type="submit" variant="glow" size="lg" className="w-full" disabled={authLoading}>
              {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Logga in"}
            </Button>
          </form>
          <button onClick={() => navigate("/")} className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Till startsidan
          </button>
        </div>
      </div>
    );
  }

  const filtered = leads.filter((l) => {
    const matchesSearch =
      !search ||
      l.domain?.toLowerCase().includes(search.toLowerCase()) ||
      l.company?.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || l.lead_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: leads.length,
    newLeads: leads.filter((l) => l.lead_status === "new").length,
    analysisSent: leads.filter((l) => l.lead_status === "analysis_sent").length,
    booked: leads.filter((l) => l.lead_status === "meeting_booked").length,
    followUp: leads.filter((l) => l.lead_status === "follow_up_needed").length,
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <BackgroundEffect />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground gap-2">
              <ArrowLeft className="w-4 h-4" /> Tillbaka
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-display">Lead Dashboard</h1>
              <p className="text-sm text-muted-foreground font-light">Intern adminvy · {leads.length} leads</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="glow-outline" size="sm" onClick={fetchLeads} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Uppdatera
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground gap-1.5">
              <LogOut className="w-4 h-4" /> Logga ut
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Totalt", value: stats.total, color: "text-foreground" },
            { label: "Nya", value: stats.newLeads, color: "text-blue-400" },
            { label: "Analys skickad", value: stats.analysisSent, color: "text-neon-cyan" },
            { label: "Möte bokat", value: stats.booked, color: "text-score-high" },
            { label: "Uppföljning", value: stats.followUp, color: "text-neon-orange" },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 rounded-xl text-center">
              <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground font-light">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Sök domän, företag eller e-post..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-secondary/40 border border-border/30 rounded-xl pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 transition-colors text-sm"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["all", "new", "analysis_sent", "meeting_booked", "follow_up_needed", "warm", "cold"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  filterStatus === s
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-secondary/20 border-border/20 text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all" ? "Alla" : LEAD_STATUS_LABELS[s as LeadStatus] || s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-hidden border border-border/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/10">
                  {["Företag / Domän", "Poäng", "Kundförlust", "Status", "Analys", "Bokning", "Temp.", "Datum"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Laddar leads...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground font-light">
                      Inga leads hittades
                    </td>
                  </tr>
                ) : (
                  filtered.map((lead, i) => {
                    const sc = statusColors[lead.lead_status] || statusColors.new;
                    return (
                      <motion.tr
                        key={lead.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-border/5 hover:bg-secondary/10 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {lead.domain && (
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${lead.domain}&sz=32`}
                                alt=""
                                className="w-5 h-5 rounded shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                {lead.company && (
                                  <span className="font-semibold text-foreground flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-muted-foreground" />
                                    {lead.company}
                                  </span>
                                )}
                              </div>
                              {lead.domain && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Globe className="w-2.5 h-2.5" />
                                  {lead.domain}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">{lead.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold font-display text-base ${scoreColor(lead.total_score)}`}>
                            {lead.total_score ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {lead.estimated_loss ? (
                            <span className="text-score-low flex items-center gap-1 text-xs font-medium">
                              <TrendingDown className="w-3 h-3" />
                              {lead.estimated_loss}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs px-2.5 py-1 rounded-full border font-medium inline-block"
                            style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}
                          >
                            {LEAD_STATUS_LABELS[lead.lead_status as LeadStatus] || lead.lead_status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {lead.lead_status === "analysis_sent" || lead.lead_status === "meeting_booked" ? (
                            <Mail className="w-4 h-4 text-neon-cyan" />
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {lead.booking_clicked_at ? (
                            <CalendarCheck className="w-4 h-4 text-score-high" />
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {temperatureIcon(lead.lead_status) || <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(lead.created_at).toLocaleDateString("sv-SE")}
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
