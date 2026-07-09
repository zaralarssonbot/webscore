"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setWorkOrderStatus } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export function CompleteWorkButton({ workOrderId }: { workOrderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="xl"
      className="w-full"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await setWorkOrderStatus(workOrderId, "review");
          if (res.ok) {
            toast.success("Markerat klart för kontroll");
            router.refresh();
          } else toast.error(res.error);
        })
      }
    >
      <CheckCircle2 className="size-5" /> Markera arbete klart
    </Button>
  );
}
