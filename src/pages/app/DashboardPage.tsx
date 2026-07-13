import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useAuth } from "@/context/AuthContext";
import { listDomains } from "@/lib/account/domain-service";
import DomainCard from "@/components/app/DomainCard";
import SummaryStatRow from "@/components/app/SummaryStatRow";
import EmptyState from "@/components/app/EmptyState";
import AddDomainDialog from "@/components/app/AddDomainDialog";

export default function DashboardPage() {
  useDocumentMeta({ title: "Översikt – Webscore", noindex: true });
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);

  const { data: domains, isLoading, isError, refetch } = useQuery({
    queryKey: ["domains", user?.id],
    queryFn: () => listDomains(false),
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Översikt</h1>
          <p className="text-sm text-muted-foreground">Dina bevakade domäner och deras utveckling.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Ny domän
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </div>
      )}

      {isError && (
        <div className="card-surface p-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">Kunde inte hämta din översikt.</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Försök igen
          </Button>
        </div>
      )}

      {domains && !isLoading && (
        domains.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="Analysera din första domän"
            description="Lägg till en webbplats för att få en poäng, en fullständig analys och löpande bevakning."
            action={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1" />Lägg till domän</Button>}
          />
        ) : (
          <div className="space-y-6">
            <SummaryStatRow domains={domains} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {domains.map((d) => (
                <DomainCard key={d.id} domain={d} onChanged={() => refetch()} />
              ))}
            </div>
          </div>
        )
      )}

      <AddDomainDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
