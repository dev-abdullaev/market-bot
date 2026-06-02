import { forwardRef } from "react";
import { cn } from "../../lib/cn";

const base =
  "w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground shadow-soft transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary disabled:opacity-50";

export const Input = forwardRef(({ className, icon: Icon, ...props }, ref) => {
  if (Icon) {
    return (
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={2}
        />
        <input
          ref={ref}
          className={cn(base, "h-11 pl-9", className)}
          {...props}
        />
      </div>
    );
  }
  return <input ref={ref} className={cn(base, "h-11", className)} {...props} />;
});
Input.displayName = "Input";

export const Select = forwardRef(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(base, "h-11 appearance-none pr-9", className)}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({ className, ...props }) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-sm font-bold text-foreground",
        className
      )}
      {...props}
    />
  );
}
