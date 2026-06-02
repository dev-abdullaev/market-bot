import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/api.js";
import { ready } from "../../lib/telegram.js";
import { addItem, getCart } from "../../lib/cart.js";
import { t, pname } from "../../lib/i18n.js";
import ProductCard from "../../components/ProductCard.jsx";
import Spinner from "../../components/Spinner.jsx";

export default function Storefront() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [count, setCount] = useState(getCart().reduce((s, i) => s + i.qty, 0));

  useEffect(() => { ready();
    api.get(`/shop/${slug}/catalog`).then((r) => setData(r.data)).catch(() => setErr(true));
  }, [slug]);

  if (err) return <div className="alert alert-danger m-4">Do'kon topilmadi</div>;
  if (!data) return <Spinner />;
  const add = (p) => { addItem(p); setCount(getCart().reduce((s, i) => s + i.qty, 0)); };

  return (
    <div className="surface-muted" style={{ minHeight: "100vh", paddingBottom: 90 }}>
      <div className="store-hero text-center">
        <span className="brand-mark mx-auto mb-2" style={{ background: "rgba(255,255,255,.18)" }}>
          <i className="bi bi-shop-window" />
        </span>
        <h1 className="h4 mb-0 text-white">{data.store?.name || data.name || "Do'kon"}</h1>
      </div>

      <div className="container py-3">
        {data.categories.map((c) => (
          <div key={c.id} className="mb-4">
            <h2 className="h5 mb-3 d-flex align-items-center">
              <i className="bi bi-tag-fill me-2 text-primary" style={{ fontSize: ".8rem" }} />{pname(c)}
            </h2>
            <div className="row g-2 g-md-3">
              {c.products.map((p) => (
                <div className="col-6 col-md-3" key={p.id}>
                  <ProductCard product={p} onAdd={add} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary cart-fab position-fixed bottom-0 start-50 translate-middle-x mb-3"
        onClick={() => nav(`/shop/${slug}/checkout`)}>
        <i className="bi bi-cart3 me-2" /> {t("cart")}
        <span className="badge bg-white text-primary ms-2 rounded-pill">{count}</span>
      </button>
    </div>
  );
}
