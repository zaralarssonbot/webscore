import { Badge } from "@/components/ui/badge";
import type { StatusMeta } from "@/lib/status";

const dot: Record<string, string> = {
  gray: "bg-status-gray-fg",
  blue: "bg-status-blue-fg",
  violet: "bg-status-violet-fg",
  cyan: "bg-status-cyan-fg",
  amber: "bg-status-amber-fg",
  green: "bg-status-green-fg",
  red: "bg-status-red-fg",
};

/** Renders a status pill from a StatusMeta entry (label + color). */
export function StatusBadge({
  meta,
  withDot = true,
}: {
  meta: StatusMeta;
  withDot?: boolean;
}) {
  return (
    <Badge variant={meta.color}>
      {withDot && (
        <span className={`size-1.5 rounded-full ${dot[meta.color]}`} />
      )}
      {meta.label}
    </Badge>
  );
}
