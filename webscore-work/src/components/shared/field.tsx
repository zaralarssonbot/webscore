import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Shared form field wrapper — label, optional required marker, helper hint and
 * inline error. One consistent rhythm across every form in the product.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>
          {label}
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden>
              *
            </span>
          )}
        </Label>
        {hint && !error && (
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
