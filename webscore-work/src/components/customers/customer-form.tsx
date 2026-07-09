"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { customerSchema, type CustomerInput } from "@/lib/validation";
import { saveCustomer } from "@/lib/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import type { Customer } from "@/lib/types";

export function CustomerForm({
  trigger,
  customer,
}: {
  trigger: React.ReactNode;
  customer?: Customer;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const invoice = customer?.addresses.find((a) => a.type === "invoice");
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      type: customer?.type ?? "private",
      name: customer?.name ?? "",
      companyName: customer?.companyName ?? "",
      orgNumber: customer?.orgNumber ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      street: invoice?.street ?? "",
      postalCode: invoice?.postalCode ?? "",
      city: invoice?.city ?? "",
      notes: customer?.notes ?? "",
    },
  });

  const type = watch("type");

  const onSubmit = (values: CustomerInput) =>
    start(async () => {
      const res = await saveCustomer({ id: customer?.id, ...values });
      if (res.ok) {
        toast.success(customer ? "Kund uppdaterad" : "Kund skapad");
        setOpen(false);
        reset(values);
        router.refresh();
        if (!customer && res.id) router.push(`/customers/${res.id}`);
      } else {
        toast.error(res.error);
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{customer ? "Redigera kund" : "Ny kund"}</DialogTitle>
          <DialogDescription>
            {customer
              ? "Uppdatera kundens uppgifter."
              : "Lägg till en privatperson eller företagskund."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Kundtyp">
            <Select
              value={type}
              onValueChange={(v) =>
                setValue("type", v as "private" | "company")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Privatperson</SelectItem>
                <SelectItem value="company">Företag</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Namn" required error={errors.name?.message}>
              <Input
                {...register("name")}
                placeholder="För- och efternamn"
                autoFocus
                autoComplete="name"
                aria-invalid={!!errors.name}
              />
            </Field>
            {type === "company" && (
              <Field label="Företagsnamn" error={errors.companyName?.message}>
                <Input
                  {...register("companyName")}
                  placeholder="Företag AB"
                  autoComplete="organization"
                  aria-invalid={!!errors.companyName}
                />
              </Field>
            )}
            {type === "company" && (
              <Field label="Organisationsnummer">
                <Input
                  {...register("orgNumber")}
                  placeholder="556xxx-xxxx"
                  inputMode="numeric"
                />
              </Field>
            )}
            <Field label="Telefon" error={errors.phone?.message}>
              <Input
                {...register("phone")}
                placeholder="070-123 45 67"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                aria-invalid={!!errors.phone}
              />
            </Field>
            <Field label="E-post" error={errors.email?.message}>
              <Input
                {...register("email")}
                type="email"
                placeholder="namn@exempel.se"
                autoComplete="email"
                inputMode="email"
                aria-invalid={!!errors.email}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <Field label="Gatuadress">
                <Input
                  {...register("street")}
                  placeholder="Gatan 1"
                  autoComplete="address-line1"
                />
              </Field>
            </div>
            <Field label="Postnummer">
              <Input
                {...register("postalCode")}
                placeholder="123 45"
                inputMode="numeric"
                autoComplete="postal-code"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Ort">
                <Input
                  {...register("city")}
                  placeholder="Stockholm"
                  autoComplete="address-level2"
                />
              </Field>
            </div>
          </div>

          <Field label="Anteckningar">
            <Textarea {...register("notes")} placeholder="Intern notering…" />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Sparar…" : "Spara kund"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
