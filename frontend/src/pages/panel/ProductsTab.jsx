import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api.js";
import { t, pname } from "../../lib/i18n.js";
import Spinner from "../../components/Spinner.jsx";

const fmt = (n) => Number(n || 0).toLocaleString("ru-RU", { maximumFractionDigits: 0 });

export default function ProductsTab() {
  const [items, setItems] = useState(null);
  const load = () => api.get("/products").then((r) => setItems(r.data)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  const del = async (id) => {
    if (!window.confirm(t("delete") + "?")) return;
    await api.delete(`/products/${id}`); load();
  };

  if (!items) return <Spinner />;

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0"><i className="bi bi-box-seam me-2 text-primary" />{t("products")}</h2>
          <Link to="/webapp/product" className="btn btn-primary btn-sm">
            <i className="bi bi-plus-lg me-1" />{t("add")}
          </Link>
        </div>
        {items.length === 0 ? (
          <div className="empty-state"><i className="bi bi-box" />{t("no_data")}</div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr className="text-muted small text-uppercase">
                  <th>{t("name")}</th><th>{t("price")}</th><th className="text-end"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td className="fw-semibold">
                      {p.photo_url && <img src={p.photo_url} alt="" width="34" height="34"
                        className="rounded me-2" style={{ objectFit: "cover" }} />}
                      {pname(p)}
                    </td>
                    <td>{fmt(p.price)} <span className="text-muted small">so'm</span></td>
                    <td className="text-end">
                      <Link to={`/webapp/product/${p.id}`} className="btn btn-sm btn-outline-secondary me-1"
                        aria-label="Edit"><i className="bi bi-pencil" /></Link>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => del(p.id)}
                        aria-label={t("delete")}><i className="bi bi-trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
