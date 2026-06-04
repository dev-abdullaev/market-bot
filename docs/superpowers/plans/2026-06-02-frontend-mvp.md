# Frontend MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or executing-plans. Steps use checkbox (`- [ ]`) syntax. This plan is **functional-first (Bootstrap 5), minimal tests** (light unit tests for api/cart utilities + `npm run build` and dev-boot gates; full E2E deferred to Playwright later).

**Goal:** Build the React + Vite single-page app for market-bot MVP: one SPA serving the customer storefront, the operator panel, and the Telegram WebApp forms (store registration + product add/edit), with JWT auth that works both in a browser and inside a Telegram web-view.

**Architecture:** Vite + React 18 + React Router + Bootstrap 5 + axios. A single axios instance (baseURL `/api`, JWT interceptor) talks to the existing backend. The Telegram WebApp SDK wrapper auto-logs-in via `initData` when running inside Telegram; otherwise the browser `/login` flow is used. Cart state lives in `localStorage`. RU/UZ i18n via a tiny dictionary. The storefront is public (no token); ordering attaches the customer's `telegram_id` from `initData`.

**Tech Stack:** Node 20, Vite 5, React 18, react-router-dom 6, axios, bootstrap 5.3 + bootstrap-icons, Vitest + @testing-library (light), @twa-dev/sdk or the official `telegram-web-app.js`.

**Backend API (already built — exact contracts the screens consume):**
```
POST /api/auth/login {username,password}            -> {access,refresh,user}
POST /api/auth/telegram-webapp {init_data}          -> {access,refresh,user}
GET  /api/auth/me                                    -> user{id,username,full_name,role,store_id,store_name,store_slug}
POST /api/stores {name,activity_type,phone,address,latitude,longitude,logo_url} -> store (201)
GET  /api/stores/me ; PATCH /api/stores/me
GET/POST /api/categories ; GET/PATCH/DELETE /api/categories/{id}
GET/POST /api/products?category= ; GET/PATCH/DELETE /api/products/{id}
POST /api/products/{id}/photo  (multipart field "photo")  -> {photo_url}
GET  /api/shop/{slug}            (public) -> store(public fields, no bot token)
GET  /api/shop/{slug}/catalog    (public) -> {categories:[{id,name_ru,name_uz,image_url,products:[{id,name_ru,name_uz,description_ru,description_uz,price,unit,photo_url}]}]}
POST /api/orders {store,customer_name,customer_phone,telegram_id,delivery_address,latitude,longitude,comment,items:[{product,quantity}]} (201, public)
GET  /api/admin/orders?status= ; PATCH /api/admin/orders/{id}/status {status}
```
Operator order routes are under **/api/admin/orders** (not /api/orders).

**Reference spec:** `docs/superpowers/specs/2026-06-02-market-bot-mvp-design.md` (§6 Frontend).

---

## File Structure

```
frontend/
├── package.json, vite.config.js, index.html, .env.example, .dockerignore, Dockerfile, nginx.conf
├── vitest.config.js
└── src/
    ├── main.jsx                 # bootstrap CSS import + router mount
    ├── App.jsx                  # <Routes>
    ├── lib/
    │   ├── api.js               # axios instance, baseURL, JWT interceptor
    │   ├── telegram.js          # WebApp SDK wrapper: initData, ready(), themeParams, MainButton
    │   ├── auth.js              # token storage, login(), telegramLogin(), getMe(), logout()
    │   ├── cart.js              # cart in localStorage: add/remove/setQty/clear/total
    │   └── i18n.js              # RU/UZ strings + useLang()
    ├── components/
    │   ├── Layout.jsx           # navbar, language switch
    │   ├── ProtectedRoute.jsx   # requires auth (operator)
    │   ├── ProductCard.jsx
    │   └── Spinner.jsx
    ├── pages/
    │   ├── Login.jsx                    # /login  (browser phone+password)
    │   ├── storefront/
    │   │   ├── Storefront.jsx           # /shop/:slug  catalog + cart drawer
    │   │   └── Checkout.jsx             # /shop/:slug/checkout
    │   ├── panel/
    │   │   ├── Panel.jsx                # /panel  tabbed: Products | Categories | Orders
    │   │   ├── ProductsTab.jsx
    │   │   ├── CategoriesTab.jsx
    │   │   └── OrdersTab.jsx
    │   └── webapp/
    │       ├── RegisterStore.jsx        # /webapp/register
    │       └── ProductForm.jsx          # /webapp/product , /webapp/product/:id
    └── tests/
        ├── cart.test.js
        └── api.test.js
```

---

## Task 1: Scaffold Vite + React + Bootstrap + router

**Files:** `frontend/package.json`, `vite.config.js`, `vitest.config.js`, `index.html`, `.env.example`, `src/main.jsx`, `src/App.jsx`, `src/lib/i18n.js`, `src/components/Spinner.jsx`

- [ ] **Step 1: Create the Vite app**

Run:
```bash
cd /home/Data/ai-team-projects/market-bot
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install react-router-dom axios bootstrap bootstrap-icons
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: vite.config.js with dev proxy to backend**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://localhost:8000", changeOrigin: true } },
  },
});
```

`vitest.config.js`:
```js
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "jsdom", globals: true } });
```

`.env.example`:
```
VITE_API_BASE=/api
```

- [ ] **Step 3: index.html — load Telegram WebApp SDK**

Add inside `<head>` of `frontend/index.html`:
```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
```

- [ ] **Step 4: main.jsx + App.jsx + i18n + Spinner**

`src/main.jsx`:
```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter><App /></BrowserRouter>
);
```

`src/App.jsx`:
```jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Storefront from "./pages/storefront/Storefront.jsx";
import Checkout from "./pages/storefront/Checkout.jsx";
import Panel from "./pages/panel/Panel.jsx";
import RegisterStore from "./pages/webapp/RegisterStore.jsx";
import ProductForm from "./pages/webapp/ProductForm.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/shop/:slug" element={<Storefront />} />
      <Route path="/shop/:slug/checkout" element={<Checkout />} />
      <Route path="/webapp/register" element={<RegisterStore />} />
      <Route path="/webapp/product" element={<ProductForm />} />
      <Route path="/webapp/product/:id" element={<ProductForm />} />
      <Route path="/panel" element={<ProtectedRoute><Panel /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
```

`src/lib/i18n.js`:
```js
const STRINGS = {
  uz: { cart:"Savat", checkout:"Buyurtma berish", add:"Qo'shish", total:"Jami",
        name:"Ism", phone:"Telefon", address:"Manzil", login:"Kirish",
        password:"Parol", products:"Mahsulotlar", categories:"Kategoriyalar",
        orders:"Buyurtmalar", save:"Saqlash", price:"Narx", empty:"Bo'sh",
        order_placed:"Buyurtma qabul qilindi!", register_store:"Do'kon ro'yxati" },
  ru: { cart:"Корзина", checkout:"Оформить", add:"Добавить", total:"Итого",
        name:"Имя", phone:"Телефон", address:"Адрес", login:"Вход",
        password:"Пароль", products:"Товары", categories:"Категории",
        orders:"Заказы", save:"Сохранить", price:"Цена", empty:"Пусто",
        order_placed:"Заказ принят!", register_store:"Регистрация магазина" },
};
export function getLang() { return localStorage.getItem("language") || "uz"; }
export function setLang(l) { localStorage.setItem("language", l); }
export function t(key) { const l = getLang(); return (STRINGS[l]||STRINGS.uz)[key] || key; }
export function pname(p) { return getLang()==="ru" ? (p.name_ru||p.name_uz) : (p.name_uz||p.name_ru); }
```

`src/components/Spinner.jsx`:
```jsx
export default function Spinner() {
  return <div className="d-flex justify-content-center p-5">
    <div className="spinner-border" role="status" />
  </div>;
}
```

- [ ] **Step 5: Verify it builds**

Run: `cd frontend && npm run build`
Expected: build succeeds (pages referenced by App.jsx must exist as stubs to build — create minimal stub components that `export default function X(){return null}` for any page not yet implemented, then fill them in later tasks).

- [ ] **Step 6: Commit**

```bash
git add frontend
git commit -m "feat(frontend): scaffold Vite+React+Bootstrap SPA with router"
```

---

## Task 2: API client, auth, Telegram wrapper, cart (+ unit tests)

**Files:** `src/lib/api.js`, `src/lib/auth.js`, `src/lib/telegram.js`, `src/lib/cart.js`, `src/tests/cart.test.js`, `src/tests/api.test.js`

- [ ] **Step 1: Write the failing unit tests**

`src/tests/cart.test.js`:
```js
import { describe, it, expect, beforeEach } from "vitest";
import { addItem, getCart, setQty, removeItem, cartTotal, clearCart } from "../lib/cart.js";

describe("cart", () => {
  beforeEach(() => localStorage.clear());
  it("adds and totals", () => {
    addItem({ id: 1, price: "5000", name_uz: "a" });
    addItem({ id: 1, price: "5000", name_uz: "a" });
    addItem({ id: 2, price: "3000", name_uz: "b" });
    expect(getCart().find(i => i.id === 1).qty).toBe(2);
    expect(cartTotal()).toBe(13000);
  });
  it("setQty and remove", () => {
    addItem({ id: 1, price: "5000" });
    setQty(1, 5);
    expect(getCart()[0].qty).toBe(5);
    removeItem(1);
    expect(getCart()).toHaveLength(0);
  });
  it("clears", () => { addItem({ id: 1, price: "1" }); clearCart(); expect(getCart()).toHaveLength(0); });
});
```

`src/tests/api.test.js`:
```js
import { describe, it, expect, beforeEach } from "vitest";
import { setToken, getToken, clearToken } from "../lib/auth.js";

describe("auth token storage", () => {
  beforeEach(() => localStorage.clear());
  it("stores and reads token", () => { setToken("abc"); expect(getToken()).toBe("abc"); });
  it("clears token", () => { setToken("abc"); clearToken(); expect(getToken()).toBeNull(); });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the libs**

`src/lib/api.js`:
```js
import axios from "axios";
import { getToken, clearToken } from "./auth.js";

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE || "/api" });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response && err.response.status === 401) clearToken();
    return Promise.reject(err);
  }
);
export default api;
```

`src/lib/auth.js`:
```js
import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE || "/api";
export function getToken() { return localStorage.getItem("token"); }
export function setToken(t) { localStorage.setItem("token", t); }
export function clearToken() { localStorage.removeItem("token"); }

export async function login(username, password) {
  const { data } = await axios.post(`${BASE}/auth/login`, { username, password });
  setToken(data.access);
  return data.user;
}
export async function telegramLogin(initData) {
  const { data } = await axios.post(`${BASE}/auth/telegram-webapp`, { init_data: initData });
  setToken(data.access);
  return data.user;
}
export async function getMe() {
  const { data } = await axios.get(`${BASE}/auth/me`,
    { headers: { Authorization: `Bearer ${getToken()}` } });
  return data;
}
export function logout() { clearToken(); }
```

`src/lib/telegram.js`:
```js
export function tg() { return window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null; }
export function isTelegram() { const w = tg(); return !!(w && w.initData); }
export function initData() { const w = tg(); return w ? w.initData : ""; }
export function tgUser() { const w = tg(); return w && w.initDataUnsafe ? w.initDataUnsafe.user : null; }
export function ready() { const w = tg(); if (w) { w.ready(); w.expand(); } }
```

`src/lib/cart.js`:
```js
const KEY = "cart";
export function getCart() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
function save(c) { localStorage.setItem(KEY, JSON.stringify(c)); }
export function addItem(product) {
  const c = getCart();
  const found = c.find((i) => i.id === product.id);
  if (found) found.qty += 1;
  else c.push({ id: product.id, price: product.price, name_uz: product.name_uz,
                name_ru: product.name_ru, qty: 1 });
  save(c);
}
export function setQty(id, qty) {
  const c = getCart(); const it = c.find((i) => i.id === id);
  if (it) { it.qty = Math.max(1, qty); save(c); }
}
export function removeItem(id) { save(getCart().filter((i) => i.id !== id)); }
export function clearCart() { localStorage.removeItem(KEY); }
export function cartTotal() { return getCart().reduce((s, i) => s + Number(i.price) * i.qty, 0); }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run`
Expected: cart (3) + auth (2) pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib frontend/src/tests
git commit -m "feat(frontend): api client, auth, telegram wrapper, cart (+unit tests)"
```

---

## Task 3: Storefront (catalog + cart + checkout)

**Files:** `src/pages/storefront/Storefront.jsx`, `src/pages/storefront/Checkout.jsx`, `src/components/ProductCard.jsx`

- [ ] **Step 1: ProductCard.jsx**

```jsx
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
```

- [ ] **Step 2: Storefront.jsx**

Behavior: on mount call `GET /api/shop/:slug/catalog`; render store name + categories with a responsive grid of `ProductCard`. Maintain a cart badge (count from `getCart()`); add-to-cart via `addItem`. A floating "Cart" button → navigate to `/shop/:slug/checkout`. Use `Spinner` while loading; show an error alert if the shop 404s.
```jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/api.js";
import { ready } from "../../lib/telegram.js";
import { addItem, getCart } from "../../lib/cart.js";
import { t, pname } from "../../lib/i18n.js";
import ProductCard from "../../components/ProductCard.jsx";
import Spinner from "../../components/Spinner.jsx";

export default function Storefront() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [count, setCount] = useState(getCart().reduce((s, i) => s + i.qty, 0));

  useEffect(() => { ready();
    api.get(`/shop/${slug}/catalog`).then((r) => setData(r.data)).catch(() => setErr(true));
  }, [slug]);

  if (err) return <div className="alert alert-danger m-4">Do'kon topilmadi</div>;
  if (!data) return <Spinner />;
  const add = (p) => { addItem(p); setCount(getCart().reduce((s, i) => s + i.qty, 0)); };

  return (
    <div className="container py-3" style={{ paddingBottom: 80 }}>
      {data.categories.map((c) => (
        <div key={c.id} className="mb-4">
          <h5 className="mb-3">{pname(c)}</h5>
          <div className="row g-2">
            {c.products.map((p) => (
              <div className="col-6 col-md-3" key={p.id}>
                <ProductCard product={p} onAdd={add} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button className="btn btn-primary position-fixed bottom-0 start-50 translate-middle-x mb-3"
        onClick={() => nav(`/shop/${slug}/checkout`)}>
        <i className="bi bi-cart" /> {t("cart")} ({count})
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Checkout.jsx**

Behavior: show cart lines with qty steppers (`setQty`/`removeItem`), total (`cartTotal`); a form for name/phone/address; on submit `POST /api/orders` with `store` (resolve store id from `GET /api/shop/:slug`), `telegram_id` from `tgUser()?.id`, and `items:[{product:id, quantity:qty}]`; on success `clearCart()` + show success + (if Telegram) `tg().close()`.
```jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api.js";
import { getCart, cartTotal, setQty, removeItem, clearCart } from "../../lib/cart.js";
import { tgUser, tg } from "../../lib/telegram.js";
import { t, pname } from "../../lib/i18n.js";

export default function Checkout() {
  const { slug } = useParams();
  const [storeId, setStoreId] = useState(null);
  const [cart, setCart] = useState(getCart());
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", delivery_address: "" });
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get(`/shop/${slug}`).then((r) => setStoreId(r.data.id)); }, [slug]);
  const refresh = () => setCart(getCart());

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await api.post(`/orders`, {
        store: storeId, ...form,
        telegram_id: tgUser() ? String(tgUser().id) : "",
        items: getCart().map((i) => ({ product: i.id, quantity: i.qty })),
      });
      clearCart(); setDone(true);
      if (tg()) setTimeout(() => tg().close(), 1500);
    } finally { setBusy(false); }
  };

  if (done) return <div className="alert alert-success m-4">{t("order_placed")}</div>;
  if (cart.length === 0) return <div className="alert alert-info m-4">{t("empty")}</div>;

  return (
    <div className="container py-3" style={{ maxWidth: 480 }}>
      {cart.map((i) => (
        <div key={i.id} className="d-flex align-items-center justify-content-between border-bottom py-2">
          <div>{pname(i)} <span className="text-muted">× {i.qty}</span></div>
          <div className="btn-group btn-group-sm">
            <button className="btn btn-outline-secondary" onClick={() => { setQty(i.id, i.qty - 1); refresh(); }}>−</button>
            <button className="btn btn-outline-secondary" onClick={() => { setQty(i.id, i.qty + 1); refresh(); }}>+</button>
            <button className="btn btn-outline-danger" onClick={() => { removeItem(i.id); refresh(); }}>
              <i className="bi bi-trash" /></button>
          </div>
        </div>
      ))}
      <div className="d-flex justify-content-between my-3"><strong>{t("total")}</strong><strong>{cartTotal()}</strong></div>
      <form onSubmit={submit}>
        <input className="form-control mb-2" placeholder={t("name")} required
          value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
        <input className="form-control mb-2" placeholder={t("phone")} required
          value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
        <input className="form-control mb-3" placeholder={t("address")}
          value={form.delivery_address} onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} />
        <button className="btn btn-primary w-100" disabled={busy || !storeId}>{t("checkout")}</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `cd frontend && npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): storefront catalog + cart + checkout"
```

---

## Task 4: Auth — Login page, ProtectedRoute, Telegram auto-login

**Files:** `src/pages/Login.jsx`, `src/components/ProtectedRoute.jsx`, `src/components/Layout.jsx`

- [ ] **Step 1: ProtectedRoute.jsx — auto-login in Telegram, else require token**

```jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getToken, telegramLogin } from "../lib/auth.js";
import { isTelegram, initData, ready } from "../lib/telegram.js";
import Spinner from "./Spinner.jsx";

export default function ProtectedRoute({ children }) {
  const [state, setState] = useState(getToken() ? "ok" : "checking");
  useEffect(() => {
    if (getToken()) { setState("ok"); return; }
    if (isTelegram()) { ready();
      telegramLogin(initData()).then(() => setState("ok")).catch(() => setState("no"));
    } else setState("no");
  }, []);
  if (state === "checking") return <Spinner />;
  if (state === "no") return <Navigate to="/login" replace />;
  return children;
}
```

- [ ] **Step 2: Login.jsx**

```jsx
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
```

- [ ] **Step 3: Layout.jsx (navbar + language switch)** — simple navbar with title, role, language toggle (uz/ru) that calls `setLang` + reloads.

```jsx
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
```

- [ ] **Step 4: Verify build**

Run: `cd frontend && npm run build` → succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): login page + Telegram auto-login ProtectedRoute + layout"
```

---

## Task 5: WebApp forms — store registration + product add/edit

**Files:** `src/pages/webapp/RegisterStore.jsx`, `src/pages/webapp/ProductForm.jsx`

- [ ] **Step 1: RegisterStore.jsx**

Behavior: WebApp form. On mount `ready()` + Telegram auto-login (`telegramLogin(initData())`) so the POST is authenticated. Fields: name, activity_type (select), phone, address; optional geolocation button that fills latitude/longitude via `navigator.geolocation`. Submit → `POST /api/stores`; on success show the returned login/slug and (if Telegram) offer to open the panel. Mirrors the talablar register screen.
```jsx
import { useEffect, useState } from "react";
import api from "../../lib/api.js";
import { ready, isTelegram, initData } from "../../lib/telegram.js";
import { telegramLogin } from "../../lib/auth.js";
import { t } from "../../lib/i18n.js";

const ACTIVITIES = ["market", "restoran", "apteka", "kiyim", "boshqa"];

export default function RegisterStore() {
  const [f, setF] = useState({ name: "", activity_type: "market", phone: "",
                               address: "", latitude: null, longitude: null });
  const [res, setRes] = useState(null); const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { ready(); if (isTelegram()) telegramLogin(initData()).catch(() => {}); }, []);
  const geo = () => navigator.geolocation?.getCurrentPosition((p) =>
    setF((s) => ({ ...s, latitude: p.coords.latitude, longitude: p.coords.longitude })));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    try { const { data } = await api.post("/stores", f); setRes(data); }
    catch (e2) { setErr(e2?.response?.data?.detail || "Xatolik"); }
    finally { setBusy(false); }
  };

  if (res) return <div className="alert alert-success m-3">
    ✅ {res.name} — /shop/{res.slug}</div>;

  return (
    <div className="container py-3" style={{ maxWidth: 480 }}>
      <h5>{t("register_store")}</h5>
      {err && <div className="alert alert-danger py-2">{err}</div>}
      <form onSubmit={submit}>
        <input className="form-control mb-2" placeholder={t("name")} required
          value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <select className="form-select mb-2" value={f.activity_type}
          onChange={(e) => setF({ ...f, activity_type: e.target.value })}>
          {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input className="form-control mb-2" placeholder={t("phone")} required
          value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input className="form-control mb-2" placeholder={t("address")}
          value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        <button type="button" className="btn btn-outline-secondary mb-3 w-100" onClick={geo}>
          <i className="bi bi-geo-alt" /> {f.latitude ? "✓" : "Lokatsiya"}</button>
        <button className="btn btn-primary w-100" disabled={busy}>{t("save")}</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: ProductForm.jsx (add + edit, RU/UZ + photo)**

Behavior: WebApp form. Auto-login in Telegram. If `:id` param present, `GET /api/products/:id` to prefill. Fields: name_ru, name_uz, price, unit (select), category (select from `GET /api/categories`), in_stock + is_hidden toggles. Submit → POST (create) or PATCH (edit) `/api/products`. If a photo file chosen, after save `POST /api/products/{id}/photo` (multipart). Bilingual labels mirror the talablar "Добавить товар" screen.
```jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api.js";
import { ready, isTelegram, initData } from "../../lib/telegram.js";
import { telegramLogin } from "../../lib/auth.js";
import { t } from "../../lib/i18n.js";

const UNITS = ["dona", "kg", "litr", "portsiya"];

export default function ProductForm() {
  const { id } = useParams();
  const [cats, setCats] = useState([]);
  const [f, setF] = useState({ name_ru: "", name_uz: "", price: "", unit: "dona",
                               category: "", in_stock: true, is_hidden: false });
  const [file, setFile] = useState(null);
  const [done, setDone] = useState(false); const [busy, setBusy] = useState(false);

  useEffect(() => { ready();
    const boot = async () => {
      if (isTelegram()) await telegramLogin(initData()).catch(() => {});
      const c = await api.get("/categories").then((r) => r.data).catch(() => []);
      setCats(c);
      if (id) { const p = await api.get(`/products/${id}`).then((r) => r.data);
        setF({ ...p, category: p.category || "" }); }
    };
    boot();
  }, [id]);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const payload = { ...f, category: f.category || null };
      const saved = id ? await api.patch(`/products/${id}`, payload)
                       : await api.post("/products", payload);
      if (file) { const fd = new FormData(); fd.append("photo", file);
        await api.post(`/products/${saved.data.id}/photo`, fd); }
      setDone(true);
    } finally { setBusy(false); }
  };

  if (done) return <div className="alert alert-success m-3">✅ {t("save")}</div>;
  return (
    <div className="container py-3" style={{ maxWidth: 480 }}>
      <form onSubmit={submit}>
        <label className="form-label">Название (RU) 🇷🇺</label>
        <input className="form-control mb-2" required value={f.name_ru}
          onChange={(e) => setF({ ...f, name_ru: e.target.value })} />
        <label className="form-label">Nomi (UZ) 🇺🇿</label>
        <input className="form-control mb-2" required value={f.name_uz}
          onChange={(e) => setF({ ...f, name_uz: e.target.value })} />
        <input type="number" className="form-control mb-2" placeholder={t("price")} required
          value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        <select className="form-select mb-2" value={f.unit}
          onChange={(e) => setF({ ...f, unit: e.target.value })}>
          {UNITS.map((u) => <option key={u}>{u}</option>)}
        </select>
        <select className="form-select mb-2" value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}>
          <option value="">— {t("categories")} —</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name_uz}</option>)}
        </select>
        <input type="file" accept="image/*" className="form-control mb-2"
          onChange={(e) => setFile(e.target.files[0])} />
        <div className="form-check"><input className="form-check-input" type="checkbox"
          checked={f.in_stock} onChange={(e) => setF({ ...f, in_stock: e.target.checked })} />
          <label className="form-check-label">Mavjud</label></div>
        <div className="form-check mb-3"><input className="form-check-input" type="checkbox"
          checked={f.is_hidden} onChange={(e) => setF({ ...f, is_hidden: e.target.checked })} />
          <label className="form-check-label">Yashirish</label></div>
        <button className="btn btn-primary w-100" disabled={busy}>{t("save")}</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify build + commit**

Run: `cd frontend && npm run build` → succeeds.
```bash
git add frontend/src
git commit -m "feat(frontend): WebApp store-registration + product add/edit forms"
```

---

## Task 6: Operator panel (Products | Categories | Orders)

**Files:** `src/pages/panel/Panel.jsx`, `ProductsTab.jsx`, `CategoriesTab.jsx`, `OrdersTab.jsx`

- [ ] **Step 1: Panel.jsx — tabbed shell**

```jsx
import { useState } from "react";
import Layout from "../../components/Layout.jsx";
import ProductsTab from "./ProductsTab.jsx";
import CategoriesTab from "./CategoriesTab.jsx";
import OrdersTab from "./OrdersTab.jsx";
import { t } from "../../lib/i18n.js";

export default function Panel() {
  const [tab, setTab] = useState("orders");
  const tabs = [["orders", t("orders")], ["products", t("products")], ["categories", t("categories")]];
  return (
    <Layout title="Panel">
      <ul className="nav nav-tabs mb-3">
        {tabs.map(([k, label]) => (
          <li className="nav-item" key={k}>
            <button className={`nav-link ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{label}</button>
          </li>
        ))}
      </ul>
      {tab === "orders" && <OrdersTab />}
      {tab === "products" && <ProductsTab />}
      {tab === "categories" && <CategoriesTab />}
    </Layout>
  );
}
```

- [ ] **Step 2: OrdersTab.jsx** — `GET /api/admin/orders`; list each order (id, total, phone, status badge, items); a status `<select>` that `PATCH /api/admin/orders/{id}/status`. Refresh after change.

```jsx
import { useEffect, useState } from "react";
import api from "../../lib/api.js";
const STATUSES = ["new", "preparing", "delivering", "delivered", "cancelled"];
export default function OrdersTab() {
  const [orders, setOrders] = useState(null);
  const load = () => api.get("/admin/orders").then((r) => setOrders(r.data));
  useEffect(() => { load(); }, []);
  const setStatus = async (id, status) => { await api.patch(`/admin/orders/${id}/status`, { status }); load(); };
  if (!orders) return null;
  if (orders.length === 0) return <p className="text-muted">—</p>;
  return orders.map((o) => (
    <div className="card mb-2" key={o.id}><div className="card-body">
      <div className="d-flex justify-content-between">
        <strong>#{o.id} — {o.total_amount}</strong>
        <select className="form-select form-select-sm w-auto" value={o.status}
          onChange={(e) => setStatus(o.id, e.target.value)}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="small text-muted">{o.customer_phone} · {o.delivery_address}</div>
      <ul className="small mb-0">{o.items.map((i) =>
        <li key={i.id}>{i.product_name} × {i.quantity}</li>)}</ul>
    </div></div>
  ));
}
```

- [ ] **Step 3: ProductsTab.jsx** — `GET /api/products`; table of products with edit link (`/webapp/product/:id`) and delete (`DELETE /api/products/{id}`); an "Add" button linking `/webapp/product`. Toggle nothing fancy; reload after delete.

```jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api.js";
import { t, pname } from "../../lib/i18n.js";
export default function ProductsTab() {
  const [items, setItems] = useState(null);
  const load = () => api.get("/products").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const del = async (id) => { await api.delete(`/products/${id}`); load(); };
  if (!items) return null;
  return (<>
    <Link to="/webapp/product" className="btn btn-primary btn-sm mb-2"><i className="bi bi-plus" /> {t("add")}</Link>
    <table className="table"><tbody>
      {items.map((p) => (
        <tr key={p.id}>
          <td>{pname(p)}</td><td>{p.price}</td>
          <td className="text-end">
            <Link to={`/webapp/product/${p.id}`} className="btn btn-sm btn-outline-secondary me-1"><i className="bi bi-pencil" /></Link>
            <button className="btn btn-sm btn-outline-danger" onClick={() => del(p.id)}><i className="bi bi-trash" /></button>
          </td>
        </tr>
      ))}
    </tbody></table>
  </>);
}
```

- [ ] **Step 4: CategoriesTab.jsx** — `GET /api/categories`; inline add (name_ru + name_uz → `POST /api/categories`) and delete (`DELETE`).

```jsx
import { useEffect, useState } from "react";
import api from "../../lib/api.js";
import { t } from "../../lib/i18n.js";
export default function CategoriesTab() {
  const [items, setItems] = useState(null);
  const [f, setF] = useState({ name_ru: "", name_uz: "" });
  const load = () => api.get("/categories").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const add = async (e) => { e.preventDefault(); await api.post("/categories", f);
    setF({ name_ru: "", name_uz: "" }); load(); };
  const del = async (id) => { await api.delete(`/categories/${id}`); load(); };
  if (!items) return null;
  return (<>
    <form className="row g-2 mb-3" onSubmit={add}>
      <div className="col"><input className="form-control" placeholder="RU" required
        value={f.name_ru} onChange={(e) => setF({ ...f, name_ru: e.target.value })} /></div>
      <div className="col"><input className="form-control" placeholder="UZ" required
        value={f.name_uz} onChange={(e) => setF({ ...f, name_uz: e.target.value })} /></div>
      <div className="col-auto"><button className="btn btn-primary">{t("add")}</button></div>
    </form>
    <ul className="list-group">{items.map((c) => (
      <li key={c.id} className="list-group-item d-flex justify-content-between">
        {c.name_uz} / {c.name_ru}
        <button className="btn btn-sm btn-outline-danger" onClick={() => del(c.id)}><i className="bi bi-trash" /></button>
      </li>))}</ul>
  </>);
}
```

- [ ] **Step 5: Verify build + run unit tests + commit**

Run:
```bash
cd frontend && npm run build && npx vitest run
```
Expected: build succeeds; unit tests (cart + auth) pass.
```bash
git add frontend/src
git commit -m "feat(frontend): operator panel (orders/products/categories tabs)"
```

---

## Task 7: Dockerize frontend + wire into compose

**Files:** `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/.dockerignore`, `docker-compose.yml`

- [ ] **Step 1: nginx.conf (SPA fallback + /api proxy)**

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location /api/ { proxy_pass http://backend:8000; proxy_set_header Host $host; }
  location / { try_files $uri $uri/ /index.html; }
}
```

- [ ] **Step 2: Dockerfile (multi-stage build → nginx)**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```
`.dockerignore`: `node_modules`, `dist`, `.env`.

- [ ] **Step 3: Add frontend service to docker-compose.yml**

```yaml
  frontend:
    build: ./frontend
    depends_on: [backend]
    ports: ["8070:80"]
    restart: unless-stopped
```

- [ ] **Step 4: Verify build of the full stack**

Run:
```bash
docker compose build frontend
docker compose config --quiet && echo COMPOSE_OK
```
Expected: image builds; compose valid.

- [ ] **Step 5: Commit**

```bash
git add frontend/Dockerfile frontend/nginx.conf frontend/.dockerignore docker-compose.yml
git commit -m "feat(frontend): dockerize SPA (nginx) + wire into docker-compose"
```

---

## Self-Review Notes (author)

- **Spec coverage (§6 Frontend):** single SPA storefront + panel + WebApp forms ✓ (Tasks 3,5,6); axios + JWT interceptor ✓ (T2); Telegram WebApp auto-login via initData + browser login ✓ (T2,T4); cart in localStorage ✓ (T2); RU/UZ i18n ✓ (T1); public storefront ordering with telegram_id ✓ (T3).
- **API contract alignment:** operator orders use `/api/admin/orders` (not `/api/orders`); product photo via multipart `photo`; store id for ordering resolved via `GET /api/shop/:slug`. Matches backend.
- **Testing posture (per decision):** minimal — unit tests for `cart` and `auth` token storage; every task gated by `npm run build`; E2E deferred to Playwright. No component tests by choice.
- **Deferred (post-MVP):** polished design (frontend-design pass), store settings screen, delivery-pricing UI, payments UI, product variants, image cropping, optimistic updates, error toasts, per-store theming. Operator order status is also changeable here (web panel) in addition to the bot's inline buttons.
- **Live run:** `docker compose up` serves frontend on 8070 (nginx → backend). For Telegram WebApp, set the bot's WebApp/menu URL + `FRONTEND_WEBAPP_URL` to the deployed https origin.
```
