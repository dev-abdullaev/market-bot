import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { softSpring } from "../../lib/motion";

/**
 * Right-side drawer built on Radix Dialog (focus trap, ESC, scroll lock,
 * a11y semantics) animated with framer-motion via AnimatePresence so the
 * exit transition plays before unmount.
 */
export function Sheet({ open, onOpenChange, children, title, description }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className={cn(
                  "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col",
                  "bg-background shadow-lift outline-none",
                  "rounded-l-2xl border-l border-border"
                )}
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={softSpring}
              >
                <Dialog.Title className="sr-only">{title}</Dialog.Title>
                {description ? (
                  <Dialog.Description className="sr-only">
                    {description}
                  </Dialog.Description>
                ) : null}
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const SheetClose = Dialog.Close;
