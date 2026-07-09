"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setQuoteStatus, convertQuoteToProject } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  Link2,
  Copy,
  Check,
  FolderPlus,
  MoreHorizontal,
  XCircle,
  ExternalLink,
} from "lucide-react";
import type { QuoteStatus } from "@/lib/types";

export function QuoteActions({
  quoteId,
  token,
  status,
  projectId,
  canManage = true,
}: {
  quoteId: string;
  token: string;
  status: QuoteStatus;
  projectId?: string;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/q/${token}`
      : `/q/${token}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Offertlänk kopierad");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Kunde inte kopiera");
    }
  };

  const change = (s: QuoteStatus, msg: string) =>
    start(async () => {
      const res = await setQuoteStatus(quoteId, s);
      if (res.ok) {
        toast.success(msg);
        router.refresh();
      } else toast.error(res.error);
    });

  const convert = () =>
    start(async () => {
      const res = await convertQuoteToProject(quoteId);
      if (res.ok && res.id) {
        toast.success("Projekt skapat från offert");
        router.push(`/projects/${res.id}`);
      } else if (!res.ok) toast.error(res.error);
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "draft" && canManage && (
        <Button onClick={() => change("sent", "Offert markerad som skickad")} disabled={pending}>
          <Send className="size-4" /> Skicka till kund
        </Button>
      )}

      {status === "approved" &&
        (projectId ? (
          <Button asChild>
            <a href={`/projects/${projectId}`}>
              <FolderPlus className="size-4" /> Öppna projekt
            </a>
          </Button>
        ) : canManage ? (
          <Button onClick={convert} disabled={pending}>
            <FolderPlus className="size-4" /> Skapa projekt
          </Button>
        ) : null)}

      <Button variant="outline" onClick={copyLink}>
        {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
        Kopiera kundlänk
      </Button>

      <Button variant="outline" asChild>
        <a href={`/q/${token}`} target="_blank" rel="noreferrer">
          <ExternalLink className="size-4" /> Kundvy
        </a>
      </Button>

      {canManage && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={copyLink}>
            <Copy /> Kopiera länk
          </DropdownMenuItem>
          {status !== "sent" && status !== "approved" && (
            <DropdownMenuItem onSelect={() => change("sent", "Markerad som skickad")}>
              <Send /> Markera skickad
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {status !== "declined" && status !== "approved" && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => change("declined", "Offert markerad som avböjd")}
            >
              <XCircle /> Markera avböjd
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      )}
    </div>
  );
}
