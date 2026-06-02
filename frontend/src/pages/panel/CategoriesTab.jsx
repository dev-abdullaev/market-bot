import { useEffect, useState } from "react";
import api from "../../lib/api.js";
import { t } from "../../lib/i18n.js";
export default function CategoriesTab() {
  const [items, setItems] = useState(null);
  const [f, setF] = useState({ name_ru: "", name_uz: "" });
  const load = () => api.get("/categories").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const add = async (e) => { e.preventDefault(); await api.post("/categories", f);
    setF({ name_ru: "", name_uz: "" }); load(); };
  const del = async (id) => { await api.delete(`/categories/${id}`); load(); };
  if (!items) return null;
  return (<>
    <form className="row g-2 mb-3" onSubmit={add}>
      <div className="col"><input className="form-control" placeholder="RU" required
        value={f.name_ru} onChange={(e) => setF({ ...f, name_ru: e.target.value })} /></div>
      <div className="col"><input className="form-control" placeholder="UZ" required
        value={f.name_uz} onChange={(e) => setF({ ...f, name_uz: e.target.value })} /></div>
      <div className="col-auto"><button className="btn btn-primary">{t("add")}</button></div>
    </form>
    <ul className="list-group">{items.map((c) => (
      <li key={c.id} className="list-group-item d-flex justify-content-between">
        {c.name_uz} / {c.name_ru}
        <button className="btn btn-sm btn-outline-danger" onClick={() => del(c.id)}><i className="bi bi-trash" /></button>
      </li>))}</ul>
  </>);
}
