import { pname, t } from "../lib/i18n.js";
const fmt = (n) => Number(n || 0).toLocaleString("ru-RU", { maximumFractionDigits: 0 });
export default function ProductCard({ product, onAdd }) {
  return (
    <div className="card card-hover h-100">
      {product.photo_url
        ? <img src={product.photo_url} className="card-img-top"
            style={{ height: 140, objectFit: "cover", borderRadius: "14px 14px 0 0" }} alt="" />
        : <div className="d-flex align-items-center justify-content-center surface-muted"
            style={{ height: 140, borderRadius: "14px 14px 0 0", color: "#CBD5E1" }}>
            <i className="bi bi-image" style={{ fontSize: "2rem" }} /></div>}
      <div className="card-body d-flex flex-column p-3">
        <h3 className="h6 card-title mb-2" style={{ fontSize: ".95rem" }}>{pname(product)}</h3>
        <div className="mt-auto d-flex justify-content-between align-items-center">
          <strong className="text-primary">{fmt(product.price)}<span className="text-muted small fw-normal"> so'm</span></strong>
          <button className="btn btn-sm btn-primary" onClick={() => onAdd(product)} aria-label={t("add")}>
            <i className="bi bi-plus-lg" />
          </button>
        </div>
      </div>
    </div>
  );
}
