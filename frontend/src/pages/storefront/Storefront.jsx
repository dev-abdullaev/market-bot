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
    <div className="container py-3" style={{ paddingBottom: 80 }}>
      {data.categories.map((c) => (
        <div key={c.id} className="mb-4">
          <h5 className="mb-3">{pname(c)}</h5>
          <div className="row g-2">
            {c.products.map((p) => (
              <div className="col-6 col-md-3" key={p.id}>
                <ProductCard product={p} onAdd={add} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button className="btn btn-primary position-fixed bottom-0 start-50 translate-middle-x mb-3"
        onClick={() => nav(`/shop/${slug}/checkout`)}>
        <i className="bi bi-cart" /> {t("cart")} ({count})
      </button>
    </div>
  );
}
