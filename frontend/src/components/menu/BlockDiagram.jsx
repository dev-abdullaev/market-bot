import { BLOCK_TYPES, DEFAULT_VARIABLE_SLOTS } from "../../lib/showcase";
import { cn } from "../../lib/cn";

/**
 * Tiny visual sketch of a block's layout, used in the "+ Blok qo'shish" modal
 * cards and as a small badge on editor block headers. Renders rows of cells
 * proportional to the real grid.
 */
export function BlockDiagram({ type, className, accent = false }) {
  const def = BLOCK_TYPES[type];
  if (!def) return null;

  // Build the row template (variable blocks get a representative 2 rows).
  let rows;
  if (def.variable) {
    const cols = def.cols || 3;
    const n = DEFAULT_VARIABLE_SLOTS;
    rows = [];
    for (let i = 0; i < n; i += cols) rows.push(Math.min(cols, n - i));
  } else {
    rows = def.rows || [def.slots];
  }

  const cell = cn(
    "flex-1 rounded-[3px]",
    accent ? "bg-primary/70" : "bg-primary/25"
  );

  return (
    <div
      className={cn("flex flex-col gap-1", className)}
      aria-hidden
      data-kind={def.kind}
    >
      {rows.map((count, r) => (
        <div key={r} className="flex flex-1 gap-1">
          {Array.from({ length: count }).map((_, c) => (
            <span
              key={c}
              className={cn(
                cell,
                def.kind === "banner" && "bg-secondary/40",
                def.kind === "slider" && "bg-accent/35"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
