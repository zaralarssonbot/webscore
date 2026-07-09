"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setInvoiceStatus } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Upload } from "lucide-react";
import type { InvoiceDraftStatus } from "@/lib/types";

export function InvoiceActions({
  id,
  status,
}: {
  id: string;
  status: InvoiceDraftStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const change = (s: InvoiceDraftStatus, msg: string) =>
    start(async () => {
      const res = await setInvoiceStatus(id, s);
      if (res.ok) {
        toast.success(msg);
        router.refresh();
      } else toast.error(res.error);
    });

  return (
    <>
      {status === "draft" && (
        <Button onClick={() => change("approved", "Underlag godkänt")} disabled={pending}>
          <CheckCircle2 className="size-4" /> Godkänn
        </Button>
      )}
      {status !== "exported" && (
        <Button
          variant="outline"
          onClick={() => change("exported", "Markerad som överförd")}
          disabled={pending}
        >
          <Upload className="size-4" /> Markera överförd
        </Button>
      )}
    </>
  );
}
