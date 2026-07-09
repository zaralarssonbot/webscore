"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { decideChangeOrder } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, X } from "lucide-react";

export function PublicChangeOrderActions({ token }: { token: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState<"approved" | "declined" | null>(null);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [pending, start] = useTransition();

  const submit = () => {
    if (!decision) return;
    if (name.trim().length < 2) return toast.error("Ange ditt namn");
    start(async () => {
      const res = await decideChangeOrder(token, {
        decision,
        name,
        comment: comment || undefined,
      });
      if (res.ok) {
        toast.success(
          decision === "approved" ? "Tilläggsarbete godkänt" : "Tack för ditt svar"
        );
        setDecision(null);
        router.refresh();
      } else toast.error(res.error);
    });
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button size="lg" onClick={() => setDecision("approved")}>
          <Check className="size-4" /> Godkänn
        </Button>
        <Button size="lg" variant="outline" onClick={() => setDecision("declined")}>
          <X className="size-4" /> Avböj
        </Button>
      </div>
      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === "approved" ? "Godkänn tilläggsarbete" : "Avböj tilläggsarbete"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Namn</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Kommentar (valfritt)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
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
              Skicka svar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
