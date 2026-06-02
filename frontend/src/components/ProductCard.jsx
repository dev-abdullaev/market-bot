import { pname, t } from "../lib/i18n.js";
export default function ProductCard({ product, onAdd }) {
  return (
    <div className="card h-100">
      {product.photo_url && <img src={product.photo_url} className="card-img-top"
        style={{ height: 140, objectFit: "cover" }} alt="" />}
      <div className="card-body d-flex flex-column">
        <h6 className="card-title">{pname(product)}</h6>
        <div className="mt-auto d-flex justify-content-between align-items-center">
          <strong>{product.price}</strong>
          <button className="btn btn-sm btn-primary" onClick={() => onAdd(product)}>
            <i className="bi bi-plus" /> {t("add")}
          </button>
        </div>
      </div>
    </div>
  );
}
