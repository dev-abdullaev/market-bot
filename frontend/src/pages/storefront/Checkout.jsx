import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api.js";
import { getCart, cartTotal, setQty, removeItem, clearCart } from "../../lib/cart.js";
import { tgUser, tg } from "../../lib/telegram.js";
import { t, pname } from "../../lib/i18n.js";

export default function Checkout() {
  const { slug } = useParams();
  const [storeId, setStoreId] = useState(null);
  const [cart, setCart] = useState(getCart());
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", delivery_address: "" });
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { api.get(`/shop/${slug}`).then((r) => setStoreId(r.data.id)); }, [slug]);
  const refresh = () => setCart(getCart());

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      await api.post(`/orders`, {
        store: storeId, ...form,
        telegram_id: tgUser() ? String(tgUser().id) : "",
        items: getCart().map((i) => ({ product: i.id, quantity: i.qty })),
      });
      clearCart(); setDone(true);
      if (tg()) setTimeout(() => tg().close(), 1500);
    } catch (e2) {
      setErr(e2?.response?.data?.detail || t("order_failed"));
    } finally { setBusy(false); }
  };

  if (done) return <div className="alert alert-success m-4">{t("order_placed")}</div>;
  if (cart.length === 0) return <div className="alert alert-info m-4">{t("empty")}</div>;

  return (
    <div className="container py-3" style={{ maxWidth: 480 }}>
      {cart.map((i) => (
        <div key={i.id} className="d-flex align-items-center justify-content-between border-bottom py-2">
          <div>{pname(i)} <span className="text-muted">× {i.qty}</span></div>
          <div className="btn-group btn-group-sm">
            <button className="btn btn-outline-secondary" onClick={() => { setQty(i.id, i.qty - 1); refresh(); }}>−</button>
            <button className="btn btn-outline-secondary" onClick={() => { setQty(i.id, i.qty + 1); refresh(); }}>+</button>
            <button className="btn btn-outline-danger" onClick={() => { removeItem(i.id); refresh(); }}>
              <i className="bi bi-trash" /></button>
          </div>
        </div>
      ))}
      <div className="d-flex justify-content-between my-3"><strong>{t("total")}</strong><strong>{cartTotal()}</strong></div>
      {err && <div className="alert alert-danger py-2">{err}</div>}
      <form onSubmit={submit}>
        <input className="form-control mb-2" placeholder={t("name")} required
          value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
        <input className="form-control mb-2" placeholder={t("phone")} required
          value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
        <input className="form-control mb-3" placeholder={t("address")}
          value={form.delivery_address} onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} />
        <button className="btn btn-primary w-100" disabled={busy || !storeId}>{t("checkout")}</button>
      </form>
    </div>
  );
}
