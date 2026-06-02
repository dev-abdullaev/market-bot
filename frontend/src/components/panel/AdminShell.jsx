import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  Receipt,
  Package,
  Tags,
  Users,
  Megaphone,
  Ticket,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
} from "lucide-react";
import api from "../../lib/api";
import { logout } from "../../lib/auth";
import { t, getLang, setLang } from "../../lib/i18n";
import { cn } from "../../lib/cn";

const NAV = [
  { to: "/panel", end: true, icon: LayoutDashboard, key: "nav_analytics" },
  { to: "/panel/orders", icon: Receipt, key: "nav_orders" },
  { to: "/panel/products", icon: Package, key: "nav_products" },
  { to: "/panel/categories", icon: Tags, key: "nav_categories" },
  { to: "/panel/clients", icon: Users, key: "nav_clients" },
  { to: "/panel/broadcast", icon: Megaphone, key: "nav_broadcast" },
  { to: "/panel/promos", icon: Ticket, key: "nav_promos" },
  { to: "/panel/settings", icon: Settings, key: "nav_settings" },
];

/** Single nav row with a shared-layout sliding active pill. */
function NavItem({ item, onNavigate }) {
  const reduce = useReducedMotion();
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className="group relative block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {({ isActive }) => (
        <span
          className={cn(
            "relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-colors",
            isActive
              ? "text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {isActive ? (
            <motion.span
              layoutId="nav-active"
              className="absolute inset-0 -z-0 rounded-xl bg-gradient-to-r from-primary to-secondary shadow-soft"
              transition={
                reduce
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 420, damping: 34 }
              }
            />
          ) : null}
          <item.icon
            className="relative z-10 h-5 w-5 shrink-0"
            strokeWidth={2.2}
          />
          <span className="relative z-10">{t(item.key)}</span>
        </span>
      )}
    </NavLink>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-soft">
        <Store className="h-5 w-5" strokeWidth={2.3} />
      </span>
      <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
        Market<span className="text-primary">Bot</span>
      </span>
    </div>
  );
}

function SidebarBody({ onNavigate }) {
  const nav = useNavigate();
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="px-2 pb-4 pt-5">
        <BrandMark />
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) => (
          <NavItem key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={() => {
            logout();
            nav("/login");
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="h-5 w-5" strokeWidth={2.2} />
          {t("logout")}
        </button>
      </div>
    </div>
  );
}

/** uz/ru toggle that re-renders the app via a forced location key bump. */
function LangToggle() {
  const [lang, setL] = useState(getLang());
  const choose = (l) => {
    if (l === lang) return;
    setLang(l);
    setL(l);
    // The simplest reliable way to re-translate every mounted screen.
    window.location.reload();
  };
  return (
    <div className="flex items-center rounded-xl border border-border bg-background p-0.5 shadow-soft">
      {["uz", "ru"].map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          className={cn(
            "relative rounded-lg px-2.5 py-1 text-xs font-bold uppercase transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            lang === l ? "text-primary-foreground" : "text-muted-foreground"
          )}
        >
          {lang === l ? (
            <motion.span
              layoutId="lang-active"
              className="absolute inset-0 -z-0 rounded-lg bg-primary"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          ) : null}
          <span className="relative z-10">{l}</span>
        </button>
      ))}
    </div>
  );
}

export default function AdminShell() {
  const [storeName, setStoreName] = useState("");
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const reduce = useReducedMotion();

  // Resolve the store name from /stores/me, falling back to /auth/me.
  useEffect(() => {
    let alive = true;
    (async () => {
      const store = await api
        .get("/stores/me")
        .then((r) => r.data)
        .catch(() => null);
      if (alive && store?.name) {
        setStoreName(store.name);
        return;
      }
      const me = await api
        .get("/auth/me")
        .then((r) => r.data)
        .catch(() => null);
      if (alive && me?.store_name) setStoreName(me.store_name);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawer(false);
  }, [location.pathname]);

  return (
    <div className="min-h-svh bg-muted">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-background lg:block">
        <SidebarBody />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer ? (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawer(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[82%] border-r border-border bg-background shadow-lift lg:hidden"
              initial={reduce ? { opacity: 0 } : { x: "-100%" }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-5 w-5" strokeWidth={2.3} />
              </button>
              <SidebarBody onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <Menu className="h-5 w-5" strokeWidth={2.3} />
          </button>

          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
              <Store className="h-4 w-4" strokeWidth={2.3} />
            </span>
            <span className="truncate font-display text-base font-extrabold text-foreground">
              {storeName || "MarketBot"}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <LangToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
