// Shared framer-motion variants & transitions.
// A reduced-motion guard is layered on top in useReducedMotion-aware components.

export const spring = { type: "spring", stiffness: 420, damping: 32 };
export const softSpring = { type: "spring", stiffness: 260, damping: 28 };

// Container that staggers its children into view.
export const gridContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

// Per-card entrance.
export const cardItem = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 26 },
  },
};

// Cart line-item add/remove.
export const lineItem = {
  hidden: { opacity: 0, x: 28, height: 0 },
  visible: { opacity: 1, x: 0, height: "auto", transition: softSpring },
  exit: { opacity: 0, x: 40, height: 0, transition: { duration: 0.2 } },
};
