"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Inbox } from "lucide-react";
import { saveInquiry, setInquiryStatus } from "@/lib/actions";
import { inquirySchema } from "@/lib/validation";
import type { Inquiry, InquiryStatus } from "@/lib/types";
import { inquiryStages, inquiryStatus } from "@/lib/status";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface UserOption {
  id: string;
  name: string;
}

const SOURCES = [
  "Webbformulär",
  "Telefon",
  "Rekommendation",
  "Återkommande kund",
  "Sociala medier",
  "Manuell",
];

type InquiryForm = z.infer<typeof inquirySchema>;

/* -------------------------------------------------------------------------- */
/*  New inquiry dialog                                                          */
/* -------------------------------------------------------------------------- */
export function NewInquiryDialog({ users }: { users: UserOption[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InquiryForm>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      customerName: "",
      companyName: "",
      phone: "",
      email: "",
      address: "",
      workType: "",
      description: "",
      desiredDate: "",
      source: "Manuell",
      ownerId: undefined,
    },
  });

  function onSubmit(values: InquiryForm) {
    start(async () => {
      const res = await saveInquiry(values);
      if (res.ok) {
        toast.success("Förfrågan registrerad");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Ny förfrågan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Ny förfrågan</DialogTitle>
          <DialogDescription>
            Registrera en inkommande förfrågan från en kund.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="space-y-1.5">
            <Label htmlFor="customerName">Kundnamn</Label>
            <Input id="customerName" {...register("customerName")} />
            {errors.customerName && (
              <p className="text-xs text-destructive">
                {errors.customerName.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Företag (valfritt)</Label>
            <Input id="companyName" {...register("companyName")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-post</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Adress</Label>
            <Input id="address" {...register("address")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workType">Typ av arbete</Label>
            <Input id="workType" {...register("workType")} />
            {errors.workType && (
              <p className="text-xs text-destructive">
                {errors.workType.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desiredDate">Önskat datum</Label>
            <Input id="desiredDate" type="date" {...register("desiredDate")} />
          </div>
          <div className="space-y-1.5">
            <Label>Källa</Label>
            <Select
              value={watch("source")}
              onValueChange={(v) => setValue("source", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj källa" />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Ansvarig</Label>
            <Select
              value={watch("ownerId") ?? ""}
              onValueChange={(v) => setValue("ownerId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tilldela ansvarig" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Beskrivning</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Sparar…" : "Spara förfrågan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status select (kanban card)                                                */
/* -------------------------------------------------------------------------- */
function InquiryStatusSelect({
  id,
  status,
}: {
  id: string;
  status: InquiryStatus;
}) {
  const [pending, start] = useTransition();
  return (
    <Select
      value={status}
      onValueChange={(v) =>
        start(async () => {
          const res = await setInquiryStatus(id, v as InquiryStatus);
          if (res.ok) toast.success("Status uppdaterad");
          else toast.error(res.error);
        })
      }
    >
      <SelectTrigger size="sm" className="h-8" disabled={pending}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {inquiryStages.map((s) => (
          <SelectItem key={s} value={s}>
            {inquiryStatus[s].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* -------------------------------------------------------------------------- */
/*  Board (tabs: table + kanban)                                               */
/* -------------------------------------------------------------------------- */
export function InquiriesBoard({
  inquiries,
  users,
}: {
  inquiries: Inquiry[];
  users: UserOption[];
}) {
  const userName = useMemo(() => {
    const map = new Map(users.map((u) => [u.id, u.name]));
    return (id?: string) => (id ? map.get(id) ?? "—" : "—");
  }, [users]);

  if (inquiries.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Inga förfrågningar än"
        description="Registrera din första förfrågan för att komma igång."
      />
    );
  }

  return (
    <Tabs defaultValue="table">
      <TabsList>
        <TabsTrigger value="table">Tabell</TabsTrigger>
        <TabsTrigger value="kanban">Kanban</TabsTrigger>
      </TabsList>

      {/* Table view */}
      <TabsContent value="table">
        {/* Mobile: stacked cards */}
        <div className="space-y-2.5 md:hidden">
          {inquiries.map((i) => (
            <div
              key={i.id}
              className="rounded-xl border border-border bg-card p-3.5 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{i.customerName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {i.workType}
                    {i.companyName ? ` · ${i.companyName}` : ""}
                  </p>
                </div>
                <StatusBadge meta={inquiryStatus[i.status]} />
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>{i.source} · {userName(i.ownerId)}</span>
                <span>{formatDate(i.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kund</TableHead>
                  <TableHead>Typ av arbete</TableHead>
                  <TableHead>Källa</TableHead>
                  <TableHead>Ansvarig</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Datum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="font-medium">{i.customerName}</div>
                      {i.companyName && (
                        <div className="text-xs text-muted-foreground">
                          {i.companyName}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{i.workType}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {i.source}
                    </TableCell>
                    <TableCell>{userName(i.ownerId)}</TableCell>
                    <TableCell>
                      <StatusBadge meta={inquiryStatus[i.status]} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(i.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Kanban view */}
      <TabsContent value="kanban">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {inquiryStages.map((stage) => {
            const items = inquiries.filter((i) => i.status === stage);
            return (
              <div key={stage} className="rounded-xl bg-muted/40 p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <StatusBadge meta={inquiryStatus[stage]} />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      Inga förfrågningar
                    </p>
                  )}
                  {items.map((i) => (
                    <div
                      key={i.id}
                      className="rounded-lg border border-border bg-card p-3 shadow-sm"
                    >
                      <p className="text-sm font-medium">{i.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.workType}
                      </p>
                      {i.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {i.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {userName(i.ownerId)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(i.createdAt)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <InquiryStatusSelect id={i.id} status={i.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </TabsContent>
    </Tabs>
  );
}
