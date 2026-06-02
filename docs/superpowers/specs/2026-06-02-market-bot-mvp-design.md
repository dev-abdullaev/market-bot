# market-bot — MVP Design Spec

**Date:** 2026-06-02
**Status:** Approved design (brainstorming complete) → ready for implementation plan
**Reference product studied:** `@talablarbot` / `talablar.up.railway.app` (multi-tenant Telegram storefront SaaS, originally restaurant-oriented)

---

## Qisqa tavsif (Uzbek overview)

talablar — Telegram orqali online do'kon ochib beruvchi **ko'p-do'konli (multi-tenant) SaaS platforma**. Biz uning **minimal yadrosini** quramiz: bitta do'kon ochish → mahsulot qo'shish → xaridor katalogdan buyurtma berish → operatorga buyurtma tushishi. To'lov naqd, yetkazish oddiy. Baza multi-tenant qilib quriladi (kelajakda ko'p do'kon oson qo'shiladi), lekin v1 bitta do'kon bilan ishlaydi.

This spec covers **Phase 1 (Minimal Core)** only. Later phases (payments, delivery pricing, billing/monetization, multi-store switching, reservations, broadcast, banners, analytics, super-admin, per-store bots, AI assist, product variants) are explicitly out of scope here and will each get their own spec → plan → implementation cycle.

---

## 1. Goal & Success Criteria

Build the minimal working core of a Telegram-based online storefront platform.

**Done when:**
1. An operator can register one store via a Telegram Web App form.
2. The operator can add/edit/delete products (bilingual RU/UZ) with category, price, photo, stock & hidden flags.
3. A customer can open the storefront (Telegram Web App), browse the catalog by category, add to cart, and place an order with address + phone.
4. The operator receives the order as a Telegram message and can move it through statuses (new → preparing → delivering → delivered / cancelled); the customer is notified on status change.
5. Payment is cash only; delivery is simple (address + phone, no price calc).
6. Every API query is tenant-isolated (`store = request.user.store` / slug) — no cross-tenant data access (the original product had an IDOR here; we must not replicate it).

---

## 2. Architecture

```
market-bot/
├── backend/    Django + DRF  → REST API (/api), JWT auth        ──► PostgreSQL
├── bot/        aiogram        → registration, order notifications, Web App buttons
└── frontend/   React + Vite (Bootstrap) → single SPA:
                 • /shop/:slug        (customer storefront — Telegram Web App)
                 • /panel             (operator panel — Web App + browser)
                 • /webapp/register   (store registration form — Web App)
                 • /webapp/product    (add/edit product form — Web App)
                 • /login             (browser login)
```

- **One React SPA** serves both storefront and operator panel; opened either standalone in a browser (JWT login) or as a Telegram Web App web-view (auto-login via `initData`). This mirrors talablar's single-bundle approach (DRY).
- Redis/Celery are **not** in v1 (deferred to phases needing broadcast / scheduled reports).
- Original stack was Node.js/Express + React + Postgres on Railway. We use **Django + DRF** because the team environment, tooling, and specialist agents are Django-centric, and Django's admin/ORM accelerate this work.

### Component responsibilities
- **backend** — data model, REST API, auth (JWT), tenant isolation, business rules. Django apps: `accounts`, `stores`, `catalog`, `orders`.
- **bot** — Telegram entry point: `/start`, registration button (Web App), product-add button (Web App), order notifications to operator/group, status-change buttons, help/language. Talks to backend via API (or shared DB — decided at planning).
- **frontend** — storefront + operator panel + Web App forms. Talks to `/api`.

---

## 3. Data Model (PostgreSQL via Django ORM)

All tables are multi-tenant: every domain row links to a `Store`.

### Store (tenant)
```
id, name, slug (unique), activity_type
phone, address, latitude, longitude
logo_url, currency_code (default "uz")
telegram_bot_token (null = shared v1 bot), telegram_group_id (orders group)
is_delivery_enabled (bool), is_pickup_enabled (bool)
is_active, created_at, updated_at
```
Deferred store fields (later phases): ui_theme, ui_primary_color, catalog_card_mode,
show_store_contacts, menu_view_mode, service_fee, payme_*, click_url, uzum_url,
balance, order_cost, is_free_tier, inventory_tracking_enabled, reservation_enabled, etc.

### User (custom Django user) — operator + customer roles
```
id, username (phone), full_name, phone
telegram_id (unique), role [operator | customer]
store (FK, nullable; the store an operator belongs to)
password (for browser login), is_active
```

### Category — hierarchical
```
id, store (FK), parent (FK self, null = top-level)
name_ru, name_uz, image_url
sort_order, is_active
```

### Product
```
id, store (FK), category (FK)
name_ru, name_uz, description_ru, description_uz
price (decimal), unit [dona | kg | litr | ...], photo_url
in_stock (bool), is_hidden (bool)
sort_order, created_at, updated_at
```
Deferred: size/variant rows, quantity (inventory tracking), old_price/discount, AI-generated text.

### Order
```
id, store (FK), customer (FK, null), customer_name, customer_phone
status [new | preparing | delivering | delivered | cancelled]
delivery_address, latitude, longitude
total_amount (decimal), payment_method [cash]
comment, created_at, updated_at
```

### OrderItem — with price/name snapshot
```
id, order (FK), product (FK)
product_name (snapshot), price (snapshot), quantity, line_total
```
Snapshot so that later product edits don't change historical orders.

### Customer — Telegram-based buyer
```
id, telegram_id (unique), full_name, phone
last_address, last_latitude, last_longitude, created_at
```

**Relationships:** Store 1─∞ Category / Product / Order / User · Category self 1─∞ (parent/children) · Order 1─∞ OrderItem · Customer 1─∞ Order.

---

## 4. REST API (DRF, base `/api`)

**Auth (JWT)**
```
POST  /api/auth/telegram-webapp   Telegram initData → JWT (Web App auto-login)
POST  /api/auth/login             phone + password → JWT (browser)
GET   /api/auth/me                current user + store
POST  /api/auth/logout
```

**Store / registration**
```
POST  /api/stores                 create store (from Web App form)
GET   /api/stores/me              operator's store + settings
PATCH /api/stores/me              update settings
```

**Category (operator; auto-filtered by store)**
```
GET/POST          /api/categories
GET/PATCH/DELETE  /api/categories/{id}
```

**Product (operator)**
```
GET/POST          /api/products            (?category=)
GET/PATCH/DELETE  /api/products/{id}
POST              /api/products/{id}/photo (image upload)
```

**Storefront (public, by store slug)**
```
GET  /api/shop/{slug}             store + display settings
GET  /api/shop/{slug}/catalog     categories + products (only in_stock & not hidden)
```

**Order**
```
POST  /api/orders                 customer places order (cart + address + phone)
GET   /api/orders                 operator: store orders (?status=)
PATCH /api/orders/{id}/status     change status
```

**Hard rule:** every authenticated endpoint filters by `store = request.user.store`; storefront filters by slug. A cross-tenant test exists for each endpoint.

---

## 5. Bot Flows (aiogram, shared v1 bot)

**Registration (operator)**
```
/start → welcome + [🏪 Register store] (Web App)
  → Web App form (name, activity, phone, geo, logo)
  → POST /api/stores → "✅ Store created" + login/password + [🔐 Open panel] (Web App)
```

**Add product (operator)**
```
[➕ Add product] (Web App) → form (RU/UZ name, price, photo, category, stock)
  → POST /api/products
```

**Order (customer)**
```
store storefront link/bot → [🛍️ Catalog] (Web App)
  → cart → checkout → POST /api/orders
  → operator/group message: "🆕 Order #123: items, total, phone, address"
      [✅ Accept] [👨‍🍳 Preparing] [🚗 Delivering] [✔️ Delivered] [❌ Cancel]
  → on status change → notify customer
```

**Help / language:** `[🆘 Help]`, `[🌐 Language]` (RU/UZ).

---

## 6. Frontend (React + Vite + Bootstrap)

```
frontend/src/
├── routes/  /shop/:slug, /panel, /panel/products, /panel/orders,
│            /webapp/register, /webapp/product, /login
├── lib/     api.js (axios, baseURL /api, JWT interceptor),
│            telegram.js (Web App SDK: initData, MainButton, theme),
│            i18n.js (RU/UZ)
└── store/   cart state (localStorage), auth state
```

**Auth flow (two entry points, one system):**
- Telegram web-view: `Telegram.WebApp.initData` → `POST /api/auth/telegram-webapp` → JWT (passwordless).
- Browser: `/login` → phone + password → `POST /api/auth/login` → JWT.
- JWT in `localStorage("token")`, sent as `Authorization: Bearer`.
- Customer storefront is public (no token); order uses `telegram_id` from initData.

---

## 7. Testing Strategy

- **Backend:** pytest + pytest-django. Cover models, each API endpoint, the full order flow, and auth.
- **Critical:** a cross-tenant ("IDOR") test per endpoint — store A must never see store B's data.
- **Bot:** aiogram handler tests (registration, order notification) with mocks.
- **Frontend:** manual for v1; Playwright later.
- **Approach:** TDD — write the test first, then the implementation, per model/endpoint.

---

## 8. Out of Scope (future phases, each its own spec)

Payments (Payme/Click/Uzum/card), distance-based delivery pricing & zones, billing/monetization
(store balance, per-order `order_cost`, free tier), multi-store switching, reservations,
broadcast (рассылка), advertising banners, statistics/analytics, audit log & security events,
super-admin/moderator panel, per-store dedicated bots, AI text assist, product variants/sizes,
inventory tracking, customizable UI themes, receipt customization, scheduled delivery.

---

## 9. Key Constraints & Decisions Log

- **Multi-tenant from day one** (store_id everywhere) but operate with a single store in v1.
- **Do not replicate the original's IDOR** — strict tenant isolation, tested.
- **One React SPA** for storefront + panel (browser + Telegram web-view).
- **Cash-only, simple delivery** in v1.
- **Django + DRF** chosen over the original's Node.js to match team tooling/agents.
- **No Redis/Celery** in v1.
- Bilingual content (RU/UZ) is core, not deferred.
