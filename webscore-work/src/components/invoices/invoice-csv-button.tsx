"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { InvoiceDraftItem } from "@/lib/types";

export function InvoiceCsvButton({
  number,
  items,
}: {
  number: string;
  items: InvoiceDraftItem[];
}) {
  const exportCsv = () => {
    const head = ["Beskrivning", "Antal", "Enhet", "À-pris", "Moms %", "Belopp"];
    const rows = items.map((i) => [
      i.description,
      i.quantity,
      i.unit,
      i.unitPrice,
      i.vatRate,
      i.quantity * i.unitPrice,
    ]);
    const csv = [head, ...rows]
      .map((r) =>
        r
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(";")
      )
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${number}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" onClick={exportCsv}>
      <Download className="size-4" /> CSV
    </Button>
  );
}
