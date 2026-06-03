import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Html, OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";

/* Brand axis colours (match talablar): length=blue, width=green, height=orange. */
const C_LENGTH = "#2563EB";
const C_WIDTH = "#059669";
const C_HEIGHT = "#F97316";

/**
 * Normalise the three cm dimensions to a tidy on-screen scale.
 *
 * The largest dimension maps to 1.6 units; the others stay proportional. A
 * floor keeps any axis from collapsing (so a 0/empty value still renders a
 * readable slab). When every dimension is empty we fall back to a unit cube.
 */
function useScaled(length, width, height) {
  return useMemo(() => {
    const L = Math.max(0, Number(length) || 0);
    const W = Math.max(0, Number(width) || 0);
    const H = Math.max(0, Number(height) || 0);
    const empty = L === 0 && W === 0 && H === 0;

    const max = Math.max(L, W, H, 1);
    const TARGET = 2.1; // largest edge length in scene units
    const FLOOR = 0.45; // smallest edge so nothing disappears
    const norm = (v) => (empty ? 1 : Math.max(FLOOR, (v / max) * TARGET));

    return {
      // three.js box: args = [x(width), y(height), z(length/depth)]
      sx: norm(W),
      sy: norm(H),
      sz: norm(L),
      empty,
      L,
      W,
      H,
    };
  }, [length, width, height]);
}

/** Small colour-coded pill rendered in screen space next to an edge. */
function AxisLabel({ position, color, label, value }) {
  return (
    <Html position={position} center zIndexRange={[10, 0]}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 9px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.95)",
          border: `1.5px solid ${color}`,
          color,
          fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif",
          fontWeight: 800,
          fontSize: 11,
          lineHeight: 1,
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px -2px rgba(15,23,42,0.25)",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        <span style={{ opacity: 0.75 }}>{label}</span>
        <span>{value > 0 ? `${value} sm` : "—"}</span>
      </div>
    </Html>
  );
}

/** The translucent box + crisp edges + the three dimension labels. */
function Box({ length, width, height, autoRotate }) {
  const group = useRef(null);
  const { sx, sy, sz, empty, L, W, H } = useScaled(length, width, height);

  // Gentle auto-rotation (skipped under prefers-reduced-motion).
  useFrame((_, delta) => {
    if (autoRotate && group.current) group.current.rotation.y += delta * 0.35;
  });

  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;

  return (
    <group ref={group}>
      <mesh>
        <boxGeometry args={[sx, sy, sz]} />
        <meshStandardMaterial
          color="#60A5FA"
          transparent
          opacity={0.28}
          roughness={0.35}
          metalness={0.05}
          depthWrite={false}
        />
        {/* Crisp blue wireframe along the cube edges. */}
        <Edges threshold={1} color={C_LENGTH} />
      </mesh>

      {/* Width (X) — front-bottom edge, green. */}
      <AxisLabel
        position={[0, -hy - 0.06, hz + 0.02]}
        color={C_WIDTH}
        label="Kenglik"
        value={W}
      />
      {/* Height (Y) — front-right vertical edge, orange. */}
      <AxisLabel
        position={[hx + 0.06, 0, hz + 0.02]}
        color={C_HEIGHT}
        label="Balandlik"
        value={H}
      />
      {/* Length / depth (Z) — right-bottom edge, blue. */}
      <AxisLabel
        position={[hx + 0.06, -hy - 0.06, 0]}
        color={C_LENGTH}
        label="Uzunlik"
        value={L}
      />

      {empty ? (
        <Html position={[0, hy + 0.35, 0]} center>
          <span
            style={{
              fontFamily: "Rubik, ui-sans-serif, system-ui, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              color: "#64748B",
              whiteSpace: "nowrap",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            o&apos;lchamlarni kiriting
          </span>
        </Html>
      ) : null}
    </group>
  );
}

/**
 * A real, interactive 3D package box. Rotate with the mouse (OrbitControls),
 * limited zoom, gentle auto-rotate. The box proportions and the three
 * dimension labels update live as the L/W/H inputs change.
 */
export default function DimensionsBox3D({ length, width, height }) {
  const reduce = useReducedMotion();

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-72 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-muted to-primary/5 shadow-soft">
        <Canvas
          className="cursor-grab active:cursor-grabbing"
          dpr={[1, 2]}
          camera={{ position: [3.1, 2.4, 3.6], fov: 40 }}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
        >
          <color attach="background" args={["#F1F5FD"]} />
          <ambientLight intensity={0.85} />
          <directionalLight position={[4, 6, 5]} intensity={1.1} />
          <directionalLight position={[-3, -2, -4]} intensity={0.25} />

          <Box
            length={length}
            width={width}
            height={height}
            autoRotate={!reduce}
          />

          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom
            minDistance={2.4}
            maxDistance={6}
            autoRotate={false}
            enableDamping
            dampingFactor={0.08}
          />
        </Canvas>
      </div>
      <p className="px-1 text-xs leading-snug text-muted-foreground">
        Sichqoncha bilan aylantiring. Uzunlik, kenglik va balandlikni kiriting —
        kub real vaqtda o&apos;zgaradi.
      </p>
    </div>
  );
}
