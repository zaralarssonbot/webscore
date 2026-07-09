"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveQuote, setQuoteStatus } from "@/lib/actions";
import { quoteTotals, lineNet } from "@/lib/calc";
import { formatSEK } from "@/lib/utils";
import type { Customer, Quote, QuoteItem, QuoteLineKind } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  GripVertical,
  Hammer,
  Package,
  MoreHorizontal,
  Save,
  Send,
} from "lucide-react";

const UNITS = ["tim", "st", "m²", "m", "l", "kg", "kr"];
const VATS = [25, 12, 6, 0];
const kindMeta: Record<QuoteLineKind, { label: string; icon: typeof Hammer }> = {
  labor: { label: "Arbete", icon: Hammer },
  material: { label: "Material", icon: Package },
  other: { label: "Övrigt", icon: MoreHorizontal },
};

let tmp = 0;
const tmpId = () => `tmp_${tmp++}`;

function blankItem(kind: QuoteLineKind): QuoteItem {
  return {
    id: tmpId(),
    kind,
    description: "",
    quantity: 1,
    unit: kind === "labor" ? "tim" : "st",
    unitPrice: 0,
    discountPct: 0,
    vatRate: 25,
  };
}

export function QuoteEditor({
  customers,
  quote,
  defaultCustomerId,
  defaultTerms,
  defaultPaymentTerms,
}: {
  customers: Pick<Customer, "id" | "name" | "companyName" | "type">[];
  quote?: Quote;
  defaultCustomerId?: string;
  defaultTerms: string;
  defaultPaymentTerms: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [customerId, setCustomerId] = useState(
    quote?.customerId ?? defaultCustomerId ?? ""
  );
  const [title, setTitle] = useState(quote?.title ?? "");
  const [description, setDescription] = useState(quote?.description ?? "");
  const [pricingType, setPricingType] = useState<"fixed" | "estimate">(
    quote?.pricingType ?? "fixed"
  );
  const [validUntil, setValidUntil] = useState(
    () =>
      quote?.validUntil?.slice(0, 10) ??
      new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  );
  const [startDate, setStartDate] = useState(quote?.startDate?.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(quote?.endDate?.slice(0, 10) ?? "");
  const [terms, setTerms] = useState(quote?.terms ?? defaultTerms);
  const [paymentTerms, setPaymentTerms] = useState(
    quote?.paymentTerms ?? defaultPaymentTerms
  );
  const [items, setItems] = useState<QuoteItem[]>(
    quote?.items.length ? quote.items : [blankItem("labor")]
  );

  const totals = useMemo(() => quoteTotals(items), [items]);

  function updateItem(id: string, patch: Partial<QuoteItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function validate() {
    if (!customerId) return "Välj en kund";
    if (title.trim().length < 2) return "Ange en titel";
    if (items.length === 0) return "Lägg till minst en rad";
    if (items.some((i) => !i.description.trim()))
      return "Alla rader behöver en beskrivning";
    return null;
  }

  function persist(then: "stay" | "send") {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    start(async () => {
      const res = await saveQuote({
        id: quote?.id,
        customerId,
        title,
        description,
        pricingType,
        validUntil,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        terms,
        paymentTerms,
        items,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const id = res.id!;
      if (then === "send") {
        await setQuoteStatus(id, "sent");
        toast.success("Offert sparad och markerad som skickad");
      } else {
        toast.success("Offert sparad");
      }
      router.push(`/quotes/${id}`);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Form */}
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Offertuppgifter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Kund</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj kund" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.type === "company" && c.companyName
                          ? c.companyName
                          : c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prissättning</Label>
                <Select
                  value={pricingType}
                  onValueChange={(v) => setPricingType(v as "fixed" | "estimate")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fast pris</SelectItem>
                    <SelectItem value="estimate">Uppskattat pris</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Titel</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="t.ex. Målning av lägenhet"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Arbetsbeskrivning</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beskriv arbetet för kunden…"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Giltig till</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Startdatum</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Beräknat slut</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Offertrader</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => {
              const Meta = kindMeta[item.kind];
              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
                    <Select
                      value={item.kind}
                      onValueChange={(v) =>
                        updateItem(item.id, { kind: v as QuoteLineKind })
                      }
                    >
                      <SelectTrigger size="sm" className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(kindMeta).map(([k, m]) => (
                          <SelectItem key={k} value={k}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, { description: e.target.value })
                      }
                      placeholder={`${Meta.label}sbeskrivning`}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeItem(item.id)}
                      aria-label="Ta bort rad"
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 pl-6 sm:grid-cols-6">
                    <div>
                      <Label className="text-xs text-muted-foreground">Antal</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.5"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.id, {
                            quantity: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Enhet</Label>
                      <Select
                        value={item.unit}
                        onValueChange={(v) => updateItem(item.id, { unit: v })}
                      >
                        <SelectTrigger size="sm">
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
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        À-pris
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(item.id, {
                            unitPrice: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Rabatt %
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discountPct}
                        onChange={(e) =>
                          updateItem(item.id, {
                            discountPct: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Moms</Label>
                      <Select
                        value={String(item.vatRate)}
                        onValueChange={(v) =>
                          updateItem(item.id, { vatRate: Number(v) })
                        }
                      >
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VATS.map((v) => (
                            <SelectItem key={v} value={String(v)}>
                              {v}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col justify-end">
                      <Label className="text-xs text-muted-foreground">
                        Radsumma
                      </Label>
                      <p className="flex h-8 items-center text-sm font-medium tabular-nums">
                        {formatSEK(lineNet(item))}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-wrap gap-2 pt-1">
              {(Object.keys(kindMeta) as QuoteLineKind[]).map((k) => {
                const Meta = kindMeta[k];
                return (
                  <Button
                    key={k}
                    variant="outline"
                    size="sm"
                    onClick={() => setItems((p) => [...p, blankItem(k)])}
                  >
                    <Plus className="size-4" /> {Meta.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Villkor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Betalningsvillkor</Label>
              <Input
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Offertvillkor</Label>
              <Textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="min-h-28"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary (sticky) */}
      <div className="lg:col-span-1">
        <Card className="lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Sammanställning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Summa exkl. moms" value={formatSEK(totals.subtotal)} />
            {totals.discountTotal > 0 && (
              <Row
                label="Varav rabatt"
                value={`−${formatSEK(totals.discountTotal)}`}
                muted
              />
            )}
            <Row label="Moms" value={formatSEK(totals.vatTotal)} muted />
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-semibold">Totalt</span>
              <span className="text-lg font-semibold tabular-nums">
                {formatSEK(totals.total)}
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                className="w-full"
                onClick={() => persist("send")}
                disabled={pending}
              >
                <Send className="size-4" /> Spara & skicka
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => persist("stay")}
                disabled={pending}
              >
                <Save className="size-4" /> Spara som utkast
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {pricingType === "fixed"
                ? "Fast pris — totalbeloppet gäller."
                : "Uppskattat pris — kan justeras efter utfört arbete."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
