import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  ImagePlus,
  Package,
  Tag,
} from "lucide-react";
import api from "../../lib/api";
import { ready, isTelegram, initData } from "../../lib/telegram";
import { telegramLogin } from "../../lib/auth";
import { t } from "../../lib/i18n";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Select, Label } from "../../components/ui/Input";
import { ErrorAlert } from "../../components/ui/Alert";
import { Spinner } from "../../components/ui/Spinner";
import { cn } from "../../lib/cn";

const UNITS = ["dona", "kg", "litr", "portsiya"];

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold shadow-soft transition-colors hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-soft transition-all",
            checked ? "left-[1.375rem]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const reduce = useReducedMotion();
  const [cats, setCats] = useState([]);
  const [f, setF] = useState({
    name_ru: "",
    name_uz: "",
    price: "",
    unit: "dona",
    category: "",
    in_stock: true,
    is_hidden: false,
  });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    ready();
    let alive = true;
    const boot = async () => {
      if (isTelegram()) await telegramLogin(initData()).catch(() => {});
      const c = await api
        .get("/categories")
        .then((r) => r.data)
        .catch(() => []);
      if (alive) setCats(Array.isArray(c) ? c : c?.results || []);
      if (id) {
        const p = await api
          .get(`/products/${id}`)
          .then((r) => r.data)
          .catch(() => null);
        if (alive && p) setF({ ...p, category: p.category || "" });
      }
    };
    boot();
    return () => {
      alive = false;
    };
  }, [id]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const payload = { ...f, category: f.category || null };
      const saved = id
        ? await api.patch(`/products/${id}`, payload)
        : await api.post("/products", payload);
      if (file) {
        const fd = new FormData();
        fd.append("photo", file);
        await api.post(`/products/${saved.data.id}/photo`, fd);
      }
      setDone(true);
    } catch (e2) {
      setErr(e2?.response?.data?.detail || t("error"));
    } finally {
      setBusy(false);
    }
  };

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
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <CheckCircle2 className="h-9 w-9 text-accent" strokeWidth={2.2} />
            </span>
            <h1 className="font-display text-xl font-extrabold">{t("saved")}</h1>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-muted px-4 py-6">
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="mx-auto w-full max-w-md"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
            <Package className="h-6 w-6" strokeWidth={2.1} />
          </span>
          <h1 className="font-display text-xl font-extrabold">
            {id ? t("edit_product") : t("new_product")}
          </h1>
        </div>

        <Card className="p-4 sm:p-5">
          <form onSubmit={submit} className="space-y-3.5">
            <ErrorAlert message={err} />

            <div>
              <Label htmlFor="pf-ru">{t("name_ru")} 🇷🇺</Label>
              <Input
                id="pf-ru"
                required
                value={f.name_ru}
                onChange={set("name_ru")}
              />
            </div>

            <div>
              <Label htmlFor="pf-uz">{t("name_uz")} 🇺🇿</Label>
              <Input
                id="pf-uz"
                required
                value={f.name_uz}
                onChange={set("name_uz")}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pf-price">{t("price")}</Label>
                <Input
                  id="pf-price"
                  type="number"
                  min="0"
                  required
                  value={f.price}
                  onChange={set("price")}
                />
              </div>
              <div>
                <Label htmlFor="pf-unit">{t("unit")}</Label>
                <Select id="pf-unit" value={f.unit} onChange={set("unit")}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="pf-cat">{t("categories")}</Label>
              <div className="relative">
                <Tag
                  className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  strokeWidth={2}
                />
                <Select
                  id="pf-cat"
                  className="pl-9"
                  value={f.category}
                  onChange={set("category")}
                >
                  <option value="">— {t("no_category")} —</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_uz || c.name_ru}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="pf-photo">{t("photo")}</Label>
              <label
                htmlFor="pf-photo"
                className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-background px-3.5 text-sm font-semibold text-muted-foreground shadow-soft transition-colors hover:bg-muted"
              >
                <ImagePlus className="h-4 w-4" strokeWidth={2} />
                <span className="line-clamp-1">
                  {file ? file.name : t("photo")}
                </span>
              </label>
              <input
                id="pf-photo"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="space-y-2.5 pt-1">
              <Toggle
                checked={f.in_stock}
                onChange={(v) => setF((s) => ({ ...s, in_stock: v }))}
                label={t("in_stock")}
              />
              <Toggle
                checked={f.is_hidden}
                onChange={(v) => setF((s) => ({ ...s, is_hidden: v }))}
                label={t("is_hidden")}
              />
            </div>

            <Button type="submit" size="lg" disabled={busy} className="w-full">
              {busy ? <Spinner className="text-primary-foreground" /> : null}
              {t("save")}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
