"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { logout, resetDemoData } from "@/lib/actions";
import { useState } from "react";
import { roleMeta } from "@/lib/status";
import { initials } from "@/lib/utils";
import { LogOut, RotateCcw, Settings, UserCog } from "lucide-react";
import type { Role } from "@/lib/types";
import { toast } from "sonner";

export function UserMenu({
  user,
  orgName,
}: {
  user: { name: string; title: string; email: string; role: Role; color: string };
  orgName: string;
}) {
  const [, startTransition] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Konto: ${user.name}`}
          className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <Avatar>
            <AvatarFallback style={{ backgroundColor: user.color, color: "#fff" }}>
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2 text-foreground">
          <span className="text-sm font-semibold">{user.name}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
          <span className="mt-1 text-[11px] font-normal text-muted-foreground">
            {roleMeta[user.role].label} · {orgName}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Inställningar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/team">
            <UserCog /> Team
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setResetOpen(true);
          }}
        >
          <RotateCcw /> Återställ demo-data
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(e) => {
            e.preventDefault();
            startTransition(() => void logout());
          }}
        >
          <LogOut /> Logga ut
        </DropdownMenuItem>
      </DropdownMenuContent>
      <ConfirmationDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Återställ demo-data?"
        description="All data återställs till utgångsläget. Ändringar du gjort under demon försvinner. Detta går inte att ångra."
        confirmLabel="Återställ"
        destructive
        onConfirm={async () => {
          await resetDemoData();
          toast.success("Demo-data återställd");
        }}
      />
    </DropdownMenu>
  );
}
