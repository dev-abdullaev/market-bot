import { useEffect, useState } from "react";
import api from "../../lib/api.js";
import { t } from "../../lib/i18n.js";
import Spinner from "../../components/Spinner.jsx";

const EMPTY = { code: "", discount_type: "percent", discount_value: "", valid_until: "", usage_limit: "" };

export default function PromosPage() {
  const [rows, setRows] = useState(null);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/promos").then((r) => setRows(r.data)).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        code: f.code.trim(),
        discount_type: f.discount_type,
        discount_value: f.discount_value,
        valid_until: f.valid_until || null,
        usage_limit: f.usage_limit === "" ? null : Number(f.usage_limit),
      };
      await api.post("/promos", payload);
      setF(EMPTY);
      load();
    } finally { setBusy(false); }
  };

  const toggle = async (p) => { await api.patch(`/promos/${p.id}`, { is_active: !p.is_active }); load(); };
  const del = async (id) => {
    if (!window.confirm(t("delete") + "?")) return;
    await api.delete(`/promos/${id}`); load();
  };

  if (!rows) return <Spinner />;

  return (
    <div className="row g-3">
      <div className="col-12 col-lg-5">
        <div className="card">
          <div className="card-body">
            <h2 className="h6 mb-3"><i className="bi bi-plus-circle me-2 text-primary" />{t("add")}</h2>
            <form onSubmit={add}>
              <label className="form-label">{t("code")}</label>
              <input className="form-control mb-2 text-uppercase" placeholder="SALE10" required
                value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />

              <div className="row g-2 mb-2">
                <div className="col-7">
                  <label className="form-label">{t("type")}</label>
                  <select className="form-select" value={f.discount_type}
                    onChange={(e) => setF({ ...f, discount_type: e.target.value })}>
                    <option value="percent">{t("percent")} (%)</option>
                    <option value="fixed">{t("fixed")} (so'm)</option>
                  </select>
                </div>
                <div className="col-5">
                  <label className="form-label">{t("value")}</label>
                  <input type="number" className="form-control" required min="0"
                    value={f.discount_value} onChange={(e) => setF({ ...f, discount_value: e.target.value })} />
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-7">
                  <label className="form-label">Amal qiladi</label>
                  <input type="date" className="form-control"
                    value={f.valid_until} onChange={(e) => setF({ ...f, valid_until: e.target.value })} />
                </div>
                <div className="col-5">
                  <label className="form-label">Limit</label>
                  <input type="number" className="form-control" min="0" placeholder="∞"
                    value={f.usage_limit} onChange={(e) => setF({ ...f, usage_limit: e.target.value })} />
                </div>
              </div>

              <button className="btn btn-primary w-100" disabled={busy}>
                <i className="bi bi-plus-lg me-1" />{t("add")}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-7">
        <div className="card">
          <div className="card-body">
            <h2 className="h6 mb-3"><i className="bi bi-percent me-2 text-primary" />{t("promos")}</h2>
            {rows.length === 0 ? (
              <div className="empty-state"><i className="bi bi-ticket-perforated" />{t("no_data")}</div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr className="text-muted small text-uppercase">
                      <th>{t("code")}</th>
                      <th>{t("value")}</th>
                      <th className="text-center">{t("used")}</th>
                      <th className="text-center">{t("active")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id}>
                        <td><span className="badge text-bg-light border font-monospace">{p.code}</span></td>
                        <td className="fw-semibold">
                          {p.discount_value}{p.discount_type === "percent" ? "%" : " so'm"}
                        </td>
                        <td className="text-center text-muted">
                          {p.used_count}{p.usage_limit ? ` / ${p.usage_limit}` : ""}
                        </td>
                        <td className="text-center">
                          <div className="form-check form-switch d-inline-block">
                            <input className="form-check-input" type="checkbox" role="switch"
                              checked={p.is_active} onChange={() => toggle(p)}
                              aria-label="Toggle active" style={{ cursor: "pointer" }} />
                          </div>
                        </td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-danger" onClick={() => del(p.id)}
                            aria-label={t("delete")}>
                            <i className="bi bi-trash" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
