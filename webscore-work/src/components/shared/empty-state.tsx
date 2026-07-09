import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center",
        className
      )}
    >
      {/* faint dotted backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(circle at 50% 40%, black, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 40%, black, transparent 70%)",
        }}
      />
      <div className="relative">
        {/* layered icon mark */}
        <div className="animate-pop relative mx-auto flex size-14 items-center justify-center">
          <span className="absolute inset-0 rounded-2xl bg-accent/60" />
          <span className="absolute inset-1.5 rounded-xl bg-card shadow-xs ring-1 ring-border" />
          <Icon className="relative size-6 text-primary" />
        </div>
        <p className="mt-5 text-[15px] font-semibold tracking-tight">{title}</p>
        {description && (
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
