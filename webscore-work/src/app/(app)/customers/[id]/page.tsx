import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability, can } from "@/lib/auth";
import {
  quotesForCustomer,
  projectsForCustomer,
  workOrdersForCustomer,
  quoteValue,
} from "@/lib/queries";
import { getCustomer } from "@/lib/data/customers";
import { store } from "@/lib/db/store";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { CustomerForm } from "@/components/customers/customer-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InfoList, InfoItem } from "@/components/shared/info-list";
import { quoteStatus, projectStatus, workOrderStatus } from "@/lib/status";
import { formatSEK, formatDate } from "@/lib/utils";
import { Building2, User, Pencil, FileText } from "lucide-react";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireCapability(can.backoffice);
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const quotes = quotesForCustomer(id);
  const projects = projectsForCustomer(id);
  const workOrders = workOrdersForCustomer(id);
  const activity = store.activity
    .filter((a) => a.organizationId === customer.organizationId)
    .filter(
      (a) =>
        a.entityId === id ||
        quotes.some((q) => q.id === a.entityId) ||
        projects.some((p) => p.id === a.entityId)
    )
    .slice(0, 10);

  return (
    <>
      <PageHeader
        title={customer.name}
        description={
          customer.type === "company"
            ? customer.companyName ?? "Företagskund"
            : "Privatkund"
        }
        actions={
          <>
            <CustomerForm
              customer={customer}
              trigger={
                <Button variant="outline">
                  <Pencil className="size-4" /> Redigera
                </Button>
              }
            />
            {can.createQuotes(user.role) && (
              <Button asChild>
                <Link href={`/quotes/new?customer=${customer.id}`}>
                  <FileText className="size-4" /> Ny offert
                </Link>
              </Button>
            )}
          </>
        }
      >
        <Badge variant="violet" className="mt-2">
          {customer.type === "company" ? (
            <>
              <Building2 className="size-3" /> Företag
            </>
          ) : (
            <>
              <User className="size-3" /> Privatperson
            </>
          )}
        </Badge>
      </PageHeader>

      <PageBody>
        {/* Relationship value strip */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
          {[
            {
              label: "Affärsvärde",
              value: formatSEK(
                quotes
                  .filter((q) => q.status === "approved")
                  .reduce((s, q) => s + quoteValue(q), 0)
              ),
            },
            { label: "Offerter", value: String(quotes.length) },
            { label: "Projekt", value: String(projects.length) },
            { label: "Kund sedan", value: formatDate(customer.createdAt) },
          ].map((s) => (
            <div key={s.label} className="bg-card px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Sidebar info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Kontaktuppgifter</CardTitle>
              </CardHeader>
              <CardContent>
                <InfoList>
                  {customer.phone && (
                    <InfoItem label="Telefon">
                      <a href={`tel:${customer.phone}`} className="hover:underline">
                        {customer.phone}
                      </a>
                    </InfoItem>
                  )}
                  {customer.email && (
                    <InfoItem label="E-post">
                      <a
                        href={`mailto:${customer.email}`}
                        className="text-primary hover:underline"
                      >
                        {customer.email}
                      </a>
                    </InfoItem>
                  )}
                  {customer.orgNumber && (
                    <InfoItem label="Org.nr">{customer.orgNumber}</InfoItem>
                  )}
                  {customer.addresses.map((a) => (
                    <InfoItem key={a.id} label={a.label}>
                      {a.street}, {a.postalCode} {a.city}
                    </InfoItem>
                  ))}
                </InfoList>
              </CardContent>
            </Card>
            {customer.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Anteckningar</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {customer.notes}
                  </p>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Aktivitet</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityFeed items={activity} />
              </CardContent>
            </Card>
          </div>

          {/* Main tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="quotes">
              <TabsList>
                <TabsTrigger value="quotes">Offerter ({quotes.length})</TabsTrigger>
                <TabsTrigger value="projects">
                  Projekt ({projects.length})
                </TabsTrigger>
                <TabsTrigger value="work">
                  Arbetsorder ({workOrders.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="quotes">
                <Card>
                  <CardContent className="divide-y divide-border p-0">
                    {quotes.length === 0 && (
                      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Inga offerter ännu.
                      </p>
                    )}
                    {quotes.map((q) => (
                      <Link
                        key={q.id}
                        href={`/quotes/${q.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {q.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {q.number} · {formatDate(q.createdAt)}
                          </p>
                        </div>
                        <span className="text-sm font-medium tabular-nums">
                          {formatSEK(quoteValue(q))}
                        </span>
                        <StatusBadge meta={quoteStatus[q.status]} />
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="projects">
                <Card>
                  <CardContent className="divide-y divide-border p-0">
                    {projects.length === 0 && (
                      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Inga projekt ännu.
                      </p>
                    )}
                    {projects.map((p) => (
                      <Link
                        key={p.id}
                        href={`/projects/${p.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatSEK(p.budget)}
                          </p>
                        </div>
                        <StatusBadge meta={projectStatus[p.status]} />
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="work">
                <Card>
                  <CardContent className="divide-y divide-border p-0">
                    {workOrders.length === 0 && (
                      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Inga arbetsorder ännu.
                      </p>
                    )}
                    {workOrders.map((w) => (
                      <Link
                        key={w.id}
                        href={`/work-orders/${w.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{w.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {w.number} · {formatDate(w.date)}
                          </p>
                        </div>
                        <StatusBadge meta={workOrderStatus[w.status]} />
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </PageBody>
    </>
  );
}
