"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, FileText } from "lucide-react";
import { createChangeOrder, createInvoiceFromProject } from "@/lib/actions";
import { changeOrderSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ChangeOrderForm = z.infer<typeof changeOrderSchema>;

export function CreateChangeOrderDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangeOrderForm>({
    resolver: zodResolver(changeOrderSchema),
    defaultValues: {
      projectId,
      description: "",
      reason: "",
      estimatedHours: 0,
      price: 0,
    },
  });

  function onSubmit(values: ChangeOrderForm) {
    start(async () => {
      const res = await createChangeOrder(values);
      if (res.ok) {
        toast.success("Tilläggsarbete skapat och skickat för godkännande");
        reset({ projectId, description: "", reason: "", estimatedHours: 0, price: 0 });
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4" /> Skapa tilläggsarbete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nytt tilläggsarbete</DialogTitle>
          <DialogDescription>
            Skapa ett tilläggsarbete (ÄTA) som skickas till kunden för
            godkännande.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="co-description">Beskrivning</Label>
            <Textarea id="co-description" rows={2} {...register("description")} />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="co-reason">Orsak</Label>
            <Textarea id="co-reason" rows={2} {...register("reason")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="co-hours">Uppskattade timmar</Label>
              <Input
                id="co-hours"
                type="number"
                step="0.5"
                {...register("estimatedHours")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-price">Pris (exkl. moms)</Label>
              <Input
                id="co-price"
                type="number"
                step="1"
                {...register("price")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Skapar…" : "Skapa & skicka"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateInvoiceButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await createInvoiceFromProject(projectId);
          if (res.ok && res.id) {
            toast.success("Fakturaunderlag skapat");
            router.push(`/invoices/${res.id}`);
          } else if (!res.ok) {
            toast.error(res.error);
          }
        })
      }
    >
      <FileText className="size-4" />
      {pending ? "Skapar…" : "Skapa fakturaunderlag"}
    </Button>
  );
}
