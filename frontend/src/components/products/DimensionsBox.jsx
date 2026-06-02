import { motion, useReducedMotion } from "framer-motion";

/**
 * A pure-CSS 3D perspective box that visually reflects package dimensions.
 * Width/height/depth are derived from the cm/kg inputs and clamped to a
 * pleasant on-screen range — no Three.js. Animates smoothly as dims change.
 */
export function DimensionsBox({ length, width, height }) {
  const reduce = useReducedMotion();

  // Normalise dims to a 0.4..1 visual scale so an empty/tiny box still reads.
  const L = clamp(Number(length) || 0);
  const W = clamp(Number(width) || 0);
  const H = clamp(Number(height) || 0);

  const max = Math.max(L, W, H, 1);
  const px = (v) => 56 + (clampNum(v, 0, max) / max) * 92; // 56..148px

  const w = px(W); // box width  (X)
  const h = px(H); // box height (Y)
  const d = px(L); // box depth  (Z)

  const faceBase =
    "absolute inset-0 border border-primary/40 shadow-[0_0_0_1px_rgba(37,99,235,0.06)]";

  const tx = { type: "spring", stiffness: 160, damping: 22 };

  return (
    <div
      className="relative flex h-44 items-center justify-center rounded-2xl border border-border bg-gradient-to-br from-muted to-primary/5"
      style={{ perspective: "640px" }}
      aria-hidden
    >
      <motion.div
        className="relative"
        style={{ transformStyle: "preserve-3d" }}
        initial={false}
        animate={{ rotateX: -22, rotateY: -34 }}
        transition={reduce ? { duration: 0 } : tx}
      >
        <motion.div
          className="relative"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ width: w, height: h }}
          transition={reduce ? { duration: 0 } : tx}
        >
          {/* front */}
          <motion.div
            className={`${faceBase} bg-primary/25`}
            animate={{ transform: `translateZ(${d / 2}px)` }}
            transition={reduce ? { duration: 0 } : tx}
          />
          {/* back */}
          <motion.div
            className={`${faceBase} bg-primary/15`}
            animate={{ transform: `translateZ(${-d / 2}px) rotateY(180deg)` }}
            transition={reduce ? { duration: 0 } : tx}
          />
          {/* right */}
          <motion.div
            className={`${faceBase} bg-primary/35`}
            style={{ width: d, left: w / 2 - d / 2 }}
            animate={{
              transform: `rotateY(90deg) translateZ(${w / 2}px)`,
            }}
            transition={reduce ? { duration: 0 } : tx}
          />
          {/* left */}
          <motion.div
            className={`${faceBase} bg-primary/20`}
            style={{ width: d, left: w / 2 - d / 2 }}
            animate={{
              transform: `rotateY(-90deg) translateZ(${w / 2}px)`,
            }}
            transition={reduce ? { duration: 0 } : tx}
          />
          {/* top */}
          <motion.div
            className={`${faceBase} bg-primary/45`}
            style={{ height: d, top: h / 2 - d / 2 }}
            animate={{
              transform: `rotateX(90deg) translateZ(${h / 2}px)`,
            }}
            transition={reduce ? { duration: 0 } : tx}
          />
          {/* bottom */}
          <motion.div
            className={`${faceBase} bg-primary/10`}
            style={{ height: d, top: h / 2 - d / 2 }}
            animate={{
              transform: `rotateX(-90deg) translateZ(${h / 2}px)`,
            }}
            transition={reduce ? { duration: 0 } : tx}
          />
        </motion.div>
      </motion.div>

      <span className="absolute bottom-2 right-3 font-display text-[11px] font-bold text-primary/60">
        {fmt(width)}×{fmt(length)}×{fmt(height)} sm
      </span>
    </div>
  );
}

function clamp(v) {
  return clampNum(v, 0, 1000);
}
function clampNum(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}
function fmt(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : "—";
}
