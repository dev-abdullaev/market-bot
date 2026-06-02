import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

/** Inline brand spinner. Pass `size`/`className` to tune. */
export function Spinner({ className, size = 20 }) {
  return (
    <Loader2
      className={cn("animate-spin text-primary", className)}
      size={size}
      strokeWidth={2.4}
      aria-hidden
    />
  );
}

/** Full-screen centered loading state with an accessible label. */
export function FullScreenLoader({ label }) {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-3 bg-muted"
      role="status"
      aria-live="polite"
    >
      <Spinner size={32} />
      {label ? (
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      ) : null}
    </div>
  );
}
