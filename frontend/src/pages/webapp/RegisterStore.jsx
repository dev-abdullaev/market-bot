import { useEffect, useState } from "react";
import api from "../../lib/api.js";
import { ready, isTelegram, initData } from "../../lib/telegram.js";
import { telegramLogin } from "../../lib/auth.js";
import { t } from "../../lib/i18n.js";

const ACTIVITIES = ["market", "restoran", "apteka", "kiyim", "boshqa"];

export default function RegisterStore() {
  const [f, setF] = useState({ name: "", activity_type: "market", phone: "",
                               address: "", latitude: null, longitude: null });
  const [res, setRes] = useState(null); const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { ready(); if (isTelegram()) telegramLogin(initData()).catch(() => {}); }, []);
  const geo = () => navigator.geolocation?.getCurrentPosition((p) =>
    setF((s) => ({ ...s, latitude: p.coords.latitude, longitude: p.coords.longitude })));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    try { const { data } = await api.post("/stores", f); setRes(data); }
    catch (e2) { setErr(e2?.response?.data?.detail || "Xatolik"); }
    finally { setBusy(false); }
  };

  if (res) return <div className="alert alert-success m-3">
    ✅ {res.name} — /shop/{res.slug}</div>;

  return (
    <div className="container py-3" style={{ maxWidth: 480 }}>
      <h5>{t("register_store")}</h5>
      {err && <div className="alert alert-danger py-2">{err}</div>}
      <form onSubmit={submit}>
        <input className="form-control mb-2" placeholder={t("name")} required
          value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <select className="form-select mb-2" value={f.activity_type}
          onChange={(e) => setF({ ...f, activity_type: e.target.value })}>
          {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input className="form-control mb-2" placeholder={t("phone")} required
          value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input className="form-control mb-2" placeholder={t("address")}
          value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        <button type="button" className="btn btn-outline-secondary mb-3 w-100" onClick={geo}>
          <i className="bi bi-geo-alt" /> {f.latitude ? "✓" : "Lokatsiya"}</button>
        <button className="btn btn-primary w-100" disabled={busy}>{t("save")}</button>
      </form>
    </div>
  );
}
