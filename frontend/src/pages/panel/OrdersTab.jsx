import { useEffect, useState } from "react";
import api from "../../lib/api.js";
const STATUSES = ["new", "preparing", "delivering", "delivered", "cancelled"];
export default function OrdersTab() {
  const [orders, setOrders] = useState(null);
  const load = () => api.get("/admin/orders").then((r) => setOrders(r.data));
  useEffect(() => { load(); }, []);
  const setStatus = async (id, status) => { await api.patch(`/admin/orders/${id}/status`, { status }); load(); };
  if (!orders) return null;
  if (orders.length === 0) return <p className="text-muted">—</p>;
  return orders.map((o) => (
    <div className="card mb-2" key={o.id}><div className="card-body">
      <div className="d-flex justify-content-between">
        <strong>#{o.id} — {o.total_amount}</strong>
        <select className="form-select form-select-sm w-auto" value={o.status}
          onChange={(e) => setStatus(o.id, e.target.value)}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="small text-muted">{o.customer_phone} · {o.delivery_address}</div>
      <ul className="small mb-0">{o.items.map((i) =>
        <li key={i.id}>{i.product_name} × {i.quantity}</li>)}</ul>
    </div></div>
  ));
}
