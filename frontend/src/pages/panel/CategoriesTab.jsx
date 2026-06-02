import { useEffect, useState } from "react";
import api from "../../lib/api.js";
import { t } from "../../lib/i18n.js";
import Spinner from "../../components/Spinner.jsx";

export default function CategoriesTab() {
  const [items, setItems] = useState(null);
  const [f, setF] = useState({ name_ru: "", name_uz: "" });
  const load = () => api.get("/categories").then((r) => setItems(r.data)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault();
    await api.post("/categories", f);
    setF({ name_ru: "", name_uz: "" }); load();
  };
  const del = async (id) => {
    if (!window.confirm(t("delete") + "?")) return;
    await api.delete(`/categories/${id}`); load();
  };

  if (!items) return <Spinner />;

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="h5 mb-3"><i className="bi bi-tags me-2 text-primary" />{t("categories")}</h2>
        <form className="row g-2 mb-3" onSubmit={add}>
          <div className="col"><input className="form-control" placeholder="RU" required
            value={f.name_ru} onChange={(e) => setF({ ...f, name_ru: e.target.value })} /></div>
          <div className="col"><input className="form-control" placeholder="UZ" required
            value={f.name_uz} onChange={(e) => setF({ ...f, name_uz: e.target.value })} /></div>
          <div className="col-auto"><button className="btn btn-primary">
            <i className="bi bi-plus-lg me-1" />{t("add")}</button></div>
        </form>
        {items.length === 0 ? (
          <div className="empty-state"><i className="bi bi-tags" />{t("no_data")}</div>
        ) : (
          <ul className="list-group list-group-flush">
            {items.map((c) => (
              <li key={c.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                <span><i className="bi bi-tag me-2 text-secondary" />{c.name_uz} <span className="text-muted">/ {c.name_ru}</span></span>
                <button className="btn btn-sm btn-outline-danger" onClick={() => del(c.id)}
                  aria-label={t("delete")}><i className="bi bi-trash" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
