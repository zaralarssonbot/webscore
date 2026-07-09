"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { decideQuote } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, X, MessageSquarePlus } from "lucide-react";

type Decision = "approved" | "declined" | "change_requested";

const config: Record<
  Decision,
  { title: string; desc: string; cta: string; needTerms: boolean }
> = {
  approved: {
    title: "Godkänn offert",
    desc: "Bekräfta att du godkänner offerten och dess villkor.",
    cta: "Godkänn offert",
    needTerms: true,
  },
  declined: {
    title: "Avböj offert",
    desc: "Berätta gärna varför så återkommer vi om det behövs.",
    cta: "Avböj offert",
    needTerms: false,
  },
  change_requested: {
    title: "Begär ändring",
    desc: "Beskriv vad du vill ändra så uppdaterar vi offerten.",
    cta: "Skicka begäran",
    needTerms: false,
  },
};

export function PublicQuoteActions({ token }: { token: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [terms, setTerms] = useState(false);
  const [pending, start] = useTransition();

  const cfg = decision ? config[decision] : null;

  const submit = () => {
    if (!decision || !cfg) return;
    if (name.trim().length < 2) return toast.error("Ange ditt namn");
    if (!/.+@.+\..+/.test(email)) return toast.error("Ange en giltig e-post");
    if (cfg.needTerms && !terms)
      return toast.error("Du måste acceptera villkoren");
    start(async () => {
      const res = await decideQuote(token, {
        decision,
        name,
        email,
        comment: comment || undefined,
        termsAccepted: terms,
      });
      if (res.ok) {
        toast.success(
          decision === "approved"
            ? "Tack! Offerten är godkänd."
            : decision === "declined"
              ? "Tack för ditt svar."
              : "Tack! Vi återkommer med en uppdaterad offert."
        );
        setDecision(null);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button size="lg" onClick={() => setDecision("approved")}>
          <Check className="size-4" /> Godkänn
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => setDecision("change_requested")}
        >
          <MessageSquarePlus className="size-4" /> Begär ändring
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => setDecision("declined")}
        >
          <X className="size-4" /> Avböj
        </Button>
      </div>

      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent>
          {cfg && (
            <>
              <DialogHeader>
                <DialogTitle>{cfg.title}</DialogTitle>
                <DialogDescription>{cfg.desc}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Namn</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="För- och efternamn"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>E-post</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="namn@exempel.se"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Kommentar{" "}
                    {decision !== "approved" && (
                      <span className="text-muted-foreground">(valfritt)</span>
                    )}
                  </Label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      decision === "change_requested"
                        ? "Beskriv önskad ändring…"
                        : "Lämna en kommentar…"
                    }
                  />
                </div>
                {cfg.needTerms && (
                  <label className="flex items-start gap-2.5 text-sm">
                    <Checkbox
                      checked={terms}
                      onCheckedChange={(v) => setTerms(Boolean(v))}
                      className="mt-0.5"
                    />
                    <span className="text-muted-foreground">
                      Jag har läst och accepterar offertens villkor och
                      betalningsvillkor.
                    </span>
                  </label>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDecision(null)}>
                  Avbryt
                </Button>
                <Button
                  onClick={submit}
                  disabled={pending}
                  variant={decision === "declined" ? "destructive" : "default"}
                >
                  {pending ? "Skickar…" : cfg.cta}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
