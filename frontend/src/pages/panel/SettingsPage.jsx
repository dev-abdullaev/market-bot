import { useEffect, useState } from "react";
import api from "../../lib/api.js";
import { t } from "../../lib/i18n.js";
import Spinner from "../../components/Spinner.jsx";

/* Reusable field helpers ----------------------------------- */
function Field({ label, children, col = "col-12 col-md-6" }) {
  return (
    <div className={col}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}
function Toggle({ label, name, value, on }) {
  return (
    <div className="form-check form-switch py-1">
      <input className="form-check-input" type="checkbox" role="switch" id={name}
        checked={!!value} onChange={(e) => on(name, e.target.checked)}
        style={{ cursor: "pointer" }} />
      <label className="form-check-label" htmlFor={name} style={{ cursor: "pointer" }}>{label}</label>
    </div>
  );
}
function Section({ icon, title, children, first }) {
  return (
    <div className="card mb-3">
      <div className="card-body">
        <h2 className={`h6 ${first ? "" : ""} mb-3 d-flex align-items-center`}>
          <i className={`bi ${icon} me-2 text-primary`} />{title}
        </h2>
        <div className="row g-3">{children}</div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/stores/me").then((r) => setF({ telegram_bot_token: "", ...r.data })).catch(() => setF({}));
  }, []);

  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setOk(false); };
  const onChange = (e) => set(e.target.name, e.target.value);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(""); setOk(false);
    try {
      const payload = { ...f };
      // don't send empty bot token (write-only; keep existing)
      if (!payload.telegram_bot_token) delete payload.telegram_bot_token;
      await api.patch("/stores/me", payload);
      setOk(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Xatolik");
    } finally { setBusy(false); }
  };

  if (!f) return <Spinner />;

  const inp = (name, props = {}) => (
    <input className="form-control" name={name} value={f[name] ?? ""} onChange={onChange} {...props} />
  );

  return (
    <form onSubmit={submit}>
      {ok && (
        <div className="alert alert-success d-flex align-items-center gap-2">
          <i className="bi bi-check-circle-fill" /><span>{t("saved")}</span>
        </div>
      )}
      {err && <div className="alert alert-danger py-2">{err}</div>}

      <Section icon="bi-shop" title={t("store_open")} first>
        <Field label={t("store_name")}>{inp("name")}</Field>
        <Field label={t("phone")}>{inp("phone")}</Field>
        <Field label={t("address")} col="col-12">{inp("address")}</Field>
        <Field label="Support username">{inp("support_username", { placeholder: "@help" })}</Field>
        <Field label="Logo URL">{inp("logo_url", { placeholder: "https://..." })}</Field>
      </Section>

      <Section icon="bi-clock" title={t("work_hours")}>
        <Field label="Ochilish" col="col-6 col-md-4">{inp("open_time", { type: "time" })}</Field>
        <Field label="Yopilish" col="col-6 col-md-4">{inp("close_time", { type: "time" })}</Field>
        <Field label="Timezone" col="col-12 col-md-4">{inp("timezone", { placeholder: "Asia/Tashkent" })}</Field>
      </Section>

      <Section icon="bi-truck" title={t("delivery")}>
        <div className="col-12">
          <Toggle label="Yetkazib berish yoqilgan" name="is_delivery_enabled" value={f.is_delivery_enabled} on={set} />
          <Toggle label="O'zi olib ketish (pickup)" name="is_pickup_enabled" value={f.is_pickup_enabled} on={set} />
        </div>
        <Field label="Narx rejimi">
          <select className="form-select" name="delivery_pricing_mode"
            value={f.delivery_pricing_mode ?? "dynamic"} onChange={onChange}>
            <option value="dynamic">Dinamik (km bo'yicha)</option>
            <option value="fixed">Qat'iy (fixed)</option>
          </select>
        </Field>
        <Field label="Minimal buyurtma">{inp("minimum_order_amount", { type: "number", min: 0 })}</Field>
        {f.delivery_pricing_mode === "fixed" ? (
          <Field label="Qat'iy narx">{inp("delivery_fixed_price", { type: "number", min: 0 })}</Field>
        ) : (
          <>
            <Field label="Baza radius (km)" col="col-6 col-md-3">{inp("delivery_base_radius", { type: "number", min: 0 })}</Field>
            <Field label="Baza narx" col="col-6 col-md-3">{inp("delivery_base_price", { type: "number", min: 0 })}</Field>
            <Field label="Narx / km" col="col-6 col-md-3">{inp("delivery_price_per_km", { type: "number", min: 0 })}</Field>
          </>
        )}
        <Field label="Xizmat haqi (service fee)">{inp("service_fee", { type: "number", min: 0 })}</Field>
      </Section>

      <Section icon="bi-credit-card" title={t("payment")}>
        <div className="col-12">
          <Toggle label="Naqd (cash)" name="cash_enabled" value={f.cash_enabled} on={set} />
          <Toggle label="Karta orqali" name="card_enabled" value={f.card_enabled} on={set} />
        </div>
        {f.card_enabled && (
          <>
            <Field label="Karta sarlavhasi">{inp("card_payment_title")}</Field>
            <Field label="Karta raqami">{inp("card_number", { placeholder: "8600 0000 0000 0000" })}</Field>
            <Field label="Karta egasi" col="col-12">{inp("card_holder")}</Field>
          </>
        )}
        <div className="col-12"><Toggle label="Payme" name="payme_enabled" value={f.payme_enabled} on={set} /></div>
        {f.payme_enabled && (
          <>
            <Field label="Payme merchant ID">{inp("payme_merchant_id")}</Field>
            <Field label="Payme URL">{inp("payme_url")}</Field>
          </>
        )}
        <Field label="Click URL">{inp("click_url")}</Field>
        <Field label="Uzum URL">{inp("uzum_url")}</Field>
      </Section>

      <Section icon="bi-chat-dots" title={t("bot_messages")}>
        {[
          ["msg_new", "Yangi buyurtma"],
          ["msg_preparing", "Tayyorlanmoqda"],
          ["msg_delivering", "Yetkazilmoqda"],
          ["msg_delivered", "Yetkazildi"],
          ["msg_cancelled", "Bekor qilindi"],
        ].map(([k, lab]) => (
          <Field key={k} label={lab} col="col-12 col-md-6">
            <textarea className="form-control" rows={2} name={k} value={f[k] ?? ""} onChange={onChange} />
          </Field>
        ))}
        <Field label="Telegram group ID">{inp("telegram_group_id")}</Field>
        <Field label="Bot token (write-only)">
          {inp("telegram_bot_token", { type: "password", placeholder: "••••••••", autoComplete: "new-password" })}
        </Field>
      </Section>

      <Section icon="bi-palette" title={t("appearance")}>
        <Field label="Tema">
          <select className="form-select" name="ui_theme" value={f.ui_theme ?? "classic"} onChange={onChange}>
            <option value="classic">Classic</option>
            <option value="modern">Modern</option>
            <option value="minimal">Minimal</option>
          </select>
        </Field>
        <Field label="Asosiy rang" col="col-6 col-md-3">
          <input type="color" className="form-control form-control-color w-100" name="ui_primary_color"
            value={f.ui_primary_color || "#2563EB"} onChange={onChange} style={{ height: 42, cursor: "pointer" }} />
        </Field>
        <Field label="Shrift" col="col-6 col-md-3">
          <select className="form-select" name="ui_font_family" value={f.ui_font_family ?? "sans"} onChange={onChange}>
            <option value="sans">Sans</option>
            <option value="serif">Serif</option>
            <option value="rounded">Rounded</option>
          </select>
        </Field>
        <Field label="Menyu ko'rinishi">
          <select className="form-select" name="menu_view_mode" value={f.menu_view_mode ?? "grid_categories"} onChange={onChange}>
            <option value="grid_categories">Grid + kategoriyalar</option>
            <option value="list">Ro'yxat</option>
            <option value="grid">Grid</option>
          </select>
        </Field>
      </Section>

      <div className="d-flex justify-content-end sticky-bottom py-2">
        <button className="btn btn-primary btn-lg px-4" disabled={busy}>
          {busy ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-check-lg me-2" />}
          {t("save")}
        </button>
      </div>
    </form>
  );
}
