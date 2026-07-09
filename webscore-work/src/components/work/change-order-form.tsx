"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createChangeOrder } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function ChangeOrderForm({
  projectId,
  workOrderId,
  trigger,
}: {
  projectId: string;
  workOrderId?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    description: "",
    reason: "",
    estimatedHours: 0,
    price: 0,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const submit = () =>
    start(async () => {
      if (f.description.trim().length < 2) {
        toast.error("Beskriv tilläggsarbetet");
        return;
      }
      const res = await createChangeOrder({ projectId, workOrderId, ...f });
      if (res.ok) {
        toast.success("Tilläggsarbete skapat och skickat till kund");
        setOpen(false);
        setF({ description: "", reason: "", estimatedHours: 0, price: 0 });
        router.refresh();
      } else toast.error(res.error);
    });

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Plus className="size-4" /> Tilläggsarbete
          </Button>
        )}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nytt tilläggsarbete</DialogTitle>
            <DialogDescription>
              Skapas med en publik länk där kunden kan godkänna eller avböja.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Beskrivning" required>
              <Textarea
                value={f.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Vad ska göras?"
                autoFocus
              />
            </Field>
            <Field label="Orsak">
              <Textarea
                value={f.reason}
                onChange={(e) => set("reason", e.target.value)}
                placeholder="Varför behövs tillägget?"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Beräknad tid" hint="timmar">
                <Input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={f.estimatedHours}
                  onChange={(e) => set("estimatedHours", Number(e.target.value))}
                />
              </Field>
              <Field label="Pris" hint="exkl. moms">
                <Input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={f.price}
                  onChange={(e) => set("price", Number(e.target.value))}
                />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={submit} disabled={pending}>
              Skapa & skicka
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
