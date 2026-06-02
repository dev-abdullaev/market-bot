import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  MapPin,
  Minus,
  Phone,
  Plus,
  ShoppingBag,
  Trash2,
  User,
} from "lucide-react";
import api from "../lib/api";
import { useCart } from "../hooks/useCart";
import { tg, tgUser } from "../lib/telegram";
import { t } from "../lib/i18n";
import { localName, formatPrice } from "../lib/format";
import { spring, lineItem } from "../lib/motion";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { ErrorAlert } from "../components/ui/Alert";
import { Spinner } from "../components/ui/Spinner";
import { ProductImage } from "../components/ProductImage";

function Stepper({ qty, onDec, onInc }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-muted/60 p-0.5">
      <button
        type="button"
        onClick={onDec}
        aria-label={t("delete")}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-background text-foreground shadow-soft transition-colors hover:text-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2.6} />
      </button>
      <motion.span
        key={qty}
        initial={{ scale: 0.6, opacity: 0.4 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring}
        className="w-7 text-center text-sm font-extrabold tabular-nums"
      >
        {qty}
      </motion.span>
      <button
        type="button"
        onClick={onInc}
        aria-label={t("add")}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
      </button>
    </div>
  );
}

export default function Checkout() {
  const { slug } = useParams();
  const nav = useNavigate();
  const reduce = useReducedMotion();
  const cart = useCart();
  const { list, total, setQty, remove, clear } = cart;

  const [store, setStore] = useState(null);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    delivery_address: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get(`/shop/${slug}`)
      .then((r) => {
        if (alive) setStore(r.data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug]);

  const currency = store?.currency_code || "UZS";
  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const u = tgUser();
      await api.post("/orders", {
        store: store?.id,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        delivery_address: form.delivery_address,
        telegram_id: u ? String(u.id) : "",
        items: list.map((l) => ({ product: l.product.id, quantity: l.qty })),
      });
      clear();
      setDone(true);
      if (tg()) setTimeout(() => tg().close(), 1600);
    } catch (e2) {
      // Must surface the error, never fail silently.
      setErr(e2?.response?.data?.detail || t("order_failed"));
    } finally {
      setBusy(false);
    }
  };

  // --- success state ---
  if (done) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted px-4">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="w-full max-w-sm"
        >
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <motion.span
              initial={reduce ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.1 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10"
            >
              <CheckCircle2 className="h-9 w-9 text-accent" strokeWidth={2.2} />
            </motion.span>
            <h1 className="font-display text-xl font-extrabold">
              {t("order_placed")}
            </h1>
          </Card>
        </motion.div>
      </div>
    );
  }

  // --- empty cart state ---
  if (list.length === 0) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted px-4">
        <Card className="flex w-full max-w-sm flex-col items-center gap-3 p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <ShoppingBag className="h-7 w-7 text-primary/40" strokeWidth={1.8} />
          </span>
          <p className="font-display text-base font-bold">{t("cart_empty")}</p>
          <p className="max-w-[15rem] text-sm text-muted-foreground">
            {t("cart_empty_hint")}
          </p>
          <Button
            variant="soft"
            className="mt-1 rounded-full"
            onClick={() => nav(`/shop/${slug}`)}
          >
            {t("continue_shopping")}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-muted">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("back")}
          className="rounded-full"
          onClick={() => nav(`/shop/${slug}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-lg font-extrabold">{t("checkout")}</h1>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 py-5">
        {/* Cart lines */}
        <Card className="p-4">
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
            <ShoppingBag className="h-5 w-5 text-primary" strokeWidth={2.1} />
            {t("order_summary")}
          </h2>
          <ul className="space-y-2.5">
            <AnimatePresence initial={false}>
              {list.map(({ product, qty }) => (
                <motion.li
                  key={product.id}
                  layout
                  variants={lineItem}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex gap-3 overflow-hidden rounded-2xl border border-border bg-background p-2.5"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <ProductImage src={product.photo_url} alt={localName(product)} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="line-clamp-1 text-sm font-bold">
                      {localName(product)}
                    </p>
                    <p className="text-xs font-semibold text-accent">
                      {formatPrice(product.price, currency)}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-1.5">
                      <Stepper
                        qty={qty}
                        onDec={() => setQty(product.id, qty - 1)}
                        onInc={() => setQty(product.id, qty + 1)}
                      />
                      <button
                        type="button"
                        onClick={() => remove(product.id)}
                        aria-label={t("delete")}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2.1} />
                      </button>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-semibold text-muted-foreground">
              {t("total")}
            </span>
            <motion.span
              key={total}
              initial={{ scale: 0.85, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring}
              className="font-display text-xl font-extrabold"
            >
              {formatPrice(total, currency)}
            </motion.span>
          </div>
        </Card>

        {/* Customer form */}
        <Card className="p-4">
          <h2 className="mb-3 font-display text-base font-bold">
            {t("customer_info")}
          </h2>
          <form onSubmit={submit} className="space-y-3">
            <ErrorAlert message={err} />
            <div>
              <Label htmlFor="co-name">{t("name")}</Label>
              <Input
                id="co-name"
                icon={User}
                required
                value={form.customer_name}
                onChange={set("customer_name")}
              />
            </div>
            <div>
              <Label htmlFor="co-phone">{t("phone")}</Label>
              <Input
                id="co-phone"
                icon={Phone}
                type="tel"
                required
                value={form.customer_phone}
                onChange={set("customer_phone")}
              />
            </div>
            <div>
              <Label htmlFor="co-addr">{t("address_optional")}</Label>
              <Input
                id="co-addr"
                icon={MapPin}
                value={form.delivery_address}
                onChange={set("delivery_address")}
              />
            </div>
            <Button
              type="submit"
              variant="accent"
              size="lg"
              disabled={busy || !store?.id}
              className="w-full"
            >
              {busy ? (
                <Spinner className="text-accent-foreground" />
              ) : (
                <BadgeCheck className="h-5 w-5" strokeWidth={2.2} />
              )}
              {t("place_order")}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
