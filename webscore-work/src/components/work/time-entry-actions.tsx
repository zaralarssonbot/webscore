"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { decideTime } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function TimeEntryActions({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const decide = (d: "approved" | "rejected") =>
    start(async () => {
      const res = await decideTime(entryId, d);
      if (res.ok) {
        toast.success(d === "approved" ? "Tid godkänd" : "Tid avvisad");
        router.refresh();
      } else toast.error(res.error);
    });
  return (
    <div className="flex gap-1">
      <Button
        size="icon-sm"
        variant="outline"
        onClick={() => decide("approved")}
        disabled={pending}
        aria-label="Godkänn"
      >
        <Check className="size-4 text-status-green-fg" />
      </Button>
      <Button
        size="icon-sm"
        variant="outline"
        onClick={() => decide("rejected")}
        disabled={pending}
        aria-label="Avvisa"
      >
        <X className="size-4 text-destructive" />
      </Button>
    </div>
  );
}
