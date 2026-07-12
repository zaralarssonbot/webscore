import { useState } from "react";
import { ChevronDown, CheckCircle2, XCircle } from "lucide-react";
import type { AuditCheck } from "@/lib/scan-service";

interface EvidenceDisclosureProps {
  /** The measured checks this AI section is grounded in. */
  evidenceCheckIds: string[];
  /** All audit checks — used to resolve ids → labels + pass/fail. */
  checks?: AuditCheck[];
  /** Optional label override. */
  label?: string;
}

/**
 * A quiet, collapsed-by-default disclosure that shows exactly which measured
 * checks an AI statement is based on. No badge, no colour in the default view —
 * it only opens when the reader asks "based on what?".
 */
const EvidenceDisclosure = ({ evidenceCheckIds, checks, label = "Baserat på dessa uppmätta fynd" }: EvidenceDisclosureProps) => {
  const [open, setOpen] = useState(false);
  if (!evidenceCheckIds?.length || !checks?.length) return null;

  const byId = new Map(checks.map((c) => [c.id, c]));
  const resolved = evidenceCheckIds.map((id) => byId.get(id)).filter(Boolean) as AuditCheck[];
  if (!resolved.length) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-[0.72rem] text-muted-foreground/70 hover:text-muted-foreground transition-colors"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        {label}
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5 pl-1 border-l border-border/60">
          {resolved.map((c) => (
            <li key={c.id} className="flex items-start gap-2 pl-3 text-[0.78rem] text-muted-foreground">
              {c.passed
                ? <CheckCircle2 className="w-3.5 h-3.5 text-neon-cyan/70 shrink-0 mt-0.5" />
                : <XCircle className="w-3.5 h-3.5 text-score-mid/70 shrink-0 mt-0.5" />}
              <span><span className="text-foreground/80">{c.label}</span> — {c.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default EvidenceDisclosure;
