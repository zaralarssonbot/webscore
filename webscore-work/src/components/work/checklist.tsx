"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleChecklistItem, addChecklistItem } from "@/lib/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { ChecklistItem } from "@/lib/types";

export function Checklist({
  workOrderId,
  items,
}: {
  workOrderId: string;
  items: ChecklistItem[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [label, setLabel] = useState("");
  const done = items.filter((i) => i.done).length;

  const toggle = (itemId: string) =>
    start(async () => {
      await toggleChecklistItem(workOrderId, itemId);
      router.refresh();
    });

  const add = () => {
    if (!label.trim()) return;
    start(async () => {
      await addChecklistItem(workOrderId, label.trim());
      setLabel("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {done} av {items.length} klara
          </span>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50">
              <Checkbox
                checked={item.done}
                onCheckedChange={() => toggle(item.id)}
              />
              <span
                className={`text-sm ${item.done ? "text-muted-foreground line-through" : ""}`}
              >
                {item.label}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Lägg till punkt…"
          className="h-9"
        />
        <Button variant="outline" size="icon" onClick={add}>
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
