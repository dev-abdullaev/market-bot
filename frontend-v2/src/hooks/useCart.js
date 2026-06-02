import { useCallback, useEffect, useMemo, useState } from "react";

const KEY = "market-bot:cart:v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Cart state persisted to localStorage.
 * Shape: { [productId]: { product, qty } }
 */
export function useCart() {
  const [items, setItems] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* storage may be unavailable (private mode) — fail silently */
    }
  }, [items]);

  const add = useCallback((product, qty = 1) => {
    setItems((prev) => {
      const cur = prev[product.id];
      const nextQty = (cur?.qty ?? 0) + qty;
      return { ...prev, [product.id]: { product, qty: nextQty } };
    });
  }, []);

  const setQty = useCallback((id, qty) => {
    setItems((prev) => {
      if (qty <= 0) {
        const rest = { ...prev };
        delete rest[id];
        return rest;
      }
      if (!prev[id]) return prev;
      return { ...prev, [id]: { ...prev[id], qty } };
    });
  }, []);

  const remove = useCallback((id) => {
    setItems((prev) => {
      const rest = { ...prev };
      delete rest[id];
      return rest;
    });
  }, []);

  const clear = useCallback(() => setItems({}), []);

  const list = useMemo(() => Object.values(items), [items]);

  const count = useMemo(
    () => list.reduce((sum, l) => sum + l.qty, 0),
    [list]
  );

  const total = useMemo(
    () => list.reduce((sum, l) => sum + l.qty * Number(l.product.price || 0), 0),
    [list]
  );

  return { items, list, count, total, add, setQty, remove, clear };
}
