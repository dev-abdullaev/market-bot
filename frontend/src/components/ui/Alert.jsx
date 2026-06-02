import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { cn } from "../../lib/cn";

/**
 * Animated inline error alert. Renders nothing when `message` is falsy so it
 * can be dropped straight into a form with AnimatePresence handling enter/exit.
 */
export function ErrorAlert({ message, className }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.div
          role="alert"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, height: 0 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, height: "auto" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.22 }}
          className={cn("overflow-hidden", className)}
        >
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2.2} />
            <span>{message}</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
