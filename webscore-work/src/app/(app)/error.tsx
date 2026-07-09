"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-status-red-bg text-status-red-fg">
        <AlertTriangle className="size-7" />
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">
        Något gick fel
      </h1>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Ett oväntat fel uppstod när sidan skulle visas. Försök igen — om
        problemet kvarstår, kontakta supporten.
      </p>
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>
          <RotateCcw className="size-4" /> Försök igen
        </Button>
        <Button variant="outline" asChild>
          <a href="/dashboard">Till översikten</a>
        </Button>
      </div>
    </div>
  );
}
