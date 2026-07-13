import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Globe, FileText } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/context/AuthContext";
import { listDomains } from "@/lib/account/domain-service";
import { searchReports } from "@/lib/account/history-service";

/** Global palette: own domains (client-filtered) + own reports (server search). */
export default function GlobalSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Cmd/Ctrl+K to open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data: domains = [] } = useQuery({
    queryKey: ["domains", user?.id],
    queryFn: () => listDomains(true),
    enabled: !!user && open,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["report-search", query],
    queryFn: () => searchReports(query),
    enabled: !!user && open && query.trim().length > 1,
  });

  const q = query.trim().toLowerCase();
  const matchedDomains = q
    ? domains.filter(
        (d) =>
          d.normalized_domain.toLowerCase().includes(q) ||
          (d.display_name ?? "").toLowerCase().includes(q),
      )
    : domains.slice(0, 5);

  const go = (path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-white/5 text-sm text-muted-foreground hover:text-foreground transition-colors min-w-[180px]"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Sök…</span>
        <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-border">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Sök domäner och rapporter…" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>Inget hittades.</CommandEmpty>
          {matchedDomains.length > 0 && (
            <CommandGroup heading="Domäner">
              {matchedDomains.map((d) => (
                <CommandItem key={d.id} value={`domain-${d.normalized_domain}`} onSelect={() => go(`/app/domains/${d.id}`)}>
                  <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span>{d.display_name || d.normalized_domain}</span>
                  {typeof d.latest_score === "number" && (
                    <span className="ml-auto text-xs text-muted-foreground">{d.latest_score}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {reports.length > 0 && (
            <CommandGroup heading="Rapporter">
              {reports.map((r) => (
                <CommandItem key={r.id} value={`report-${r.id}`} onSelect={() => go(`/analys/${r.id}`)}>
                  <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span>{r.normalized_domain}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString("sv-SE") : ""} · {r.final_score}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
