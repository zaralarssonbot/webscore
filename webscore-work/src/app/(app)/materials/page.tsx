import Link from "next/link";
import { requireCapability, can } from "@/lib/auth";
import {
  listMaterials,
  getWorkOrder,
  getProject,
  customerName,
  userName,
} from "@/lib/queries";
import { materialSummary } from "@/lib/calc";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  MaterialsClient,
  type MaterialRow,
} from "@/components/work/materials-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatSEK } from "@/lib/utils";
import { Package, Wallet, TrendingUp, Layers } from "lucide-react";

export default async function MaterialsPage() {
  await requireCapability(can.backoffice);
  const materials = listMaterials().sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  const sum = materialSummary(materials);

  // Per-project / per-work-order revenue aggregates
  const projMap = new Map<string, { name: string; revenue: number }>();
  const woMap = new Map<string, { number: string; title: string; revenue: number }>();
  for (const m of materials) {
    const wo = getWorkOrder(m.workOrderId);
    const revenue = m.quantity * m.customerPrice;
    const projectId = m.projectId ?? wo?.projectId;
    if (projectId) {
      const proj = getProject(projectId);
      if (proj) {
        const prev = projMap.get(proj.id) ?? { name: proj.name, revenue: 0 };
        prev.revenue += revenue;
        projMap.set(proj.id, prev);
      }
    }
    if (wo) {
      const prev = woMap.get(wo.id) ?? { number: wo.number, title: wo.title, revenue: 0 };
      prev.revenue += revenue;
      woMap.set(wo.id, prev);
    }
  }
  const perProject = [...projMap.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);
  const perWorkOrder = [...woMap.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const rows: MaterialRow[] = materials.map((m) => {
    const wo = getWorkOrder(m.workOrderId);
    return {
      id: m.id,
      name: m.name,
      supplier: m.supplier ?? null,
      articleNumber: m.articleNumber ?? null,
      createdAt: m.createdAt,
      createdByName: userName(m.createdBy),
      woId: wo?.id ?? null,
      woNumber: wo?.number ?? null,
      customerName: wo ? customerName(wo.customerId) : null,
      quantity: m.quantity,
      unit: m.unit,
      linePurchase: m.quantity * m.purchasePrice,
      lineRevenue: m.quantity * m.customerPrice,
      margin: (m.customerPrice - m.purchasePrice) * m.quantity,
      receiptUrl: m.receiptUrl ?? null,
    };
  });

  return (
    <>
      <PageHeader
        title="Material"
        description="Kostnadsregister med inköp, kundpris och marginal."
      />
      <PageBody>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total inköpskostnad"
            value={formatSEK(sum.purchase)}
            icon={Wallet}
            tone="blue"
            hint="Vad materialet kostat in"
          />
          <StatCard
            label="Totalt kundpris"
            value={formatSEK(sum.revenue)}
            icon={Package}
            tone="violet"
            hint="Vidarefakturerat värde"
          />
          <StatCard
            label="Materialmarginal"
            value={formatSEK(sum.margin)}
            hint={`${sum.marginPct}% marginal`}
            icon={TrendingUp}
            tone="green"
          />
          <StatCard
            label="Materialrader"
            value={materials.length}
            icon={Layers}
            tone="cyan"
            hint="Registrerade poster"
          />
        </div>

        {materials.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Inget material registrerat"
            description="Material registreras från en arbetsorder."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <SectionHeading
                title="Materialregister"
                description="Alla registrerade rader med kostnad och marginal"
              />
              <MaterialsClient rows={rows} />
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Material per projekt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {perProject.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Inget projektkopplat material.
                    </p>
                  )}
                  {perProject.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {p.name}
                      </span>
                      <span className="shrink-0 text-sm font-medium tabular-nums">
                        {formatSEK(p.revenue)}
                      </span>
                    </Link>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Material per arbetsorder</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {perWorkOrder.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Inget material registrerat.
                    </p>
                  )}
                  {perWorkOrder.map((w) => (
                    <Link
                      key={w.id}
                      href={`/work-orders/${w.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{w.title}</p>
                        <p className="text-xs text-muted-foreground">{w.number}</p>
                      </div>
                      <span className="shrink-0 text-sm font-medium tabular-nums">
                        {formatSEK(w.revenue)}
                      </span>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </PageBody>
    </>
  );
}
