import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Unified button system. One motion language: ease-pop (cubic-bezier(0.16,1,0.3,1)),
 * ~180ms, lift on hover, press on active, visible focus ring everywhere.
 *
 * Hierarchy:
 *  - PRIMARY (default / glow / glow-gradient / glow-magenta): brand gradient
 *    teal→blue→purple, white text, soft brand shadow → deepens to a soft glow.
 *  - secondary: calm filled, lift + subtle darken.
 *  - outline / glow-outline: crisp border → fills with a subtle gradient tint,
 *    border brightens, lift.
 *  - ghost / link: minimal; link shifts toward brand.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-[transform,box-shadow,background-color,border-color,color,filter] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-white shadow-[0_2px_8px_hsl(var(--neon-blue)/0.28)] hover:-translate-y-0.5 hover:brightness-[1.06] hover:shadow-[0_10px_26px_hsl(var(--neon-blue)/0.36)] active:brightness-100",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:-translate-y-0.5 hover:bg-destructive/90 hover:shadow-md",
        outline:
          "border border-border bg-card text-foreground shadow-sm hover:-translate-y-0.5 hover:border-neon-blue/40 hover:bg-gradient-to-r hover:from-neon-cyan/10 hover:via-neon-blue/10 hover:to-neon-purple/10 hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:-translate-y-0.5 hover:bg-secondary/70 hover:shadow-md",
        ghost: "text-foreground hover:-translate-y-0.5 hover:bg-secondary",
        link: "text-primary underline-offset-4 hover:underline hover:text-neon-blue",
        glow:
          "bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-white shadow-[0_2px_8px_hsl(var(--neon-blue)/0.28)] hover:-translate-y-0.5 hover:brightness-[1.06] hover:shadow-[0_10px_26px_hsl(var(--neon-blue)/0.36)] active:brightness-100",
        "glow-gradient":
          "bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-white shadow-[0_2px_8px_hsl(var(--neon-blue)/0.28)] hover:-translate-y-0.5 hover:brightness-[1.06] hover:shadow-[0_10px_26px_hsl(var(--neon-blue)/0.36)] active:brightness-100",
        "glow-magenta":
          "bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-purple text-white shadow-[0_2px_8px_hsl(var(--neon-blue)/0.28)] hover:-translate-y-0.5 hover:brightness-[1.06] hover:shadow-[0_10px_26px_hsl(var(--neon-blue)/0.36)] active:brightness-100",
        "glow-outline":
          "border border-border bg-card text-foreground shadow-sm hover:-translate-y-0.5 hover:border-neon-blue/40 hover:bg-gradient-to-r hover:from-neon-cyan/10 hover:via-neon-blue/10 hover:to-neon-purple/10 hover:shadow-md",
        "glow-outline-magenta":
          "border border-border bg-card text-foreground shadow-sm hover:-translate-y-0.5 hover:border-neon-blue/40 hover:bg-gradient-to-r hover:from-neon-cyan/10 hover:via-neon-blue/10 hover:to-neon-purple/10 hover:shadow-md",
      },
      size: {
        // 44px min so every button is a comfortable touch target.
        default: "h-11 px-5 py-2",
        sm: "h-10 rounded-md px-4",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
