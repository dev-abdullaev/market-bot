import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/auth.js";
import { t } from "../lib/i18n.js";

export default function Login() {
  const nav = useNavigate();
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setErr("");
    try { await login(u, p); nav("/panel"); }
    catch { setErr("Login yoki parol xato"); }
  };
  return (
    <div className="container" style={{ maxWidth: 360, marginTop: 80 }}>
      <h4 className="mb-3">{t("login")}</h4>
      {err && <div className="alert alert-danger py-2">{err}</div>}
      <form onSubmit={submit}>
        <input className="form-control mb-2" placeholder={t("phone")} value={u}
          onChange={(e) => setU(e.target.value)} />
        <input type="password" className="form-control mb-3" placeholder={t("password")} value={p}
          onChange={(e) => setP(e.target.value)} />
        <button className="btn btn-primary w-100">{t("login")}</button>
      </form>
    </div>
  );
}
