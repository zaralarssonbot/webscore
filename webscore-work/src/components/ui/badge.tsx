import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-tight leading-tight w-fit whitespace-nowrap [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        gray: "border-status-gray-fg/15 bg-status-gray-bg text-status-gray-fg",
        blue: "border-status-blue-fg/15 bg-status-blue-bg text-status-blue-fg",
        violet:
          "border-status-violet-fg/15 bg-status-violet-bg text-status-violet-fg",
        cyan: "border-status-cyan-fg/15 bg-status-cyan-bg text-status-cyan-fg",
        amber: "border-status-amber-fg/15 bg-status-amber-bg text-status-amber-fg",
        green: "border-status-green-fg/15 bg-status-green-bg text-status-green-fg",
        red: "border-status-red-fg/15 bg-status-red-bg text-status-red-fg",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
