import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Globe, Star, MoreVertical, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { scoreColor } from "@/lib/score-color";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useAuth } from "@/context/AuthContext";
import {
  listDomains,
  updateDomain,
  removeDomain,
  setPrimaryDomain,
} from "@/lib/account/domain-service";
import type { Domain } from "@/lib/account/types";
import EmptyState from "@/components/app/EmptyState";
import AddDomainDialog from "@/components/app/AddDomainDialog";

function DomainRow({ d, onChanged, onRemove }: { d: Domain; onChanged: () => void; onRemove: (d: Domain) => void }) {
  const color = typeof d.latest_score === "number" ? scoreColor(d.latest_score) : null;

  const act = async (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => {
    const r = await fn();
    if (r.ok) { toast.success(ok); onChanged(); }
    else toast.error(r.error ?? "Något gick fel");
  };

  return (
    <div className="card-surface px-4 py-3 flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0"
        style={color ? { borderColor: color.hsl, color: color.hsl } : { borderColor: "hsl(var(--border))" }}
      >
        {typeof d.latest_score === "number" ? d.latest_score : "—"}
      </div>
      <Link to={`/app/domains/${d.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{d.display_name || d.normalized_domain}</span>
          {d.is_favorite && <Star className="w-3.5 h-3.5 fill-neon-cyan text-neon-cyan shrink-0" />}
          {d.is_primary && <span className="text-[10px] uppercase tracking-wide text-neon-cyan">Primär</span>}
          {d.verified && <ShieldCheck className="w-3.5 h-3.5 text-score-high shrink-0" />}
          {d.is_archived && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Arkiverad</span>}
        </div>
        <span className="text-xs text-muted-foreground truncate">{d.normalized_domain}</span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5" aria-label="Åtgärder">
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => act(() => updateDomain(d.id, { is_favorite: !d.is_favorite }), "Uppdaterad")}>
            {d.is_favorite ? "Ta bort favorit" : "Markera som favorit"}
          </DropdownMenuItem>
          {!d.is_primary && !d.is_archived && (
            <DropdownMenuItem onClick={() => act(() => setPrimaryDomain(d.id), "Primär domän uppdaterad")}>
              Ange som primär
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => act(() => updateDomain(d.id, { is_archived: !d.is_archived }), "Uppdaterad")}>
            {d.is_archived ? "Återställ" : "Arkivera"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-score-low" onClick={() => onRemove(d)}>
            Ta bort
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function DomainsPage() {
  useDocumentMeta({ title: "Domäner – Webscore", noindex: true });
  const { user } = useAuth();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [toRemove, setToRemove] = useState<Domain | null>(null);

  const { data: domains, isLoading, isError, refetch } = useQuery({
    queryKey: ["domains", user?.id, "all"],
    queryFn: () => listDomains(true),
    enabled: !!user,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["domains"] });
    refetch();
  };

  const confirmRemove = async () => {
    if (!toRemove) return;
    const r = await removeDomain(toRemove.id);
    setToRemove(null);
    if (r.ok) { toast.success("Domän borttagen"); invalidate(); }
    else toast.error(r.error ?? "Kunde inte ta bort");
  };

  const active = (domains ?? []).filter((d) => !d.is_archived);
  const archived = (domains ?? []).filter((d) => d.is_archived);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Domäner</h1>
          <p className="text-sm text-muted-foreground">Lägg till, verifiera och hantera dina domäner.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1" />Ny domän</Button>
      </div>

      {isLoading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>}

      {isError && (
        <div className="card-surface p-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">Kunde inte hämta domäner.</p>
          <Button variant="outline" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-1" />Försök igen</Button>
        </div>
      )}

      {domains && !isLoading && domains.length === 0 && (
        <EmptyState
          icon={Globe}
          title="Inga domäner ännu"
          description="Lägg till din första domän för att börja bevaka den."
          action={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1" />Lägg till domän</Button>}
        />
      )}

      {active.length > 0 && (
        <div className="space-y-2">
          {active.map((d) => <DomainRow key={d.id} d={d} onChanged={invalidate} onRemove={setToRemove} />)}
        </div>
      )}

      {archived.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground mt-4">Arkiverade</h2>
          {archived.map((d) => <DomainRow key={d.id} d={d} onChanged={invalidate} onRemove={setToRemove} />)}
        </div>
      )}

      <AddDomainDialog open={addOpen} onOpenChange={setAddOpen} />

      <AlertDialog open={!!toRemove} onOpenChange={(o) => !o && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort domän?</AlertDialogTitle>
            <AlertDialogDescription>
              {toRemove?.normalized_domain} tas bort från ditt konto. Sparade rapporter finns kvar men kopplas loss.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>Ta bort</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
