import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { motion, useReducedMotion } from "framer-motion";
import { LayoutTemplate, Plus, Save } from "lucide-react";
import api from "../../lib/api";
import { asList } from "../../lib/panel";
import { t } from "../../lib/i18n";
import { indexCategories } from "../../lib/products";
import {
  TOGGLES,
  makeBlockId,
  normaliseConfig,
  slotCountFor,
} from "../../lib/showcase";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { PageHeader, Toast, Toggle, SkeletonList } from "../../components/panel/common";
import { PhonePreview } from "../../components/menu/PhonePreview";
import { CategoryPalette, CategoryChipBody } from "../../components/menu/CategoryPalette";
import { BlockEditor } from "../../components/menu/BlockEditor";
import { AddBlockModal } from "../../components/menu/AddBlockModal";

const serialise = (cfg) => JSON.stringify(cfg);

export default function MenuConstructor() {
  const reduce = useReducedMotion();
  const [config, setConfig] = useState(null);
  const [categories, setCategories] = useState([]);
  const [counts, setCounts] = useState(new Map());
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Drag state for the DragOverlay + slot highlight.
  const [activeCat, setActiveCat] = useState(null);
  const [overId, setOverId] = useState(null);

  // Baseline serialisation (last loaded/saved state) to detect unsaved changes.
  const [baseline, setBaseline] = useState("");
  const dirty = config ? serialise(config) !== baseline : false;

  const catIndex = useMemo(() => indexCategories(categories), [categories]);
  const byId = catIndex.byId;

  // --- Load ---
  useEffect(() => {
    let alive = true;
    (async () => {
      const [store, cats, products] = await Promise.all([
        api.get("/stores/me").then((r) => r.data).catch(() => null),
        api.get("/categories").then((r) => asList(r.data)).catch(() => []),
        api.get("/products").then((r) => asList(r.data)).catch(() => []),
      ]);
      if (!alive) return;
      const cfg = normaliseConfig(store?.showcase_config);
      setBaseline(serialise(cfg));
      setConfig(cfg);
      setStoreName(store?.name || "");
      setCategories(cats);
      const m = new Map();
      for (const p of products) {
        const c = Number(p.category);
        if (!Number.isNaN(c)) m.set(c, (m.get(c) || 0) + 1);
      }
      setCounts(m);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  // --- Mutators ---
  const setToggle = (key, val) => setConfig((c) => ({ ...c, [key]: val }));
  const setBlocks = useCallback(
    (blocks) => setConfig((c) => ({ ...c, blocks })),
    []
  );
  const setIcon = (key, val) =>
    setConfig((c) => ({ ...c, menu_icons: { ...c.menu_icons, [key]: val } }));

  const addBlock = (type) => {
    const block = {
      id: makeBlockId(),
      type,
      title: "",
      slots: Array(slotCountFor(type)).fill(null),
    };
    setConfig((c) => ({ ...c, blocks: [...c.blocks, block] }));
  };

  // --- DnD ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const onDragStart = (e) => {
    const data = e.active.data.current;
    if (data?.type === "category") {
      setActiveCat(byId.get(data.catId) || null);
    }
  };

  const onDragOver = (e) => {
    setOverId(e.over?.id ?? null);
  };

  const onDragEnd = (e) => {
    const { active, over } = e;
    setActiveCat(null);
    setOverId(null);
    if (!over) return;
    const aData = active.data.current;
    const oData = over.data.current;

    // Category → slot.
    if (aData?.type === "category" && oData?.type === "slot") {
      setConfig((c) => ({
        ...c,
        blocks: c.blocks.map((b) => {
          if (b.id !== oData.blockId) return b;
          const slots = b.slots.slice();
          slots[oData.index] = aData.catId;
          return { ...b, slots };
        }),
      }));
      return;
    }

    // Block reorder (sortable).
    if (aData?.type === "block" && active.id !== over.id) {
      setConfig((c) => {
        const from = c.blocks.findIndex((b) => b.id === active.id);
        const to = c.blocks.findIndex((b) => b.id === over.id);
        if (from === -1 || to === -1) return c;
        return { ...c, blocks: arrayMove(c.blocks, from, to) };
      });
    }
  };

  const onDragCancel = () => {
    setActiveCat(null);
    setOverId(null);
  };

  // --- Save ---
  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { data } = await api.patch("/stores/me", { showcase_config: config });
      const saved = normaliseConfig(data?.showcase_config ?? config);
      setBaseline(serialise(saved));
      setConfig(saved);
      setToast(t("mc_saved"));
    } catch {
      setToast(t("mc_save_failed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div>
        <PageHeader icon={LayoutTemplate} title={t("mc_title")} subtitle={t("mc_subtitle")} />
        <SkeletonList rows={5} />
      </div>
    );
  }

  return (
    <div className="pb-10">
      <PageHeader
        icon={LayoutTemplate}
        title={t("mc_title")}
        subtitle={t("mc_subtitle")}
        action={
          <>
            {dirty ? (
              <motion.span
                initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600 sm:inline-flex"
              >
                {t("mc_unsaved")}
              </motion.span>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              <span className="hidden sm:inline">{t("mc_add_block")}</span>
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !dirty}>
              {saving ? (
                <Spinner size={15} className="text-primary-foreground" />
              ) : (
                <Save className="h-4 w-4" strokeWidth={2.3} />
              )}
              {t("save")}
            </Button>
          </>
        }
      />

      {/* Top-bar toggles */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {TOGGLES.map((tg) => (
          <Toggle
            key={tg.key}
            id={`mc-${tg.key}`}
            checked={Boolean(config[tg.key])}
            onChange={(v) => setToggle(tg.key, v)}
            label={t(tg.label)}
          />
        ))}
      </div>

      {dirty ? (
        <p className="mb-4 text-xs font-bold text-amber-600 sm:hidden">{t("mc_unsaved")}</p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* LEFT — phone preview */}
          <div className="order-1">
            <PhonePreview config={config} storeName={storeName} byId={byId} />
          </div>

          {/* MIDDLE — categories / icons */}
          <div className="order-2">
            <CategoryPalette
              categories={categories}
              counts={counts}
              menuIcons={config.menu_icons}
              onIconChange={setIcon}
            />
          </div>

          {/* RIGHT — block editor */}
          <div className="order-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-sm font-bold text-foreground">
                {t("mc_blocks_title")}
              </p>
              <Button variant="soft" size="sm" onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4" strokeWidth={2.4} />
                {t("mc_add_block")}
              </Button>
            </div>
            <BlockEditor
              blocks={config.blocks}
              byId={byId}
              overId={overId}
              onChange={setBlocks}
            />
          </div>
        </div>

        {/* Drag preview chip */}
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2,0,0,1)" }}>
          {activeCat ? (
            <div className="w-64 rotate-1">
              <CategoryChipBody cat={activeCat} count={counts.get(activeCat.id)} dragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <AddBlockModal open={modalOpen} onOpenChange={setModalOpen} onPick={addBlock} />
      <Toast message={toast} />
    </div>
  );
}
