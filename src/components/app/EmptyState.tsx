import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/15 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-neon-cyan" />
      </div>
      <h3 className="text-lg font-semibold font-display">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground font-light">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
