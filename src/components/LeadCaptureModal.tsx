import { useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, ArrowRight, Loader2, Hash, Search, Building2, User, Phone, MapPin, Shield, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { submitLead } from "@/lib/scan-service";
import { markBookingClicked } from "@/lib/lead-service";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const leadSchema = z.object({
  orgNumber: z.string().trim().min(10, "Organisationsnummer krävs (10 siffror)").max(13),
  name: z.string().trim().min(1, "Kontaktperson krävs").max(100),
  email: z.string().trim().email("Vänligen ange en giltig e-postadress").max(255),
  phone: z.string().trim().min(5, "Telefonnummer krävs").max(30),
  company: z.string().trim().min(1, "Företagsnamn krävs").max(200),
});

/** Field order = the order the inputs appear in, so we can focus the first failure. */
const FIELD_ORDER = ["orgNumber", "company", "name", "email", "phone"] as const;

interface AnalysisContext {
  domain?: string;
  totalScore?: number;
  summary?: string;
  biggestProblem?: string;
  industry?: string;
}

interface LeadCaptureModalProps {
  open: boolean;
  onClose: () => void;
  scanId?: string;
  title?: string;
  analysisContext?: AnalysisContext;
}

const LeadCaptureModal = ({ open, onClose, scanId, title = "Boka gratis analys", analysisContext }: LeadCaptureModalProps) => {
  const [orgNumber, setOrgNumber] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [signatory, setSignatory] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  // The dialog is opened by an external `open` prop rather than a DialogTrigger,
  // so Radix has no trigger to hand focus back to on close. Capture whatever was
  // focused just before focus moves into the dialog, and restore it ourselves.
  const triggerRef = useRef<HTMLElement | null>(null);
  const { toast } = useToast();

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setOrgNumber("");
      setName("");
      setEmail("");
      setPhone("");
      setCompany("");
      setAddress("");
      setSignatory("");
      setErrors({});
      setLookupDone(false);
    }, 300);
  };

  /** Move the caret to the first field that failed, so a rejection is never silent. */
  const focusFirstError = (fieldErrors: Record<string, string>) => {
    const first = FIELD_ORDER.find((f) => fieldErrors[f]);
    if (first) formRef.current?.querySelector<HTMLInputElement>(`#lead-${first}`)?.focus();
  };

  const handleOrgLookup = async () => {
    const cleaned = orgNumber.replace(/[\s-]/g, '');
    if (cleaned.length < 10) {
      setErrors({ orgNumber: "Ange ett giltigt organisationsnummer (10 siffror)" });
      return;
    }
    setErrors({});
    setLookupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("lookup-company", {
        body: { orgNumber: cleaned },
      });
      if (error || !data?.success) {
        setErrors({ orgNumber: data?.error || "Kunde inte hitta företaget" });
        setLookupDone(false);
        return;
      }
      const info = data.data;
      if (info.name) setCompany(info.name);
      if (info.phone) setPhone(info.phone);
      if (info.signatory) {
        setSignatory(info.signatory);
        setName(info.signatory);
      }
      if (info.address) {
        const fullAddr = [info.address, info.zipcode, info.city].filter(Boolean).join(", ");
        setAddress(fullAddr);
      }
      setLookupDone(true);
      toast({ title: "Företag hittat!", description: info.name || "Information hämtad" });
    } catch {
      setErrors({ orgNumber: "Något gick fel vid sökningen" });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = leadSchema.safeParse({ orgNumber, name, email, phone, company });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      focusFirstError(fieldErrors);
      return;
    }

    const estimatedLoss = analysisContext?.totalScore
      ? analysisContext.totalScore < 50 ? "15-25 kunder/mån" : analysisContext.totalScore < 70 ? "5-15 kunder/mån" : "1-5 kunder/mån"
      : undefined;

    setLoading(true);
    try {
      const leadId = await submitLead({
        name: result.data.name,
        email: result.data.email,
        company: `${result.data.company} | Org: ${orgNumber}${address ? ` | Adress: ${address}` : ""}${signatory ? ` | Firmatecknare: ${signatory}` : ""} | Tel: ${phone}`,
        scanId,
        domain: analysisContext?.domain,
        totalScore: analysisContext?.totalScore,
        estimatedLoss,
        analysisSummary: analysisContext?.summary,
        biggestProblem: analysisContext?.biggestProblem,
        industry: analysisContext?.industry,
        leadStatus: "meeting_booked",
      });
      await markBookingClicked(leadId);
      toast({ title: "Förfrågan skickad!", description: "Vi hör av oss inom 24 timmar." });
      handleClose();
    } catch {
      toast({ title: "Något gick fel", description: "Vänligen försök igen.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-secondary/20 border border-border/20 rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/80 outline-none focus:border-primary/40 transition-colors text-sm";
  const iconInputClass = "w-full bg-secondary/20 border border-border/20 rounded-xl pl-11 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground/80 outline-none focus:border-primary/40 transition-colors text-sm";
  const labelClass = "text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block";

  /** Error text + the wiring that makes it announceable and reachable. */
  const errorProps = (field: string) =>
    errors[field]
      ? { "aria-invalid": true as const, "aria-describedby": `lead-${field}-error` }
      : {};
  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? (
      <p id={`lead-${field}-error`} className="text-score-low text-xs mt-1">
        {errors[field]}
      </p>
    ) : null;

  const errorCount = Object.keys(errors).length;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
      <DialogPortal>
        {/* Same veil as before: light haze + blur, not the shared black overlay. */}
        <DialogOverlay className="bg-foreground/40 backdrop-blur-sm" />
        <DialogPrimitive.Content
          aria-modal="true"
          // Fires before focus moves in, so activeElement is still the trigger.
          onOpenAutoFocus={() => {
            const active = document.activeElement;
            triggerRef.current = active instanceof HTMLElement ? active : null;
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            triggerRef.current?.focus();
          }}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-3xl border border-neon-cyan/15 bg-card/90 p-8 sm:p-10 shadow-2xl backdrop-blur-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DialogClose asChild>
            <button
              type="button"
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
              <span className="sr-only">Stäng</span>
            </button>
          </DialogClose>

          <DialogTitle className="text-2xl font-bold mb-1 font-display tracking-[-0.02em] leading-tight">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm mb-6 font-light">
            Ange ditt organisationsnummer så hämtar vi företagsuppgifterna automatiskt – eller fyll i uppgifterna själv.
          </DialogDescription>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Nothing may fail silently: a rejected submit always says so up front. */}
            {errorCount > 0 && (
              <p role="alert" className="text-score-low text-xs rounded-xl border border-score-low/25 bg-score-low/5 px-4 py-3">
                {errorCount === 1
                  ? "Ett fält behöver rättas innan du kan skicka."
                  : `${errorCount} fält behöver rättas innan du kan skicka.`}
              </p>
            )}

            {/* Org number with lookup */}
            <div>
              <label htmlFor="lead-orgNumber" className={labelClass}>Organisationsnummer</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" aria-hidden="true" />
                  <input
                    id="lead-orgNumber"
                    name="orgNumber"
                    type="text"
                    placeholder="XXXXXX-XXXX"
                    value={orgNumber}
                    onChange={(e) => { setOrgNumber(e.target.value); setLookupDone(false); }}
                    className={iconInputClass + " font-mono"}
                    maxLength={13}
                    {...errorProps("orgNumber")}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleOrgLookup}
                  disabled={lookupLoading || orgNumber.replace(/[\s-]/g, '').length < 10}
                  className="rounded-xl px-5 shrink-0"
                  variant={lookupDone ? "outline" : "default"}
                >
                  {lookupLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : lookupDone ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Sök
                    </>
                  )}
                </Button>
              </div>
              <FieldError field="orgNumber" />
            </div>

            {/* Company name — always editable. The lookup may fill it in, but it must
                never be the ONLY way to provide it (that made submit fail silently). */}
            <div>
              <label htmlFor="lead-company" className={labelClass}>Företagsnamn</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" aria-hidden="true" />
                <input
                  id="lead-company"
                  name="company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className={iconInputClass}
                  placeholder="Företagsnamn"
                  maxLength={200}
                  {...errorProps("company")}
                />
              </div>
              <FieldError field="company" />
            </div>

            {/* Address — only exists once a lookup returned one. */}
            {address && (
              <div>
                <label htmlFor="lead-address" className={labelClass}>Adress</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" aria-hidden="true" />
                  <input id="lead-address" name="address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={iconInputClass} placeholder="Adress" />
                </div>
              </div>
            )}

            {/* Signatory — read-only registry data from the lookup. */}
            {signatory && (
              <div>
                <label htmlFor="lead-signatory" className={labelClass}>Firmatecknare</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" aria-hidden="true" />
                  <input id="lead-signatory" name="signatory" type="text" value={signatory} onChange={(e) => setSignatory(e.target.value)} className={iconInputClass} readOnly />
                </div>
              </div>
            )}

            {/* Contact person */}
            <div>
              <label htmlFor="lead-name" className={labelClass}>Kontaktperson</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" aria-hidden="true" />
                <input id="lead-name" name="name" type="text" placeholder="Ditt namn" value={name} onChange={(e) => setName(e.target.value)} className={iconInputClass} maxLength={100} {...errorProps("name")} />
              </div>
              <FieldError field="name" />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="lead-email" className={labelClass}>E-postadress</label>
              <input id="lead-email" name="email" type="email" placeholder="E-postadress" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} maxLength={255} {...errorProps("email")} />
              <FieldError field="email" />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="lead-phone" className={labelClass}>Telefonnummer</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" aria-hidden="true" />
                <input id="lead-phone" name="phone" type="tel" placeholder="Telefonnummer" value={phone} onChange={(e) => setPhone(e.target.value)} className={iconInputClass} maxLength={30} {...errorProps("phone")} />
              </div>
              <FieldError field="phone" />
            </div>

            <Button type="submit" variant="glow" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Skicka förfrågan
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground/80">
              Vi återkommer inom 24 timmar
            </p>
          </form>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default LeadCaptureModal;
