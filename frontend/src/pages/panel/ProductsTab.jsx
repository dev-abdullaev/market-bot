import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api.js";
import { t, pname } from "../../lib/i18n.js";
export default function ProductsTab() {
  const [items, setItems] = useState(null);
  const load = () => api.get("/products").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const del = async (id) => { await api.delete(`/products/${id}`); load(); };
  if (!items) return null;
  return (<>
    <Link to="/webapp/product" className="btn btn-primary btn-sm mb-2"><i className="bi bi-plus" /> {t("add")}</Link>
    <table className="table"><tbody>
      {items.map((p) => (
        <tr key={p.id}>
          <td>{pname(p)}</td><td>{p.price}</td>
          <td className="text-end">
            <Link to={`/webapp/product/${p.id}`} className="btn btn-sm btn-outline-secondary me-1"><i className="bi bi-pencil" /></Link>
            <button className="btn btn-sm btn-outline-danger" onClick={() => del(p.id)}><i className="bi bi-trash" /></button>
          </td>
        </tr>
      ))}
    </tbody></table>
  </>);
}
