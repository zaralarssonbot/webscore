"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Moon } from "lucide-react";
import { initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface OrgSettings {
  name: string;
  orgNumber: string;
  industry: string;
  email: string;
  phone: string;
  address: string;
  defaultVatRate: number;
  currency: string;
  paymentTerms: string;
  quoteTerms: string;
  quoteNumberPrefix: string;
  workOrderNumberPrefix: string;
}

const NOTIFICATIONS: { key: string; label: string; desc: string; on: boolean }[] = [
  {
    key: "work_order_new",
    label: "Ny arbetsorder",
    desc: "När en ny arbetsorder skapas i organisationen.",
    on: true,
  },
  {
    key: "assignment",
    label: "Ny tilldelning",
    desc: "När du tilldelas en arbetsorder.",
    on: true,
  },
  {
    key: "quote_opened",
    label: "Offert öppnad",
    desc: "När en kund öppnar en skickad offert.",
    on: true,
  },
  {
    key: "quote_approved",
    label: "Offert godkänd/avböjd",
    desc: "När en kund svarar på en offert.",
    on: true,
  },
  {
    key: "change_order_pending",
    label: "Tilläggsarbete väntar",
    desc: "När ett tilläggsarbete väntar på godkännande.",
    on: true,
  },
  {
    key: "work_order_review",
    label: "Klar för kontroll",
    desc: "När en arbetsorder markeras klar för kontroll.",
    on: false,
  },
  {
    key: "time_missing",
    label: "Saknad tidrapport",
    desc: "Påminnelse om ej inskickad tid.",
    on: false,
  },
];

function SaveButton({ label = "Spara" }: { label?: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      onClick={() =>
        start(async () => {
          await new Promise((r) => setTimeout(r, 350));
          toast.success("Sparat (demo)");
        })
      }
      disabled={pending}
    >
      {pending ? "Sparar…" : label}
    </Button>
  );
}

export function SettingsTabs({ org }: { org: OrgSettings }) {
  return (
    <Tabs defaultValue="company">
      <TabsList>
        <TabsTrigger value="company">Företag</TabsTrigger>
        <TabsTrigger value="quotes">Offerter & fakturor</TabsTrigger>
        <TabsTrigger value="appearance">Utseende</TabsTrigger>
        <TabsTrigger value="notifications">Notiser</TabsTrigger>
      </TabsList>

      {/* Company */}
      <TabsContent value="company">
        <Card className="overflow-hidden">
          {/* Company identity header */}
          <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-5 py-5 sm:px-6">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-xs">
              {initials(org.name)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight">
                {org.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>Org.nr {org.orgNumber}</span>
                <span className="text-border">·</span>
                <Badge variant="violet">{org.industry}</Badge>
              </div>
            </div>
          </div>
          <CardHeader>
            <CardTitle>Företagsuppgifter</CardTitle>
            <CardDescription>
              Uppgifterna visas på offerter, fakturor och i kundkommunikation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Företagsnamn" defaultValue={org.name} />
              <Field label="Organisationsnummer" defaultValue={org.orgNumber} />
              <Field label="Bransch" defaultValue={org.industry} />
              <Field label="E-post" defaultValue={org.email} type="email" />
              <Field label="Telefon" defaultValue={org.phone} />
              <Field label="Adress" defaultValue={org.address} />
            </div>
            <div className="flex justify-end">
              <SaveButton />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Quotes & invoices */}
      <TabsContent value="quotes">
        <Card>
          <CardHeader>
            <CardTitle>Offerter & fakturor</CardTitle>
            <CardDescription>
              Standardvärden för nya offerter och fakturaunderlag.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Standardmoms (%)"
                defaultValue={String(org.defaultVatRate)}
                type="number"
              />
              <Field label="Valuta" defaultValue={org.currency} />
              <Field label="Betalningsvillkor" defaultValue={org.paymentTerms} />
              <Field
                label="Offertnummer-prefix"
                defaultValue={org.quoteNumberPrefix}
              />
              <Field
                label="Arbetsordernummer-prefix"
                defaultValue={org.workOrderNumberPrefix}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quote-terms">Standardvillkor för offert</Label>
              <Textarea
                id="quote-terms"
                rows={5}
                defaultValue={org.quoteTerms}
              />
            </div>
            <div className="flex justify-end">
              <SaveButton />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Appearance */}
      <TabsContent value="appearance">
        <Card>
          <CardHeader>
            <CardTitle>Utseende</CardTitle>
            <CardDescription>
              Tema och visningsalternativ för gränssnittet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-border p-4">
              <Moon className="mt-0.5 size-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Mörkt läge</p>
                <p className="text-sm text-muted-foreground">
                  Mörkt läge styrs via temaväljaren uppe i sidhuvudet. Reglaget
                  nedan är en demonstration.
                </p>
              </div>
              <Switch />
            </div>
            <ToggleRow
              label="Kompakt vy"
              desc="Minska radhöjd i tabeller och listor."
            />
            <ToggleRow
              label="Visa tips & guider"
              desc="Visa hjälptexter och onboarding-tips i appen."
              defaultOn
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Notifications */}
      <TabsContent value="notifications">
        <Card>
          <CardHeader>
            <CardTitle>Notiser</CardTitle>
            <CardDescription>
              Välj vilka händelser du vill bli aviserad om.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {NOTIFICATIONS.map((n, i) => (
              <div key={n.key}>
                <ToggleRow label={n.label} desc={n.desc} defaultOn={n.on} />
                {i < NOTIFICATIONS.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function Field({
  label,
  defaultValue,
  type = "text",
}: {
  label: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input defaultValue={defaultValue} type={type} />
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  defaultOn,
}: {
  label: string;
  desc: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <div className="flex items-center justify-between py-3">
      <div className="pr-4">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <Switch
        checked={on}
        onCheckedChange={(v) => {
          setOn(v);
          toast.success("Inställning uppdaterad (demo)");
        }}
      />
    </div>
  );
}
