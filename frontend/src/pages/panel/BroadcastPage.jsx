import { useState } from "react";
import api from "../../lib/api.js";
import { t } from "../../lib/i18n.js";

export default function BroadcastPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  const send = async (e) => {
    e.preventDefault();
    const msg = text.trim();
    if (!msg) return;
    if (!window.confirm(t("broadcast") + "?")) return;
    setBusy(true); setErr(""); setResult(null);
    try {
      const { data } = await api.post("/admin/broadcast", { text: msg });
      setResult(data.sent);
      setText("");
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "Xatolik");
    } finally { setBusy(false); }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-lg-8">
        <div className="card">
          <div className="card-body">
            <h2 className="h5 mb-1"><i className="bi bi-megaphone me-2 text-primary" />{t("broadcast")}</h2>
            <p className="text-muted small mb-3">
              <i className="bi bi-info-circle me-1" />
              Xabar barcha mijozlarga Telegram orqali yuboriladi.
            </p>

            {result !== null && (
              <div className="alert alert-success d-flex align-items-center gap-2">
                <i className="bi bi-check-circle-fill" />
                <span>{result} mijozga yuborildi</span>
              </div>
            )}
            {err && <div className="alert alert-danger py-2">{err}</div>}

            <form onSubmit={send}>
              <textarea className="form-control mb-3" rows={6} placeholder="Matn..."
                value={text} onChange={(e) => setText(e.target.value)} disabled={busy} />
              <button className="btn btn-primary" disabled={busy || !text.trim()}>
                {busy ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-send me-2" />}
                {t("send")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
