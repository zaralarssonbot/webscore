"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createInvoiceFromProject } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";

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
          } else if (!res.ok) toast.error(res.error);
        })
      }
    >
      <Receipt className="size-4" /> Skapa underlag
    </Button>
  );
}
