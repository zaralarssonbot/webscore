import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6 md:py-6 lg:px-8",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] md:text-[25px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function PageBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-6 px-4 py-6 md:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}
