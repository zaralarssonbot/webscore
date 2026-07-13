import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { addDomain } from "@/lib/account/domain-service";
import { analyzeAndSave } from "@/lib/account/analyze";

export default function AddDomainDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (analyzeNow: boolean) => {
    if (!user) return;
    setError("");
    setBusy(true);
    const { domain, error: addErr } = await addDomain(user.id, value);
    if (addErr || !domain) {
      setBusy(false);
      setError(addErr ?? "Kunde inte lägga till domänen.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["domains"] });
    onOpenChange(false);
    setValue("");
    setBusy(false);

    if (analyzeNow) {
      toast.loading(`Analyserar ${domain.normalized_domain}…`, { id: `an-${domain.id}` });
      const reportId = await analyzeAndSave(domain.normalized_domain);
      qc.invalidateQueries({ queryKey: ["domains"] });
      if (reportId) {
        toast.success("Analysen är klar", { id: `an-${domain.id}` });
        navigate(`/analys/${reportId}`);
      } else {
        toast.error("Analysen misslyckades", { id: `an-${domain.id}` });
      }
    } else {
      toast.success(`${domain.normalized_domain} tillagd`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lägg till domän</DialogTitle>
          <DialogDescription>Ange en domän att bevaka, t.ex. dinsida.se</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(true);
          }}
          className="space-y-3"
        >
          <Input
            autoFocus
            placeholder="dinsida.se"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
          />
          {error && <p className="text-sm text-score-low">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={busy || !value}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><Plus className="w-4 h-4 mr-1" />Lägg till & analysera</>)}
            </Button>
            <Button type="button" variant="outline" disabled={busy || !value} onClick={() => submit(false)}>
              Bara lägg till
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
