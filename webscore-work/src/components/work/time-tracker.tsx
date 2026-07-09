"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { startTimer, stopTimer, addManualTime } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Play, Square, Plus } from "lucide-react";

function useElapsed(startedAt?: string) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const tick = () =>
      setSecs(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TimeTracker({
  workOrderId,
  running,
  big = false,
}: {
  workOrderId: string;
  running: { id: string; startedAt: string } | null;
  big?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const elapsed = useElapsed(running?.startedAt);

  const [minutes, setMinutes] = useState(60);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [workType, setWorkType] = useState("Arbete");
  const [comment, setComment] = useState("");

  const begin = () =>
    start(async () => {
      const res = await startTimer(workOrderId);
      if (res.ok) {
        toast.success("Timer startad");
        router.refresh();
      } else toast.error(res.error);
    });

  const stop = () =>
    start(async () => {
      if (!running) return;
      const res = await stopTimer(running.id);
      if (res.ok) {
        toast.success("Tid registrerad");
        router.refresh();
      } else toast.error(res.error);
    });

  const addManual = () =>
    start(async () => {
      const res = await addManualTime({
        workOrderId,
        minutes,
        date,
        workType,
        comment: comment || undefined,
      });
      if (res.ok) {
        toast.success("Tid tillagd");
        setOpen(false);
        setComment("");
        router.refresh();
      } else toast.error(res.error);
    });

  if (running) {
    return (
      <div className={big ? "space-y-3" : "flex items-center gap-3"}>
        <div
          className={`animate-pop flex items-center gap-2 rounded-lg bg-status-cyan-bg px-3 py-2 font-mono tabular-nums text-status-cyan-fg ${big ? "justify-center text-2xl" : "text-sm"}`}
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-status-cyan-fg opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-status-cyan-fg" />
          </span>
          {elapsed}
        </div>
        <Button
          onClick={stop}
          disabled={pending}
          variant="destructive"
          size={big ? "xl" : "default"}
          className={big ? "w-full" : ""}
        >
          <Square className="size-4" /> Avsluta arbete
        </Button>
      </div>
    );
  }

  return (
    <div className={big ? "space-y-2" : "flex items-center gap-2"}>
      <Button
        onClick={begin}
        disabled={pending}
        size={big ? "xl" : "default"}
        className={big ? "w-full" : ""}
      >
        <Play className="size-4" /> Starta arbete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size={big ? "xl" : "default"}
            className={big ? "w-full" : ""}
          >
            <Plus className="size-4" /> Registrera tid manuellt
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrera tid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Minuter</Label>
                <Input
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Typ av arbete</Label>
              <Input
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kommentar</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={addManual} disabled={pending}>
              Spara tid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
