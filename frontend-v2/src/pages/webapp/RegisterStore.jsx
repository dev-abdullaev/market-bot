import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  MapPin,
  Phone,
  Store,
  Tag,
  Type,
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

const ACTIVITIES = ["market", "restoran", "apteka", "kiyim", "boshqa"];

export default function RegisterStore() {
  const reduce = useReducedMotion();
  const [f, setF] = useState({
    name: "",
    activity_type: "market",
    phone: "",
    address: "",
    latitude: null,
    longitude: null,
  });
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    ready();
    if (isTelegram()) telegramLogin(initData()).catch(() => {});
  }, []);

  const geo = () =>
    navigator.geolocation?.getCurrentPosition((p) =>
      setF((s) => ({
        ...s,
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
      }))
    );

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post("/stores", f);
      setRes(data);
    } catch (e2) {
      setErr(e2?.response?.data?.detail || t("error"));
    } finally {
      setBusy(false);
    }
  };

  if (res) {
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
            <h1 className="font-display text-xl font-extrabold">
              {t("store_created")}
            </h1>
            <p className="text-sm font-semibold text-foreground">{res.name}</p>
            <code className="rounded-lg bg-muted px-2.5 py-1 text-xs font-bold text-primary">
              /shop/{res.slug}
            </code>
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
            <Store className="h-6 w-6" strokeWidth={2.1} />
          </span>
          <h1 className="font-display text-xl font-extrabold">
            {t("register_store")}
          </h1>
        </div>

        <Card className="p-4 sm:p-5">
          <form onSubmit={submit} className="space-y-3.5">
            <ErrorAlert message={err} />

            <div>
              <Label htmlFor="rs-name">{t("store_name")}</Label>
              <Input
                id="rs-name"
                icon={Type}
                required
                value={f.name}
                onChange={set("name")}
              />
            </div>

            <div>
              <Label htmlFor="rs-activity">{t("activity_type")}</Label>
              <div className="relative">
                <Tag
                  className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  strokeWidth={2}
                />
                <Select
                  id="rs-activity"
                  className="pl-9"
                  value={f.activity_type}
                  onChange={set("activity_type")}
                >
                  {ACTIVITIES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="rs-phone">{t("phone")}</Label>
              <Input
                id="rs-phone"
                icon={Phone}
                type="tel"
                required
                value={f.phone}
                onChange={set("phone")}
              />
            </div>

            <div>
              <Label htmlFor="rs-addr">{t("address")}</Label>
              <Input
                id="rs-addr"
                icon={MapPin}
                value={f.address}
                onChange={set("address")}
              />
            </div>

            <Button
              type="button"
              variant={f.latitude ? "soft" : "outline"}
              className="w-full"
              onClick={geo}
            >
              <MapPin className="h-4 w-4" strokeWidth={2.1} />
              {f.latitude ? t("location_set") : t("get_location")}
            </Button>

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
