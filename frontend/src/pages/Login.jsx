import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/auth.js";
import { t } from "../lib/i18n.js";

export default function Login() {
  const nav = useNavigate();
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try { await login(u, p); nav("/panel"); }
    catch { setErr("Login yoki parol xato"); }
    finally { setBusy(false); }
  };
  return (
    <div className="d-flex align-items-center justify-content-center surface-muted"
      style={{ minHeight: "100vh", padding: "1rem" }}>
      <div className="card auth-card w-100" style={{ maxWidth: 380 }}>
        <div className="card-body p-4 p-sm-5">
          <div className="text-center mb-4">
            <span className="auth-mark mx-auto mb-3"><i className="bi bi-shop-window" /></span>
            <h1 className="h4 mb-1">market<span className="text-primary">bot</span></h1>
            <p className="text-muted small mb-0">{t("panel")}</p>
          </div>
          {err && <div className="alert alert-danger py-2 d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-circle" /><span>{err}</span></div>}
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label">{t("phone")}</label>
              <div className="input-group">
                <span className="input-group-text bg-white"><i className="bi bi-person" /></span>
                <input className="form-control" value={u} autoFocus
                  onChange={(e) => setU(e.target.value)} />
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label">{t("password")}</label>
              <div className="input-group">
                <span className="input-group-text bg-white"><i className="bi bi-lock" /></span>
                <input type="password" className="form-control" value={p}
                  onChange={(e) => setP(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary w-100 btn-lg" disabled={busy}>
              {busy ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-box-arrow-in-right me-2" />}
              {t("login")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
