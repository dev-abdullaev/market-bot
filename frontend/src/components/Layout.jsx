import { getLang, setLang } from "../lib/i18n.js";
export default function Layout({ title, children }) {
  const toggle = () => { setLang(getLang() === "uz" ? "ru" : "uz"); window.location.reload(); };
  return (<>
    <nav className="navbar navbar-dark bg-primary px-3">
      <span className="navbar-brand">{title}</span>
      <button className="btn btn-sm btn-light" onClick={toggle}>{getLang().toUpperCase()}</button>
    </nav>
    <div className="container py-3">{children}</div>
  </>);
}
