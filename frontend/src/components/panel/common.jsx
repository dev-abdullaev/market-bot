import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Inbox, Trash2 } from "lucide-react";
import { cn } from "../../lib/cn";
import { STATUS_STYLES, STATUS_DOT, statusKey } from "../../lib/panel";
import { t } from "../../lib/i18n";
import { Spinner } from "../ui/Spinner";

/** Section heading with optional icon + trailing action slot. */
export function PageHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {Icon ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
            <Icon className="h-6 w-6" strokeWidth={2.1} />
          </span>
        ) : null}
        <div>
          <h1 className="font-display text-xl font-extrabold leading-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}

/** Friendly empty state for lists/tables. */
export function EmptyState({ icon: Icon = Inbox, title, hint }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-background px-6 py-14 text-center"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" strokeWidth={2} />
      </span>
      <p className="font-display text-base font-bold text-foreground">{title}</p>
      {hint ? <p className="max-w-xs text-sm text-muted-foreground">{hint}</p> : null}
    </motion.div>
  );
}

/** Coloured status pill driven by the order status string. */
export function StatusPill({ status, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        STATUS_STYLES[status] || "bg-muted text-muted-foreground",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status] || "bg-muted-foreground")} />
      {t(statusKey(status))}
    </span>
  );
}

/** Shimmering skeleton card block. */
export function Skeleton({ className }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-muted", className)} aria-hidden />
  );
}

/** A stack of skeleton rows for loading lists. */
export function SkeletonList({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4 shadow-soft"
        >
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Accessible on/off switch matching the storefront toggle. */
export function Toggle({ checked, onChange, label, id }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold shadow-soft transition-colors hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-soft transition-all",
            checked ? "left-[1.375rem]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

/**
 * Two-step delete button: first click arms ("confirm?"), second click runs
 * `onConfirm`. Auto-disarms after a few seconds so it never gets stuck armed.
 */
export function ConfirmDelete({ onConfirm, busy, className }) {
  const [armed, setArmed] = useState(false);
  const click = () => {
    if (busy) return;
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 3500);
      return;
    }
    setArmed(false);
    onConfirm();
  };
  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        armed
          ? "bg-destructive text-destructive-foreground"
          : "bg-destructive/10 text-destructive hover:bg-destructive/15",
        className
      )}
    >
      {busy ? (
        <Spinner size={15} className="text-destructive" />
      ) : (
        <Trash2 className="h-4 w-4" strokeWidth={2.2} />
      )}
      {armed ? t("confirm_delete") : t("delete")}
    </button>
  );
}

/** Transient success toast, bottom-centre. Pass `message` (falsy to hide). */
export function Toast({ message }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          role="status"
          aria-live="polite"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="fixed inset-x-0 bottom-6 z-[60] mx-auto flex w-fit items-center gap-2 rounded-2xl bg-foreground px-4 py-3 text-sm font-bold text-background shadow-lift"
        >
          <CheckCircle2 className="h-5 w-5 text-accent" strokeWidth={2.4} />
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
