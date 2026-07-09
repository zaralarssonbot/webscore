"use client";

import { useState, useTransition } from "react";
import { login, signInWithPassword } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleMeta } from "@/lib/status";
import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

interface DemoUser {
  id: string;
  name: string;
  title: string;
  role: Role;
  color: string;
}

export function LoginForm({
  users,
  supabaseEnabled,
}: {
  users: DemoUser[];
  supabaseEnabled: boolean;
}) {
  if (supabaseEnabled) return <PasswordForm />;
  return <DemoForm users={users} />;
}

/* ------------------------- Real Supabase Auth form ------------------------ */
function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          const res = await signInWithPassword(fd);
          // A successful sign-in redirects; only failures return here.
          if (res && !res.ok) setError(res.error);
        })
      }
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="email">E-post</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="namn@foretag.se"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Lösenord</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Loggar in…" : "Logga in"}
      </Button>
    </form>
  );
}

/* ------------------------------ Demo picker ------------------------------- */
function DemoForm({ users }: { users: DemoUser[] }) {
  const [selected, setSelected] = useState(users[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => void login(fd))}
      className="space-y-5"
    >
      <div className="space-y-2">
        {users.map((u) => {
          const active = u.id === selected;
          return (
            <button
              type="button"
              key={u.id}
              onClick={() => setSelected(u.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all",
                active
                  ? "border-primary bg-accent/60 ring-1 ring-primary/30"
                  : "border-border hover:bg-muted/60"
              )}
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: u.color }}
              >
                {initials(u.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {u.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {u.title}
                </span>
              </span>
              <Badge variant={active ? "violet" : "gray"}>
                {roleMeta[u.role].label}
              </Badge>
            </button>
          );
        })}
      </div>

      <input type="hidden" name="userId" value={selected} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Loggar in…" : "Logga in"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Demo-inloggning · inget lösenord krävs
      </p>
    </form>
  );
}
