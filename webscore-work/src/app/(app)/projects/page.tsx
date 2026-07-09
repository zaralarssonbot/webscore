import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { requireCapability, can } from "@/lib/auth";
import { listProjects, customerName, userName } from "@/lib/queries";
import { projectStatus } from "@/lib/status";
import { formatSEK, formatDate } from "@/lib/utils";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";

export default async function ProjectsPage() {
  await requireCapability(can.backoffice);
  const projects = listProjects();

  return (
    <>
      <PageHeader
        title="Projekt"
        description="Pågående och planerade projekt med budget och status."
      />
      <PageBody>
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="Inga projekt än"
            description="Projekt skapas automatiskt när en offert godkänns och konverteras."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="h-full transition-[box-shadow,border-color,transform] duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-sm">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {customerName(p.customerId)}
                        </p>
                      </div>
                      <StatusBadge meta={projectStatus[p.status]} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Projektledare
                        </p>
                        <p className="font-medium">{userName(p.managerId)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Budget</p>
                        <p className="font-medium tabular-nums">
                          {formatSEK(p.budget)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Start</p>
                        <p className="font-medium">{formatDate(p.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Slut</p>
                        <p className="font-medium">{formatDate(p.endDate)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
