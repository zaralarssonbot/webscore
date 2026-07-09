"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import type { NavItem } from "./nav-config";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** Lightweight global navigator — filters role-visible destinations as you type. */
export function GlobalSearch({ targets }: { targets: NavItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return targets;
    return targets.filter((t) => t.label.toLowerCase().includes(term));
  }, [q, targets]);

  // ⌘K / Ctrl+K to summon — a quiet hallmark of a product built for power users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    router.push(href);
    setOpen(false);
    setQ("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="group flex h-9 w-full max-w-md items-center gap-2.5 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground shadow-sm outline-none transition-colors hover:border-foreground/15 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40"
          onClick={() => setTimeout(() => inputRef.current?.focus(), 0)}
        >
          <Search className="size-4" />
          <span>Sök och navigera…</span>
          <kbd className="ml-auto hidden items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-sans text-[11px] font-medium text-muted-foreground/80 sm:inline-flex">
            ⌘K
          </kbd>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                go(results[active].href);
              }
            }}
            placeholder="Sök sidor…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </div>
        <div className="max-h-72 overflow-y-auto scrollbar-thin p-1">
          {results.map((t, i) => (
            <button
              key={t.href}
              onClick={() => go(t.href)}
              onMouseMove={() => setActive(i)}
              className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                i === active
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground"
              }`}
            >
              <t.icon className="size-4 text-muted-foreground" />
              {t.label}
              {i === active && (
                <CornerDownLeft className="ml-auto size-3.5 text-muted-foreground/60" />
              )}
            </button>
          ))}
          {results.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Inga träffar
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
