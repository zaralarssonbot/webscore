import { cn } from "@/lib/utils";

/**
 * Definition list for entity metadata — muted label on the left, value on the
 * right, separated by hairlines. Reads like a tidy spec sheet: high scannability,
 * low visual noise.
 */
export function InfoList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <dl className={cn("divide-y divide-border", className)}>{children}</dl>
  );
}

export function InfoItem({
  label,
  icon: Icon,
  children,
  align = "right",
  className,
}: {
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  align?: "right" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0",
        className
      )}
    >
      <dt className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
        {Icon && <Icon className="size-3.5 translate-y-px" />}
        {label}
      </dt>
      <dd
        className={cn(
          "min-w-0 break-words text-sm font-medium",
          align === "right" ? "text-right" : "text-left"
        )}
      >
        {children}
      </dd>
    </div>
  );
}
