import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api.js";
import { getCart, cartTotal, setQty, removeItem, clearCart } from "../../lib/cart.js";
import { tgUser, tg } from "../../lib/telegram.js";
import { t, pname } from "../../lib/i18n.js";

const fmt = (n) => Number(n || 0).toLocaleString("ru-RU", { maximumFractionDigits: 0 });

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

  if (done) return (
    <div className="d-flex align-items-center justify-content-center surface-muted" style={{ minHeight: "100vh" }}>
      <div className="card text-center p-4" style={{ maxWidth: 360 }}>
        <i className="bi bi-check-circle-fill text-success" style={{ fontSize: "3rem" }} />
        <h1 className="h5 mt-3 mb-0">{t("order_placed")}</h1>
      </div>
    </div>
  );
  if (cart.length === 0) return (
    <div className="surface-muted" style={{ minHeight: "100vh" }}>
      <div className="empty-state"><i className="bi bi-cart-x" />{t("empty")}</div>
    </div>
  );

  return (
    <div className="surface-muted" style={{ minHeight: "100vh" }}>
      <div className="container py-3" style={{ maxWidth: 480 }}>
        <div className="card mb-3">
          <div className="card-body">
            <h1 className="h5 mb-3"><i className="bi bi-cart3 me-2 text-primary" />{t("cart")}</h1>
            {cart.map((i) => (
              <div key={i.id} className="d-flex align-items-center justify-content-between border-bottom py-2">
                <div className="me-2">
                  <div className="fw-semibold">{pname(i)}</div>
                  <small className="text-muted">{fmt(i.price)} so'm</small>
                </div>
                <div className="btn-group btn-group-sm">
                  <button className="btn btn-outline-secondary" onClick={() => { setQty(i.id, i.qty - 1); refresh(); }} aria-label="−">−</button>
                  <button className="btn btn-light border disabled" tabIndex={-1}>{i.qty}</button>
                  <button className="btn btn-outline-secondary" onClick={() => { setQty(i.id, i.qty + 1); refresh(); }} aria-label="+">+</button>
                  <button className="btn btn-outline-danger" onClick={() => { removeItem(i.id); refresh(); }} aria-label={t("delete")}>
                    <i className="bi bi-trash" /></button>
                </div>
              </div>
            ))}
            <div className="d-flex justify-content-between mt-3">
              <strong>{t("total")}</strong>
              <strong className="text-primary">{fmt(cartTotal())} so'm</strong>
            </div>
          </div>
        </div>

        {err && <div className="alert alert-danger py-2">{err}</div>}
        <div className="card">
          <div className="card-body">
            <form onSubmit={submit}>
              <label className="form-label">{t("name")}</label>
              <input className="form-control mb-2" required
                value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              <label className="form-label">{t("phone")}</label>
              <input className="form-control mb-2" required
                value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
              <label className="form-label">{t("address")}</label>
              <input className="form-control mb-3"
                value={form.delivery_address} onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} />
              <button className="btn btn-primary w-100 btn-lg" disabled={busy || !storeId}>
                {busy ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-bag-check me-2" />}
                {t("checkout")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
