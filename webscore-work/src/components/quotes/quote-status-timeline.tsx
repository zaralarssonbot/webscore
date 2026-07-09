import { Check, Circle, FileText, Send, Eye, ThumbsUp } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { Quote } from "@/lib/types";

/** Visual timeline of a quote's lifecycle. */
export function QuoteStatusTimeline({ quote }: { quote: Quote }) {
  const approval = quote.approvals[quote.approvals.length - 1];
  const steps = [
    {
      label: "Skapad",
      icon: FileText,
      at: quote.createdAt,
      done: true,
    },
    {
      label: "Skickad",
      icon: Send,
      at: quote.sentAt,
      done: Boolean(quote.sentAt),
    },
    {
      label: "Öppnad av kund",
      icon: Eye,
      at: quote.openedAt,
      done: Boolean(quote.openedAt),
    },
    {
      label:
        quote.status === "declined"
          ? "Avböjd"
          : quote.status === "change_requested"
            ? "Ändring begärd"
            : "Godkänd",
      icon: ThumbsUp,
      at: approval?.decidedAt,
      done: ["approved", "declined", "change_requested"].includes(quote.status),
    },
  ];

  return (
    <ol className="space-y-4">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`flex size-7 items-center justify-center rounded-full border ${
                s.done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {s.done ? (
                <Check className="size-4" />
              ) : (
                <Circle className="size-2.5" />
              )}
            </span>
            {i < steps.length - 1 && (
              <span
                className={`my-1 w-px flex-1 ${s.done ? "bg-primary/40" : "bg-border"}`}
              />
            )}
          </div>
          <div className="pb-1">
            <p
              className={`text-sm font-medium ${s.done ? "" : "text-muted-foreground"}`}
            >
              {s.label}
            </p>
            {s.at && (
              <p className="text-xs text-muted-foreground">
                {formatDateTime(s.at)}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
