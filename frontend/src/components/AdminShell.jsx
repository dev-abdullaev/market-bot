import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { getLang, setLang, t } from "../lib/i18n.js";
import { logout } from "../lib/auth.js";

const NAV = [
  { to: "/panel", end: true, icon: "bi-speedometer2", key: "dashboard" },
  { to: "/panel/orders", icon: "bi-receipt", key: "orders" },
  { to: "/panel/products", icon: "bi-box-seam", key: "products" },
  { to: "/panel/categories", icon: "bi-tags", key: "categories" },
  { to: "/panel/clients", icon: "bi-people", key: "clients" },
  { to: "/panel/broadcast", icon: "bi-megaphone", key: "broadcast" },
  { to: "/panel/promos", icon: "bi-percent", key: "promos" },
  { to: "/panel/settings", icon: "bi-gear", key: "settings" },
];

export default function AdminShell({ storeName = "", children }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  // close drawer on route change (mobile)
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  const toggleLang = () => { setLang(getLang() === "uz" ? "ru" : "uz"); window.location.reload(); };
  const doLogout = () => { logout(); nav("/login"); };

  const current = NAV.find((n) => n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to) && n.to !== "/panel")
    || NAV[0];

  return (
    <div className={`admin-shell ${open ? "sidebar-open" : ""}`}>
      <div className="sidebar-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />

      <aside className="admin-sidebar" aria-label="Sidebar navigation">
        <div className="admin-brand">
          <span className="brand-mark"><i className="bi bi-shop-window" /></span>
          <span>market<span style={{ color: "#93C5FD" }}>bot</span></span>
        </div>
        <nav className="admin-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <i className={`bi ${n.icon}`} aria-hidden="true" />
              <span>{t(n.key)}</span>
            </NavLink>
          ))}
          <div className="nav-sep" />
          <button type="button" className="nav-link border-0 w-100 text-start" onClick={doLogout}>
            <i className="bi bi-box-arrow-right" aria-hidden="true" />
            <span>{t("logout")}</span>
          </button>
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="btn btn-sm btn-outline-primary d-lg-none"
            onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
            <i className="bi bi-list" />
          </button>
          <h1 className="topbar-title">{t(current.key)}</h1>
          <div className="ms-auto d-flex align-items-center gap-2">
            {storeName && (
              <span className="d-none d-sm-inline text-muted small">
                <i className="bi bi-shop me-1" />{storeName}
              </span>
            )}
            <button type="button" className="lang-toggle" onClick={toggleLang}
              title="Til / Язык">{getLang().toUpperCase()}</button>
            <button type="button" className="btn btn-sm btn-outline-secondary"
              onClick={doLogout} title={t("logout")}>
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
