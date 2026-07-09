import { cn } from "@/lib/utils";

/**
 * Page-level section heading — bold and confident, standing directly on the
 * page above its content (not buried as a card title). Creates a calm,
 * scannable rhythm of "strong heading → content".
 */
export function SectionHeading({
  title,
  description,
  action,
  className,
  as: As = "h2",
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <As className="text-[19px] font-semibold leading-tight tracking-[-0.02em] md:text-xl">
          {title}
        </As>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
