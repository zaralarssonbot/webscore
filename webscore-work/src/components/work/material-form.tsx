"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addMaterial } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { formatSEK } from "@/lib/utils";

const UNITS = ["st", "m", "m²", "l", "kg", "tim", "kr"];

export function MaterialForm({ workOrderId }: { workOrderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    name: "",
    articleNumber: "",
    quantity: 1,
    unit: "st",
    purchasePrice: 0,
    customerPrice: 0,
    supplier: "",
    comment: "",
  });

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const margin = (f.customerPrice - f.purchasePrice) * f.quantity;

  const submit = () =>
    start(async () => {
      if (!f.name.trim()) {
        toast.error("Ange materialnamn");
        return;
      }
      const res = await addMaterial({ workOrderId, ...f });
      if (res.ok) {
        toast.success("Material registrerat");
        setOpen(false);
        setF({
          name: "",
          articleNumber: "",
          quantity: 1,
          unit: "st",
          purchasePrice: 0,
          customerPrice: 0,
          supplier: "",
          comment: "",
        });
        router.refresh();
      } else toast.error(res.error);
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4" /> Registrera material
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrera material</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Materialnamn" required className="sm:col-span-2">
              <Input
                value={f.name}
                onChange={(e) => set("name", e.target.value)}
                autoFocus
              />
            </Field>
            <Field label="Artikelnummer">
              <Input
                value={f.articleNumber}
                onChange={(e) => set("articleNumber", e.target.value)}
              />
            </Field>
            <Field label="Leverantör">
              <Input
                value={f.supplier}
                onChange={(e) => set("supplier", e.target.value)}
              />
            </Field>
            <Field label="Antal">
              <Input
                type="number"
                min={0}
                inputMode="decimal"
                value={f.quantity}
                onChange={(e) => set("quantity", Number(e.target.value))}
              />
            </Field>
            <Field label="Enhet">
              <Select value={f.unit} onValueChange={(v) => set("unit", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Inköpspris / enhet">
              <Input
                type="number"
                min={0}
                inputMode="decimal"
                value={f.purchasePrice}
                onChange={(e) => set("purchasePrice", Number(e.target.value))}
              />
            </Field>
            <Field label="Kundpris / enhet">
              <Input
                type="number"
                min={0}
                inputMode="decimal"
                value={f.customerPrice}
                onChange={(e) => set("customerPrice", Number(e.target.value))}
              />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Beräknad marginal</span>
            <span
              className={`font-medium tabular-nums ${margin >= 0 ? "text-status-green-fg" : "text-destructive"}`}
            >
              {formatSEK(margin)}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Avbryt
          </Button>
          <Button onClick={submit} disabled={pending}>
            Spara material
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
