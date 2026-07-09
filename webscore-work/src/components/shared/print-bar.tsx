"use client";

import { useEffect } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Floating bar for print/PDF pages. Optionally auto-opens the print dialog. */
export function PrintBar({ autoPrint = false }: { autoPrint?: boolean }) {
  useEffect(() => {
    if (autoPrint) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [autoPrint]);

  return (
    <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur">
      <Button variant="ghost" size="sm" onClick={() => window.close()}>
        <X className="size-4" /> Stäng
      </Button>
      <p className="text-sm text-zinc-500">
        Skriv ut eller spara som PDF
      </p>
      <Button size="sm" onClick={() => window.print()}>
        <Printer className="size-4" /> Skriv ut / PDF
      </Button>
    </div>
  );
}
