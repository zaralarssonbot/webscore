import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useAuth } from "@/context/AuthContext";
import {
  getProfile, updateProfile, getSettings, updateSettings, exportAccountData, deleteAccount,
} from "@/lib/account/profile-service";
import type { Profile, UserSettings } from "@/lib/account/types";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card-surface p-6 space-y-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  useDocumentMeta({ title: "Inställningar – Webscore", noindex: true });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile, isLoading: pLoading } = useQuery({
    queryKey: ["profile", user?.id], queryFn: () => getProfile(user!.id), enabled: !!user,
  });
  const { data: settings, isLoading: sLoading } = useQuery({
    queryKey: ["settings", user?.id], queryFn: () => getSettings(user!.id), enabled: !!user,
  });

  const [form, setForm] = useState<Partial<Profile>>({});
  const [set, setSet] = useState<Partial<UserSettings>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [purge, setPurge] = useState(false);

  useEffect(() => { if (profile) setForm(profile); }, [profile]);
  useEffect(() => { if (settings) setSet(settings); }, [settings]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const r = await updateProfile(user.id, {
      full_name: form.full_name ?? null,
      company_name: form.company_name ?? null,
      company_org_number: form.company_org_number ?? null,
      locale: (form.locale as "sv" | "en") ?? "sv",
      marketing_opt_in: form.marketing_opt_in ?? false,
    });
    setSavingProfile(false);
    if (r.ok) { toast.success("Profil sparad"); qc.invalidateQueries({ queryKey: ["profile"] }); }
    else toast.error(r.error ?? "Kunde inte spara");
  };

  const saveNotif = async () => {
    if (!user) return;
    setSavingNotif(true);
    const r = await updateSettings(user.id, {
      notify_analysis_complete: set.notify_analysis_complete ?? true,
      notify_score_changed: set.notify_score_changed ?? true,
      notify_pdf_ready: set.notify_pdf_ready ?? true,
      notify_weekly_digest: set.notify_weekly_digest ?? false,
      score_change_threshold: set.score_change_threshold ?? 3,
    });
    setSavingNotif(false);
    if (r.ok) { toast.success("Inställningar sparade"); qc.invalidateQueries({ queryKey: ["settings"] }); }
    else toast.error(r.error ?? "Kunde inte spara");
  };

  const doExport = async () => {
    setExporting(true);
    const r = await exportAccountData();
    setExporting(false);
    if (!r.ok) toast.error(r.error === "rate_limited" ? "Försök igen om en stund." : "Export misslyckades");
  };

  const doDelete = async () => {
    setDeleting(true);
    const r = await deleteAccount(purge ? "purge" : "anonymize");
    setDeleting(false);
    if (r.ok) { await signOut(); qc.clear(); navigate("/", { replace: true }); }
    else toast.error(r.error ?? "Kunde inte radera kontot");
  };

  if (pLoading || sLoading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>;
  }

  const notifRows: Array<[keyof UserSettings, string]> = [
    ["notify_analysis_complete", "Analys klar"],
    ["notify_score_changed", "Poäng ändrad"],
    ["notify_pdf_ready", "PDF klar"],
    ["notify_weekly_digest", "Veckosammanfattning"],
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold font-display">Inställningar</h1>

      <Section title="Profil">
        <div className="grid gap-3">
          <div><Label>Namn</Label><Input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Företag</Label><Input value={form.company_name ?? ""} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
          <div><Label>Org.nr</Label><Input value={form.company_org_number ?? ""} onChange={(e) => setForm({ ...form, company_org_number: e.target.value })} /></div>
          <div>
            <Label>Språk</Label>
            <select className="h-10 w-full rounded-lg border border-border bg-white/5 px-3 text-sm"
              value={form.locale ?? "sv"} onChange={(e) => setForm({ ...form, locale: e.target.value as "sv" | "en" })}>
              <option value="sv">Svenska</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        <Button onClick={saveProfile} disabled={savingProfile}>
          {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : "Spara profil"}
        </Button>
      </Section>

      <Section title="Aviseringar" description="Välj vad du vill få besked om.">
        <div className="space-y-3">
          {notifRows.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <Switch checked={Boolean(set[key])} onCheckedChange={(v) => setSet({ ...set, [key]: v })} />
            </div>
          ))}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">Tröskel för poängändring</span>
            <Input type="number" min={1} max={50} className="w-24"
              value={set.score_change_threshold ?? 3}
              onChange={(e) => setSet({ ...set, score_change_threshold: Number(e.target.value) })} />
          </div>
        </div>
        <Button onClick={saveNotif} disabled={savingNotif}>
          {savingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : "Spara inställningar"}
        </Button>
      </Section>

      <Section title="Konto">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Inloggad som</span>
          <span className="text-sm">{user?.email}</span>
        </div>
      </Section>

      <Section title="Integritet & data" description="Din data tillhör dig.">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Marknadsföring via e-post</p>
            <p className="text-xs text-muted-foreground">Enstaka produktnyheter. Aldrig spam.</p>
          </div>
          <Switch checked={Boolean(form.marketing_opt_in)} onCheckedChange={(v) => setForm({ ...form, marketing_opt_in: v })} />
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" onClick={doExport} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}Exportera min data
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-score-low border-score-low/30 hover:bg-score-low/10">
                <Trash2 className="w-4 h-4 mr-1" />Radera konto
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Radera konto permanent?</AlertDialogTitle>
                <AlertDialogDescription>
                  Detta går inte att ångra. Skriv din e-post ({user?.email}) för att bekräfta.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-3">
                <Input placeholder="din@epost.se" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} />
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={purge} onChange={(e) => setPurge(e.target.checked)} />
                  Radera även mina delade rapporter (annars anonymiseras de)
                </label>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting || confirmEmail.trim().toLowerCase() !== (user?.email ?? "").toLowerCase()}
                  onClick={doDelete}
                  className="bg-score-low hover:bg-score-low/90"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Radera permanent"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Section>
    </div>
  );
}
