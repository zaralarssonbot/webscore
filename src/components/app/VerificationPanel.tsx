import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  verifyDomain,
  setMonitoring,
  type VerificationInstructions,
} from "@/lib/account/domain-service";
import type { Domain, VerificationMethod } from "@/lib/account/types";

const METHOD_LABELS: Record<VerificationMethod, string> = {
  dns_txt: "DNS TXT-post",
  meta_tag: "Meta-tagg",
  file: "Fil på servern",
};

function InstructionBlock({ method, ins }: { method: VerificationMethod; ins: VerificationInstructions }) {
  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Kopierat"); };
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-start justify-between gap-2 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <code className="text-right break-all">{value}</code>
      <button type="button" onClick={() => copy(value)} aria-label="Kopiera"><Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>
    </div>
  );
  return (
    <div className="rounded-lg bg-black/30 border border-border p-3 space-y-2">
      {method === "dns_txt" && (<><Row label="Namn" value={ins.record ?? ""} /><Row label="Typ" value={ins.type ?? "TXT"} /><Row label="Värde" value={ins.value ?? ""} /></>)}
      {method === "meta_tag" && (<><Row label="Tagg" value={ins.tag ?? ""} /><Row label="Plats" value={ins.place ?? ""} /></>)}
      {method === "file" && (<><Row label="Sökväg" value={ins.path ?? ""} /><Row label="Innehåll" value={ins.content ?? ""} /></>)}
    </div>
  );
}

export default function VerificationPanel({ domain, onChanged }: { domain: Domain; onChanged: () => void }) {
  const qc = useQueryClient();
  const [method, setMethod] = useState<VerificationMethod>(domain.verification_method ?? "dns_txt");
  const [instructions, setInstructions] = useState<VerificationInstructions | null>(null);
  const [busy, setBusy] = useState<"issue" | "check" | "monitor" | null>(null);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["domain", domain.id] }); onChanged(); };

  const issue = async () => {
    setBusy("issue");
    const r = await verifyDomain(domain.id, method, false);
    setBusy(null);
    if (r.instructions) setInstructions(r.instructions);
    else toast.error(r.error ?? "Kunde inte hämta instruktioner");
  };

  const check = async () => {
    setBusy("check");
    const r = await verifyDomain(domain.id, method, true);
    setBusy(null);
    if (r.verified) { toast.success("Domänen är verifierad"); refresh(); }
    else toast.error("Kunde inte verifiera – kontrollera att posten är publicerad.");
  };

  const toggleMonitoring = async () => {
    setBusy("monitor");
    const r = await setMonitoring(domain.id, !domain.monitoring_enabled);
    setBusy(null);
    if (r.ok) { toast.success(domain.monitoring_enabled ? "Övervakning av" : "Övervakning på"); refresh(); }
    else toast.error(r.error ?? "Kunde inte ändra övervakning");
  };

  if (domain.verified) {
    return (
      <div className="card-surface p-5 space-y-3">
        <div className="flex items-center gap-2 text-score-high">
          <ShieldCheck className="w-5 h-5" />
          <span className="font-semibold">Verifierad domän</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Aktivera automatisk övervakning för att köra återkommande analyser och få aviseringar när poängen ändras.
        </p>
        <Button variant={domain.monitoring_enabled ? "outline" : "default"} onClick={toggleMonitoring} disabled={busy === "monitor"}>
          {busy === "monitor" ? <Loader2 className="w-4 h-4 animate-spin" /> : domain.monitoring_enabled ? "Stäng av övervakning" : "Aktivera övervakning"}
        </Button>
      </div>
    );
  }

  return (
    <div className="card-surface p-5 space-y-4">
      <div>
        <h3 className="font-semibold">Verifiera domänägande</h3>
        <p className="text-sm text-muted-foreground">Bekräfta att du äger domänen för att aktivera övervakning.</p>
      </div>
      <div className="flex gap-1 rounded-lg border border-border p-0.5 w-fit">
        {(Object.keys(METHOD_LABELS) as VerificationMethod[]).map((m) => (
          <button key={m} type="button" onClick={() => { setMethod(m); setInstructions(null); }}
            className={`px-2.5 py-1 rounded-md text-xs ${method === m ? "bg-neon-cyan/15 text-neon-cyan" : "text-muted-foreground hover:text-foreground"}`}>
            {METHOD_LABELS[m]}
          </button>
        ))}
      </div>
      {instructions && <InstructionBlock method={method} ins={instructions} />}
      <div className="flex gap-2">
        <Button variant="outline" onClick={issue} disabled={busy === "issue"}>
          {busy === "issue" ? <Loader2 className="w-4 h-4 animate-spin" /> : instructions ? "Uppdatera instruktioner" : "Hämta instruktioner"}
        </Button>
        {instructions && (
          <Button onClick={check} disabled={busy === "check"}>
            {busy === "check" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verifiera nu"}
          </Button>
        )}
      </div>
    </div>
  );
}
