import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import { softSpring } from "../../lib/motion";

/**
 * Centered modal dialog built on Radix Dialog (focus trap, ESC, scroll lock,
 * a11y) animated with framer-motion. Unlike the right-side {@link Sheet}, this
 * is a centered surface sized for rich, multi-section forms. The body scrolls
 * while an optional `header`/`footer` stay pinned.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  header,
  footer,
  children,
  size = "lg",
  className,
}) {
  const reduce = useReducedMotion();
  const widths = {
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
    "2xl": "max-w-5xl",
    "3xl": "max-w-6xl",
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>

            <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
              <Dialog.Content asChild forceMount aria-describedby={undefined}>
                <motion.div
                  className={cn(
                    "relative flex max-h-[92svh] w-full flex-col overflow-hidden bg-background shadow-lift outline-none",
                    "rounded-t-3xl border border-border sm:rounded-2xl",
                    widths[size],
                    className
                  )}
                  initial={
                    reduce
                      ? { opacity: 0 }
                      : { opacity: 0, y: 28, scale: 0.97 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={
                    reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }
                  }
                  transition={softSpring}
                >
                  <Dialog.Title className="sr-only">{title}</Dialog.Title>
                  {description ? (
                    <Dialog.Description className="sr-only">
                      {description}
                    </Dialog.Description>
                  ) : null}

                  {header ? (
                    <div className="shrink-0 border-b border-border bg-background/95 px-4 pt-4 backdrop-blur sm:px-6">
                      {header}
                    </div>
                  ) : null}

                  <Dialog.Close
                    className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" strokeWidth={2.2} />
                  </Dialog.Close>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                    {children}
                  </div>

                  {footer ? (
                    <div className="shrink-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
                      {footer}
                    </div>
                  ) : null}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const ModalClose = Dialog.Close;
