import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api.js";
import { ready, isTelegram, initData } from "../../lib/telegram.js";
import { telegramLogin } from "../../lib/auth.js";
import { t } from "../../lib/i18n.js";

const UNITS = ["dona", "kg", "litr", "portsiya"];

export default function ProductForm() {
  const { id } = useParams();
  const [cats, setCats] = useState([]);
  const [f, setF] = useState({ name_ru: "", name_uz: "", price: "", unit: "dona",
                               category: "", in_stock: true, is_hidden: false });
  const [file, setFile] = useState(null);
  const [done, setDone] = useState(false); const [busy, setBusy] = useState(false);

  useEffect(() => { ready();
    const boot = async () => {
      if (isTelegram()) await telegramLogin(initData()).catch(() => {});
      const c = await api.get("/categories").then((r) => r.data).catch(() => []);
      setCats(c);
      if (id) { const p = await api.get(`/products/${id}`).then((r) => r.data);
        setF({ ...p, category: p.category || "" }); }
    };
    boot();
  }, [id]);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const payload = { ...f, category: f.category || null };
      const saved = id ? await api.patch(`/products/${id}`, payload)
                       : await api.post("/products", payload);
      if (file) { const fd = new FormData(); fd.append("photo", file);
        await api.post(`/products/${saved.data.id}/photo`, fd); }
      setDone(true);
    } finally { setBusy(false); }
  };

  if (done) return <div className="alert alert-success m-3">✅ {t("save")}</div>;
  return (
    <div className="container py-3" style={{ maxWidth: 480 }}>
      <form onSubmit={submit}>
        <label className="form-label">Название (RU) 🇷🇺</label>
        <input className="form-control mb-2" required value={f.name_ru}
          onChange={(e) => setF({ ...f, name_ru: e.target.value })} />
        <label className="form-label">Nomi (UZ) 🇺🇿</label>
        <input className="form-control mb-2" required value={f.name_uz}
          onChange={(e) => setF({ ...f, name_uz: e.target.value })} />
        <input type="number" className="form-control mb-2" placeholder={t("price")} required
          value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        <select className="form-select mb-2" value={f.unit}
          onChange={(e) => setF({ ...f, unit: e.target.value })}>
          {UNITS.map((u) => <option key={u}>{u}</option>)}
        </select>
        <select className="form-select mb-2" value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}>
          <option value="">— {t("categories")} —</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name_uz}</option>)}
        </select>
        <input type="file" accept="image/*" className="form-control mb-2"
          onChange={(e) => setFile(e.target.files[0])} />
        <div className="form-check"><input className="form-check-input" type="checkbox"
          checked={f.in_stock} onChange={(e) => setF({ ...f, in_stock: e.target.checked })} />
          <label className="form-check-label">Mavjud</label></div>
        <div className="form-check mb-3"><input className="form-check-input" type="checkbox"
          checked={f.is_hidden} onChange={(e) => setF({ ...f, is_hidden: e.target.checked })} />
          <label className="form-check-label">Yashirish</label></div>
        <button className="btn btn-primary w-100" disabled={busy}>{t("save")}</button>
      </form>
    </div>
  );
}
