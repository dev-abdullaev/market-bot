import { useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GripVertical, ImageOff, LayoutTemplate, Plus, Trash2, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { catName } from "../../lib/products";
import { t, tf } from "../../lib/i18n";
import { BLOCK_TYPES, blockRows, filledCount } from "../../lib/showcase";
import { Input } from "../ui/Input";
import { EmptyState } from "../panel/common";
import { BlockDiagram } from "./BlockDiagram";

/** A single droppable slot. Shows the filled category or a "drop here" hint. */
function Slot({ blockId, index, value, byId, isOver, onRemove }) {
  const { setNodeRef, isOver: over } = useDroppable({
    id: `slot:${blockId}:${index}`,
    data: { type: "slot", blockId, index },
  });
  const cat = value != null ? byId.get(value) : null;
  const active = over || isOver;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex min-h-[3.25rem] items-center gap-2 rounded-xl border p-1.5 transition-colors",
        value != null
          ? "border-border bg-muted/50"
          : "border-dashed border-border bg-background",
        active && "border-primary bg-primary/10 ring-2 ring-primary/40"
      )}
    >
      {value != null && cat ? (
        <>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {cat.image_url ? (
              <img src={cat.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <ImageOff className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
            )}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
            {catName(cat) || `#${value}`}
          </span>
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("mc_remove_slot")}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </>
      ) : value != null ? (
        // Filled with an id that is no longer a known category.
        <span className="flex-1 px-1.5 text-xs font-bold text-muted-foreground">
          #{value}
          <button
            type="button"
            onClick={onRemove}
            className="ml-2 text-destructive underline cursor-pointer"
          >
            ×
          </button>
        </span>
      ) : (
        <div className="flex flex-1 items-center gap-2 px-1.5 text-xs font-semibold text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-[10px] font-extrabold text-primary">
            {index + 1}
          </span>
          <span>{tf("mc_slot", { n: index + 1 })} — {t("mc_slot_empty")}</span>
        </div>
      )}
    </div>
  );
}

/** One block card: header (#n type filled/total), title input, slot grid. */
function BlockCard({ block, n, byId, overId, onTitle, onRemoveSlot, onAddSlot, onDelete }) {
  const reduce = useReducedMotion();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id, data: { type: "block" } });
  const def = BLOCK_TYPES[block.type] || {};
  const rows = blockRows(block);
  const total = block.slots?.length || 0;
  const filled = filledCount(block);

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout={!reduce}
      className={cn(
        "rounded-2xl border border-border bg-background p-3 shadow-soft",
        isDragging && "z-10 opacity-70 shadow-lift"
      )}
    >
      {/* Header */}
      <div className="mb-2.5 flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Reorder block"
          className="flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <GripVertical className="h-4 w-4" strokeWidth={2} />
        </button>
        <BlockDiagram type={block.type} className="h-8 w-8 shrink-0 rounded-md bg-muted p-1" accent />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-foreground">
            #{n} {t(def.label || block.type)}
          </p>
          <p className="text-xs font-semibold text-muted-foreground">
            {filled}/{total}
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t("mc_delete_block")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition-colors hover:bg-destructive/15 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>

      <Input
        value={block.title || ""}
        onChange={(e) => onTitle(e.target.value)}
        placeholder={t("mc_block_title_ph")}
        className="mb-2.5 h-9"
      />

      {/* Slots laid out matching the block geometry */}
      <div className="space-y-1.5">
        {rows.map((cells, r) => (
          <div
            key={r}
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${Math.min(cells.length || 1, 3)}, minmax(0, 1fr))` }}
          >
            {cells.map((cell) => (
              <Slot
                key={cell.index}
                blockId={block.id}
                index={cell.index}
                value={cell.value}
                byId={byId}
                isOver={overId === `slot:${block.id}:${cell.index}`}
                onRemove={() => onRemoveSlot(cell.index)}
              />
            ))}
          </div>
        ))}
      </div>

      {def.variable ? (
        <button
          type="button"
          onClick={onAddSlot}
          className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/15 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
          {t("mc_add_slot")}
        </button>
      ) : null}
    </motion.div>
  );
}

/**
 * Right column: the list of block cards. Blocks reorder via dnd-kit sortable;
 * categories drop into slots (handled by the parent DndContext).
 */
export function BlockEditor({ blocks, byId, overId, onChange }) {
  const reduce = useReducedMotion();

  const patchBlock = (id, patch) =>
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const removeSlot = (blockId, index) =>
    onChange(
      blocks.map((b) => {
        if (b.id !== blockId) return b;
        const def = BLOCK_TYPES[b.type] || {};
        if (def.variable) {
          // Remove the slot entirely for variable blocks.
          return { ...b, slots: b.slots.filter((_, i) => i !== index) };
        }
        const slots = b.slots.slice();
        slots[index] = null;
        return { ...b, slots };
      })
    );

  const addSlot = (blockId) =>
    onChange(
      blocks.map((b) => (b.id === blockId ? { ...b, slots: [...b.slots, null] } : b))
    );

  const deleteBlock = (id) => onChange(blocks.filter((b) => b.id !== id));

  if (blocks.length === 0) {
    return (
      <EmptyState icon={LayoutTemplate} title={t("mc_no_blocks")} hint={t("mc_no_blocks_hint")} />
    );
  }

  return (
    <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
      <motion.div layout={!reduce} className="space-y-3">
        <AnimatePresence initial={false}>
          {blocks.map((block, i) => (
            <motion.div
              key={block.id}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
            >
              <BlockCard
                block={block}
                n={i + 1}
                byId={byId}
                overId={overId}
                onTitle={(title) => patchBlock(block.id, { title })}
                onRemoveSlot={(idx) => removeSlot(block.id, idx)}
                onAddSlot={() => addSlot(block.id)}
                onDelete={() => deleteBlock(block.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </SortableContext>
  );
}
