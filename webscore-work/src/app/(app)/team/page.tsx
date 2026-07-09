import { Mail, Phone, ShieldCheck } from "lucide-react";
import { requireCapability, can } from "@/lib/auth";
import { listUsers } from "@/lib/queries";
import { roleMeta } from "@/lib/status";
import { formatSEK, initials } from "@/lib/utils";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InviteUserDialog } from "./invite-dialog";

const roleColor: Record<string, "violet" | "blue" | "gray"> = {
  admin: "violet",
  supervisor: "blue",
  worker: "gray",
};

const roleCapabilities: { role: string; abilities: string[] }[] = [
  {
    role: "Administratör",
    abilities: [
      "Hantera organisation & inställningar",
      "Skapa offerter & fakturor",
      "Hantera användare",
      "Se rapporter",
    ],
  },
  {
    role: "Arbetsledare",
    abilities: [
      "Planera arbetsorder & tilldela personal",
      "Godkänna tid & utfört arbete",
      "Hantera kunder",
      "Se rapporter",
    ],
  },
  {
    role: "Medarbetare",
    abilities: [
      "Registrera tid",
      "Registrera material",
      "Ladda upp bilder",
      "Se egna arbetsorder",
    ],
  },
];

export default async function TeamPage() {
  await requireCapability(can.manageUsers);
  const users = listUsers();

  return (
    <>
      <PageHeader
        title="Team"
        description="Medarbetare, roller och behörigheter i organisationen."
        actions={<InviteUserDialog />}
      />
      <PageBody>
        {/* Mobile: stacked cards */}
        <div className="space-y-2.5 md:hidden">
          {users.map((u) => (
            <div
              key={u.id}
              className="rounded-xl border border-border bg-card p-3.5 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: u.color }}
                >
                  {initials(u.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.title}
                  </p>
                </div>
                <Badge variant={roleColor[u.role]}>
                  {roleMeta[u.role].label}
                </Badge>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 truncate">
                  <Mail className="size-3 shrink-0" /> {u.email}
                </span>
                <span className="shrink-0 font-medium tabular-nums text-foreground">
                  {formatSEK(u.hourlyRate)}/tim
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namn</TableHead>
                  <TableHead>Titel</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Timpris</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: u.color }}
                        >
                          {initials(u.name)}
                        </span>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleColor[u.role]}>
                        {roleMeta[u.role].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Mail className="size-3" /> {u.email}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Phone className="size-3" /> {u.phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatSEK(u.hourlyRate)}/tim
                    </TableCell>
                    <TableCell>
                      {u.active ? (
                        <Badge variant="green">Aktiv</Badge>
                      ) : (
                        <Badge variant="gray">Inaktiv</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Role capability summary */}
        {/* (cards stack 1-col on mobile via grid) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" /> Behörigheter per roll
            </CardTitle>
            <CardDescription>
              Översikt av vad varje roll får göra i systemet.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {roleCapabilities.map((rc) => (
              <div
                key={rc.role}
                className="rounded-lg border border-border p-4"
              >
                <p className="mb-2 font-medium">{rc.role}</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {rc.abilities.map((a) => (
                    <li key={a} className="flex items-start gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
