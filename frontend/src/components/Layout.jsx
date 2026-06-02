import { getLang, setLang } from "../lib/i18n.js";
export default function Layout({ title, children }) {
  const toggle = () => { setLang(getLang() === "uz" ? "ru" : "uz"); window.location.reload(); };
  return (
    <div className="surface-muted" style={{ minHeight: "100vh" }}>
      <nav className="navbar px-3 shadow-sm"
        style={{ background: "linear-gradient(135deg,var(--color-primary),var(--color-secondary))" }}>
        <span className="navbar-brand text-white fw-bold mb-0 h-display">
          <i className="bi bi-shop-window me-2" />{title}
        </span>
        <button className="lang-toggle" onClick={toggle}>{getLang().toUpperCase()}</button>
      </nav>
      <div className="container py-3">{children}</div>
    </div>
  );
}
