import { forwardRef } from "react";
import { cn } from "../../lib/cn";

export const Card = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-border bg-background shadow-soft",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

export const CardContent = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4", className)} {...props} />
));
CardContent.displayName = "CardContent";
