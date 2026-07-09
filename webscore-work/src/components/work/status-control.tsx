"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setWorkOrderStatus } from "@/lib/actions";
import { workOrderStatus, workOrderStages } from "@/lib/status";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkOrderStatus } from "@/lib/types";

const ALL: WorkOrderStatus[] = [
  ...workOrderStages,
  "paused",
  "invoiced",
];

export function WorkOrderStatusControl({
  id,
  status,
}: {
  id: string;
  status: WorkOrderStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <Select
        value={status}
        onValueChange={(v) =>
          start(async () => {
            const res = await setWorkOrderStatus(id, v as WorkOrderStatus);
            if (res.ok) {
              toast.success("Status uppdaterad");
              router.refresh();
            } else toast.error(res.error);
          })
        }
        disabled={pending}
      >
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ALL.map((s) => (
            <SelectItem key={s} value={s}>
              {workOrderStatus[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <StatusBadge meta={workOrderStatus[status]} />
    </div>
  );
}
