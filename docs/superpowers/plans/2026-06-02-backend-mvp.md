# Backend MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Django + DRF backend for the market-bot MVP: multi-tenant data model, JWT auth (browser + Telegram Web App), and the full REST API for store registration, catalog management, public storefront, and orders.

**Architecture:** A single Django project (`config`) with four apps — `accounts`, `stores`, `catalog`, `orders`. DRF + SimpleJWT for the API. Every domain row links to a `Store`; every authenticated endpoint is filtered by `request.user.store` so no tenant can read another's data. PostgreSQL in production/dev (via docker-compose); SQLite is fine for the test run.

**Tech Stack:** Python 3.12, Django 5, djangorestframework, djangorestframework-simplejwt, Pillow, django-cors-headers, python-dotenv, psycopg2-binary, pytest + pytest-django + model-bakery.

**Reference spec:** `docs/superpowers/specs/2026-06-02-market-bot-mvp-design.md`

---

## File Structure

```
backend/
├── manage.py
├── requirements.txt
├── pytest.ini
├── .env.example
├── config/
│   ├── __init__.py
│   ├── settings.py        # single settings file, env-driven
│   ├── urls.py            # root URLConf, includes app urls under /api
│   ├── wsgi.py / asgi.py
├── apps/
│   ├── __init__.py
│   ├── accounts/          # custom User, JWT auth, telegram-webapp auth
│   │   ├── models.py      # User
│   │   ├── managers.py    # UserManager
│   │   ├── serializers.py
│   │   ├── views.py       # login, me, logout, telegram-webapp
│   │   ├── telegram.py    # initData HMAC validation
│   │   ├── urls.py
│   │   └── tests/
│   ├── stores/            # Store model + registration
│   │   ├── models.py      # Store
│   │   ├── serializers.py
│   │   ├── views.py       # create store, stores/me
│   │   ├── urls.py
│   │   └── tests/
│   ├── catalog/           # Category, Product + CRUD + public storefront
│   │   ├── models.py      # Category, Product
│   │   ├── serializers.py
│   │   ├── views.py       # category/product CRUD (operator), shop (public)
│   │   ├── permissions.py # IsOperator
│   │   ├── urls.py
│   │   └── tests/
│   └── orders/            # Customer, Order, OrderItem + order API
│       ├── models.py      # Customer, Order, OrderItem
│       ├── serializers.py
│       ├── views.py       # create order, list, status
│       ├── urls.py
│       └── tests/
```

**Responsibility split:** one app per bounded context. Cross-tenant isolation lives in each app's views (queryset filtered by store) and is verified by a dedicated test per app.

---

## Task 0: Project scaffolding

**Files:**
- Create: `backend/requirements.txt`, `backend/.env.example`, `backend/pytest.ini`, `backend/manage.py`, `backend/config/{__init__,settings,urls,wsgi,asgi}.py`, `backend/apps/__init__.py`, `docker-compose.yml`

- [ ] **Step 1: Create requirements.txt**

```
Django==5.0.6
djangorestframework==3.15.1
djangorestframework-simplejwt==5.3.1
django-cors-headers==4.3.1
psycopg2-binary==2.9.9
Pillow==10.3.0
python-dotenv==1.0.1
pytest==8.2.0
pytest-django==4.8.0
model-bakery==1.18.0
```

- [ ] **Step 2: Create the project skeleton**

Run:
```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
django-admin startproject config .
mkdir -p apps && touch apps/__init__.py
python manage.py startapp accounts apps/accounts
python manage.py startapp stores apps/stores
python manage.py startapp catalog apps/catalog
python manage.py startapp orders apps/orders
```
After `startapp`, set each app's `apps.py` `name` to the dotted path (e.g. `name = "apps.accounts"`).

- [ ] **Step 3: Configure settings.py**

Replace the generated `config/settings.py` body with (keep the auto-generated `BASE_DIR` / `SECRET_KEY` lines, then):

```python
import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "dev-insecure-key")
DEBUG = os.getenv("DEBUG", "1") == "1"
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "apps.accounts",
    "apps.stores",
    "apps.catalog",
    "apps.orders",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

if os.getenv("DB_NAME"):
    DATABASES = {"default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER", "postgres"),
        "PASSWORD": os.getenv("DB_PASSWORD", "postgres"),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }}
else:
    DATABASES = {"default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }}

AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
}

SIMPLE_JWT = {"ACCESS_TOKEN_LIFETIME": timedelta(days=30)}

CORS_ALLOW_ALL_ORIGINS = True  # tighten in later phase

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Tashkent"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
```

- [ ] **Step 4: Create .env.example and pytest.ini**

`.env.example`:
```
SECRET_KEY=change-me
DEBUG=1
TELEGRAM_BOT_TOKEN=
# DB_NAME=marketbot
# DB_USER=postgres
# DB_PASSWORD=postgres
# DB_HOST=localhost
```

`pytest.ini`:
```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings
python_files = tests.py test_*.py *_tests.py
addopts = -q
```

- [ ] **Step 5: Create docker-compose.yml (project root)**

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: marketbot
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes:
  pgdata:
```

- [ ] **Step 6: Verify Django boots**

Run: `cd backend && python manage.py check`
Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 7: Commit**

```bash
git add backend docker-compose.yml
git commit -m "chore(backend): scaffold Django project, apps, settings"
```

---

## Task 1: Custom User model (accounts)

**Files:**
- Create: `backend/apps/accounts/managers.py`, modify `backend/apps/accounts/models.py`
- Test: `backend/apps/accounts/tests/test_models.py`

- [ ] **Step 1: Write the failing test**

Create `backend/apps/accounts/tests/__init__.py` (empty) and `test_models.py`:
```python
import pytest
from apps.accounts.models import User

pytestmark = pytest.mark.django_db

def test_create_user_with_phone():
    u = User.objects.create_user(username="998901112233", full_name="Ali", password="x")
    assert u.username == "998901112233"
    assert u.role == "customer"          # default
    assert u.check_password("x")

def test_create_operator_with_telegram_id():
    u = User.objects.create_user(username="998901112234", telegram_id="555",
                                 role="operator")
    assert u.role == "operator"
    assert u.telegram_id == "555"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest apps/accounts/tests/test_models.py -v`
Expected: FAIL — import error / `create_user` signature mismatch.

- [ ] **Step 3: Write the manager and model**

`apps/accounts/managers.py`:
```python
from django.contrib.auth.models import BaseUserManager

class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, username, password=None, **extra):
        if not username:
            raise ValueError("username (phone) is required")
        user = self.model(username=username, **extra)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("role", "operator")
        return self.create_user(username, password, **extra)
```

`apps/accounts/models.py`:
```python
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from .managers import UserManager

class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [("operator", "Operator"), ("customer", "Customer")]

    username = models.CharField(max_length=32, unique=True)   # phone
    full_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    telegram_id = models.CharField(max_length=32, unique=True, null=True, blank=True)
    role = models.CharField(max_length=16, choices=ROLE_CHOICES, default="customer")
    store = models.ForeignKey("stores.Store", null=True, blank=True,
                              on_delete=models.SET_NULL, related_name="operators")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "username"
    objects = UserManager()

    def __str__(self):
        return f"{self.full_name or self.username} ({self.role})"
```

- [ ] **Step 4: Make migrations & run the test**

Run:
```bash
cd backend && python manage.py makemigrations accounts && pytest apps/accounts/tests/test_models.py -v
```
Expected: 2 passed. (The `store` FK is a string ref, so this migrates before the stores app exists — fine.)

- [ ] **Step 5: Commit**

```bash
git add backend/apps/accounts
git commit -m "feat(accounts): custom User model with phone/telegram/role"
```

---

## Task 2: Store model (stores)

**Files:**
- Modify: `backend/apps/stores/models.py`
- Test: `backend/apps/stores/tests/test_models.py`

- [ ] **Step 1: Write the failing test**

`apps/stores/tests/__init__.py` (empty) and `test_models.py`:
```python
import pytest
from apps.stores.models import Store

pytestmark = pytest.mark.django_db

def test_store_slug_autogenerated():
    s = Store.objects.create(name="My Shop", phone="998900000000")
    assert s.slug == "my-shop"
    assert s.is_active is True
    assert s.currency_code == "uz"

def test_store_slug_unique_suffix():
    Store.objects.create(name="Shop", phone="1")
    s2 = Store.objects.create(name="Shop", phone="2")
    assert s2.slug == "shop-2"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest apps/stores/tests/test_models.py -v`
Expected: FAIL — no `slug` autogeneration.

- [ ] **Step 3: Write the model**

`apps/stores/models.py`:
```python
from django.db import models
from django.utils.text import slugify

class Store(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    activity_type = models.CharField(max_length=64, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    address = models.CharField(max_length=512, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    logo_url = models.URLField(blank=True)
    currency_code = models.CharField(max_length=8, default="uz")
    telegram_bot_token = models.CharField(max_length=128, blank=True)
    telegram_group_id = models.CharField(max_length=32, blank=True)
    is_delivery_enabled = models.BooleanField(default=True)
    is_pickup_enabled = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or "store"
            slug, i = base, 1
            while Store.objects.exclude(pk=self.pk).filter(slug=slug).exists():
                i += 1
                slug = f"{base}-{i}"
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
```

- [ ] **Step 4: Make migrations & run the test**

Run:
```bash
cd backend && python manage.py makemigrations stores && pytest apps/stores/tests/test_models.py -v
```
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/stores
git commit -m "feat(stores): Store model with auto-slug"
```

---

## Task 3: Category model (catalog)

**Files:**
- Modify: `backend/apps/catalog/models.py`
- Test: `backend/apps/catalog/tests/test_category_model.py`

- [ ] **Step 1: Write the failing test**

`apps/catalog/tests/__init__.py` (empty) and `test_category_model.py`:
```python
import pytest
from model_bakery import baker
from apps.catalog.models import Category

pytestmark = pytest.mark.django_db

def test_category_hierarchy():
    store = baker.make("stores.Store")
    parent = Category.objects.create(store=store, name_ru="Напитки", name_uz="Ichimliklar")
    child = Category.objects.create(store=store, name_ru="Соки", name_uz="Sharbatlar",
                                    parent=parent)
    assert child.parent == parent
    assert list(parent.children.all()) == [child]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest apps/catalog/tests/test_category_model.py -v`
Expected: FAIL — model not defined.

- [ ] **Step 3: Write the model**

`apps/catalog/models.py` (Category portion):
```python
from django.db import models

class Category(models.Model):
    store = models.ForeignKey("stores.Store", on_delete=models.CASCADE,
                              related_name="categories")
    parent = models.ForeignKey("self", null=True, blank=True,
                               on_delete=models.CASCADE, related_name="children")
    name_ru = models.CharField(max_length=255)
    name_uz = models.CharField(max_length=255)
    image_url = models.URLField(blank=True)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name_uz or self.name_ru
```

- [ ] **Step 4: Make migrations & run the test**

Run:
```bash
cd backend && python manage.py makemigrations catalog && pytest apps/catalog/tests/test_category_model.py -v
```
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/catalog
git commit -m "feat(catalog): hierarchical Category model"
```

---

## Task 4: Product model (catalog)

**Files:**
- Modify: `backend/apps/catalog/models.py`
- Test: `backend/apps/catalog/tests/test_product_model.py`

- [ ] **Step 1: Write the failing test**

`test_product_model.py`:
```python
import pytest
from decimal import Decimal
from model_bakery import baker
from apps.catalog.models import Product

pytestmark = pytest.mark.django_db

def test_product_defaults():
    store = baker.make("stores.Store")
    cat = baker.make("catalog.Category", store=store)
    p = Product.objects.create(store=store, category=cat, name_ru="Кола",
                               name_uz="Kola", price=Decimal("12000"))
    assert p.in_stock is True
    assert p.is_hidden is False
    assert p.unit == "dona"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest apps/catalog/tests/test_product_model.py -v`
Expected: FAIL — Product not defined.

- [ ] **Step 3: Add the Product model**

Append to `apps/catalog/models.py`:
```python
class Product(models.Model):
    UNIT_CHOICES = [("dona", "dona"), ("kg", "kg"), ("litr", "litr"), ("portsiya", "portsiya")]

    store = models.ForeignKey("stores.Store", on_delete=models.CASCADE,
                              related_name="products")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True,
                                 blank=True, related_name="products")
    name_ru = models.CharField(max_length=255)
    name_uz = models.CharField(max_length=255)
    description_ru = models.TextField(blank=True)
    description_uz = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=16, choices=UNIT_CHOICES, default="dona")
    photo_url = models.URLField(blank=True)
    in_stock = models.BooleanField(default=True)
    is_hidden = models.BooleanField(default=False)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name_uz or self.name_ru
```

- [ ] **Step 4: Make migrations & run the test**

Run:
```bash
cd backend && python manage.py makemigrations catalog && pytest apps/catalog/tests/test_product_model.py -v
```
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/catalog
git commit -m "feat(catalog): Product model (bilingual, stock/hidden)"
```

---

## Task 5: Customer, Order, OrderItem models (orders)

**Files:**
- Modify: `backend/apps/orders/models.py`
- Test: `backend/apps/orders/tests/test_models.py`

- [ ] **Step 1: Write the failing test**

`apps/orders/tests/__init__.py` (empty) and `test_models.py`:
```python
import pytest
from decimal import Decimal
from model_bakery import baker
from apps.orders.models import Order, OrderItem, Customer

pytestmark = pytest.mark.django_db

def test_order_total_from_items():
    store = baker.make("stores.Store")
    order = Order.objects.create(store=store, customer_name="A", customer_phone="1")
    p = baker.make("catalog.Product", store=store, price=Decimal("5000"))
    OrderItem.objects.create(order=order, product=p, product_name="X",
                             price=Decimal("5000"), quantity=2,
                             line_total=Decimal("10000"))
    assert order.status == "new"
    assert order.items.count() == 1
    assert order.items.first().line_total == Decimal("10000")

def test_customer_unique_telegram_id():
    Customer.objects.create(telegram_id="42", full_name="A")
    with pytest.raises(Exception):
        Customer.objects.create(telegram_id="42", full_name="B")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest apps/orders/tests/test_models.py -v`
Expected: FAIL — models not defined.

- [ ] **Step 3: Write the models**

`apps/orders/models.py`:
```python
from django.db import models

class Customer(models.Model):
    telegram_id = models.CharField(max_length=32, unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    last_address = models.CharField(max_length=512, blank=True)
    last_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    last_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.full_name or self.telegram_id

class Order(models.Model):
    STATUS = [("new", "new"), ("preparing", "preparing"), ("delivering", "delivering"),
              ("delivered", "delivered"), ("cancelled", "cancelled")]
    PAYMENT = [("cash", "cash")]

    store = models.ForeignKey("stores.Store", on_delete=models.CASCADE, related_name="orders")
    customer = models.ForeignKey(Customer, null=True, blank=True,
                                 on_delete=models.SET_NULL, related_name="orders")
    customer_name = models.CharField(max_length=255)
    customer_phone = models.CharField(max_length=32)
    status = models.CharField(max_length=16, choices=STATUS, default="new")
    delivery_address = models.CharField(max_length=512, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=16, choices=PAYMENT, default="cash")
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.pk} ({self.status})"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("catalog.Product", null=True, on_delete=models.SET_NULL)
    product_name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
```

- [ ] **Step 4: Make migrations & run the test**

Run:
```bash
cd backend && python manage.py makemigrations orders && pytest apps/orders/tests/test_models.py -v
```
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/orders
git commit -m "feat(orders): Customer, Order, OrderItem models"
```

---

## Task 6: Telegram initData validation helper (accounts)

**Files:**
- Create: `backend/apps/accounts/telegram.py`
- Test: `backend/apps/accounts/tests/test_telegram.py`

- [ ] **Step 1: Write the failing test**

`test_telegram.py`:
```python
import hashlib, hmac, json
from urllib.parse import urlencode
from apps.accounts.telegram import parse_init_data

BOT_TOKEN = "123:ABC"

def _build_init_data(user: dict) -> str:
    data = {"auth_date": "1700000000", "user": json.dumps(user)}
    check = "\n".join(f"{k}={data[k]}" for k in sorted(data))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    data["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(data)

def test_valid_init_data_returns_user():
    init = _build_init_data({"id": 555, "first_name": "Ali"})
    user = parse_init_data(init, BOT_TOKEN)
    assert user["id"] == 555

def test_tampered_init_data_returns_none():
    init = _build_init_data({"id": 555}) + "&extra=1"
    assert parse_init_data(init, BOT_TOKEN) is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest apps/accounts/tests/test_telegram.py -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the helper**

`apps/accounts/telegram.py`:
```python
import hashlib
import hmac
import json
from urllib.parse import parse_qsl

def parse_init_data(init_data: str, bot_token: str):
    """Validate Telegram WebApp initData. Returns the user dict or None."""
    try:
        pairs = dict(parse_qsl(init_data, strict_parsing=False))
    except ValueError:
        return None
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        return None
    check_string = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received_hash):
        return None
    try:
        return json.loads(pairs.get("user", "{}"))
    except json.JSONDecodeError:
        return None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest apps/accounts/tests/test_telegram.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/accounts/telegram.py backend/apps/accounts/tests/test_telegram.py
git commit -m "feat(accounts): Telegram WebApp initData validation"
```

---

## Task 7: Auth endpoints — login, me, logout, telegram-webapp (accounts)

**Files:**
- Create: `backend/apps/accounts/serializers.py`, `backend/apps/accounts/views.py`, `backend/apps/accounts/urls.py`
- Modify: `backend/config/urls.py`
- Test: `backend/apps/accounts/tests/test_auth_api.py`

- [ ] **Step 1: Wire root URLConf first**

`config/urls.py`:
```python
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.stores.urls")),
    path("api/", include("apps.catalog.urls")),
    path("api/", include("apps.orders.urls")),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```
Create empty `urls.py` with `urlpatterns = []` in `stores`, `catalog`, `orders` now so includes don't fail.

- [ ] **Step 2: Write the failing test**

`test_auth_api.py`:
```python
import json
import pytest
from urllib.parse import urlencode
import hashlib, hmac
from rest_framework.test import APIClient
from apps.accounts.models import User

pytestmark = pytest.mark.django_db
BOT = "123:ABC"

def _init(user):
    data = {"auth_date": "1700000000", "user": json.dumps(user)}
    check = "\n".join(f"{k}={data[k]}" for k in sorted(data))
    secret = hmac.new(b"WebAppData", BOT.encode(), hashlib.sha256).digest()
    data["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(data)

def test_login_returns_jwt():
    User.objects.create_user(username="998900000001", password="pass", role="operator")
    r = APIClient().post("/api/auth/login", {"username": "998900000001", "password": "pass"})
    assert r.status_code == 200
    assert "access" in r.json()

def test_me_requires_auth():
    assert APIClient().get("/api/auth/me").status_code == 401

def test_telegram_webapp_creates_user(settings):
    settings.TELEGRAM_BOT_TOKEN = BOT
    r = APIClient().post("/api/auth/telegram-webapp",
                         {"init_data": _init({"id": 777, "first_name": "Ali"})})
    assert r.status_code == 200
    assert "access" in r.json()
    assert User.objects.filter(telegram_id="777").exists()

def test_telegram_webapp_rejects_bad_signature(settings):
    settings.TELEGRAM_BOT_TOKEN = BOT
    r = APIClient().post("/api/auth/telegram-webapp", {"init_data": "user=%7B%7D&hash=bad"})
    assert r.status_code == 401
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && pytest apps/accounts/tests/test_auth_api.py -v`
Expected: FAIL — 404 (urls/views missing).

- [ ] **Step 4: Write serializer, views, urls**

`apps/accounts/serializers.py`:
```python
from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    store_id = serializers.IntegerField(source="store.id", read_only=True, default=None)
    store_name = serializers.CharField(source="store.name", read_only=True, default=None)
    store_slug = serializers.CharField(source="store.slug", read_only=True, default=None)

    class Meta:
        model = User
        fields = ["id", "username", "full_name", "phone", "telegram_id", "role",
                  "store_id", "store_name", "store_slug"]
```

`apps/accounts/views.py`:
```python
from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import UserSerializer
from .telegram import parse_init_data

def _tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh),
            "user": UserSerializer(user).data}

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = authenticate(username=request.data.get("username"),
                            password=request.data.get("password"))
        if not user:
            return Response({"detail": "Invalid credentials"}, status=401)
        return Response(_tokens(user))

class TelegramWebAppView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        tg = parse_init_data(request.data.get("init_data", ""), settings.TELEGRAM_BOT_TOKEN)
        if not tg or "id" not in tg:
            return Response({"detail": "Invalid init data"}, status=401)
        tg_id = str(tg["id"])
        user, _ = User.objects.get_or_create(
            telegram_id=tg_id,
            defaults={"username": f"tg{tg_id}",
                      "full_name": tg.get("first_name", "")})
        return Response(_tokens(user))

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

class LogoutView(APIView):
    def post(self, request):
        return Response(status=status.HTTP_204_NO_CONTENT)
```

`apps/accounts/urls.py`:
```python
from django.urls import path
from .views import LoginView, TelegramWebAppView, MeView, LogoutView

urlpatterns = [
    path("login", LoginView.as_view()),
    path("telegram-webapp", TelegramWebAppView.as_view()),
    path("me", MeView.as_view()),
    path("logout", LogoutView.as_view()),
]
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && pytest apps/accounts/tests/test_auth_api.py -v`
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/accounts backend/config/urls.py backend/apps/stores/urls.py backend/apps/catalog/urls.py backend/apps/orders/urls.py
git commit -m "feat(accounts): login, me, logout, telegram-webapp auth endpoints"
```

---

## Task 8: Store registration + stores/me (stores)

**Files:**
- Create: `backend/apps/stores/serializers.py`, `backend/apps/stores/views.py`; modify `backend/apps/stores/urls.py`
- Test: `backend/apps/stores/tests/test_api.py`

- [ ] **Step 1: Write the failing test**

`test_api.py`:
```python
import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.stores.models import Store

pytestmark = pytest.mark.django_db

def _auth(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c

def test_create_store_links_operator():
    user = User.objects.create_user(username="998900000002", role="customer")
    c = _auth(user)
    r = c.post("/api/stores", {"name": "Ali Shop", "phone": "998900000002",
                               "activity_type": "market"}, format="json")
    assert r.status_code == 201
    store = Store.objects.get(name="Ali Shop")
    user.refresh_from_db()
    assert user.store_id == store.id
    assert user.role == "operator"

def test_stores_me_returns_own_store():
    store = Store.objects.create(name="S", phone="1")
    user = User.objects.create_user(username="998900000003", role="operator", store=store)
    r = _auth(user).get("/api/stores/me")
    assert r.status_code == 200
    assert r.json()["slug"] == store.slug
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest apps/stores/tests/test_api.py -v`
Expected: FAIL — 404.

- [ ] **Step 3: Write serializer, views, urls**

`apps/stores/serializers.py`:
```python
from rest_framework import serializers
from .models import Store

class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = ["id", "name", "slug", "activity_type", "phone", "address",
                  "latitude", "longitude", "logo_url", "currency_code",
                  "telegram_bot_token", "telegram_group_id",
                  "is_delivery_enabled", "is_pickup_enabled", "is_active"]
        read_only_fields = ["id", "slug", "is_active"]
```

`apps/stores/views.py`:
```python
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Store
from .serializers import StoreSerializer

class StoreCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = StoreSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        store = ser.save()
        user = request.user
        user.store = store
        user.role = "operator"
        if not user.phone:
            user.phone = store.phone
        user.save(update_fields=["store", "role", "phone"])
        return Response(StoreSerializer(store).data, status=status.HTTP_201_CREATED)

class StoreMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.store_id:
            return Response({"detail": "No store"}, status=404)
        return Response(StoreSerializer(request.user.store).data)

    def patch(self, request):
        if not request.user.store_id:
            return Response({"detail": "No store"}, status=404)
        ser = StoreSerializer(request.user.store, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)
```

`apps/stores/urls.py`:
```python
from django.urls import path
from .views import StoreCreateView, StoreMeView

urlpatterns = [
    path("stores", StoreCreateView.as_view()),
    path("stores/me", StoreMeView.as_view()),
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest apps/stores/tests/test_api.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/stores
git commit -m "feat(stores): store registration + stores/me endpoints"
```

---

## Task 9: Category & Product CRUD with tenant isolation (catalog)

**Files:**
- Create: `backend/apps/catalog/permissions.py`, `backend/apps/catalog/serializers.py`, `backend/apps/catalog/views.py`; modify `backend/apps/catalog/urls.py`
- Test: `backend/apps/catalog/tests/test_crud_api.py`, `backend/apps/catalog/tests/test_isolation.py`

- [ ] **Step 1: Write the failing tests**

`test_crud_api.py`:
```python
import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.stores.models import Store
from apps.catalog.models import Category, Product

pytestmark = pytest.mark.django_db

def _operator():
    store = Store.objects.create(name="S", phone="1")
    user = User.objects.create_user(username="op", role="operator", store=store)
    c = APIClient(); c.force_authenticate(user=user)
    return c, store

def test_create_category():
    c, store = _operator()
    r = c.post("/api/categories", {"name_ru": "Напитки", "name_uz": "Ichimliklar"},
               format="json")
    assert r.status_code == 201
    assert Category.objects.filter(store=store, name_uz="Ichimliklar").exists()

def test_create_and_list_product():
    c, store = _operator()
    cat = Category.objects.create(store=store, name_ru="a", name_uz="a")
    r = c.post("/api/products", {"name_ru": "Кола", "name_uz": "Kola",
                                 "price": "12000", "category": cat.id}, format="json")
    assert r.status_code == 201
    lst = c.get("/api/products").json()
    assert len(lst) == 1
    assert lst[0]["name_uz"] == "Kola"
```

`test_isolation.py` (the critical anti-IDOR test):
```python
import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.stores.models import Store
from apps.catalog.models import Category, Product

pytestmark = pytest.mark.django_db

def test_operator_cannot_see_other_store_products():
    store_a = Store.objects.create(name="A", phone="1")
    store_b = Store.objects.create(name="B", phone="2")
    Product.objects.create(store=store_b, name_ru="x", name_uz="x", price=1)
    op_a = User.objects.create_user(username="opa", role="operator", store=store_a)
    c = APIClient(); c.force_authenticate(user=op_a)
    assert c.get("/api/products").json() == []

def test_operator_cannot_edit_other_store_product():
    store_a = Store.objects.create(name="A", phone="1")
    store_b = Store.objects.create(name="B", phone="2")
    p_b = Product.objects.create(store=store_b, name_ru="x", name_uz="x", price=1)
    op_a = User.objects.create_user(username="opa", role="operator", store=store_a)
    c = APIClient(); c.force_authenticate(user=op_a)
    assert c.patch(f"/api/products/{p_b.id}", {"price": "999"}, format="json").status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pytest apps/catalog/tests/test_crud_api.py apps/catalog/tests/test_isolation.py -v`
Expected: FAIL — 404.

- [ ] **Step 3: Write permission, serializers, views, urls**

`apps/catalog/permissions.py`:
```python
from rest_framework.permissions import BasePermission

class IsOperatorWithStore(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.role == "operator" and u.store_id)
```

`apps/catalog/serializers.py`:
```python
from rest_framework import serializers
from .models import Category, Product

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "parent", "name_ru", "name_uz", "image_url",
                  "sort_order", "is_active"]

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "category", "name_ru", "name_uz", "description_ru",
                  "description_uz", "price", "unit", "photo_url",
                  "in_stock", "is_hidden", "sort_order"]
```

`apps/catalog/views.py`:
```python
from rest_framework import viewsets
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer
from .permissions import IsOperatorWithStore

class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsOperatorWithStore]

    def get_queryset(self):
        return Category.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsOperatorWithStore]

    def get_queryset(self):
        qs = Product.objects.filter(store=self.request.user.store)
        cat = self.request.query_params.get("category")
        return qs.filter(category_id=cat) if cat else qs

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)
```

`apps/catalog/urls.py`:
```python
from rest_framework.routers import SimpleRouter
from .views import CategoryViewSet, ProductViewSet

router = SimpleRouter(trailing_slash=False)
router.register("categories", CategoryViewSet, basename="category")
router.register("products", ProductViewSet, basename="product")
urlpatterns = router.urls
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && pytest apps/catalog/tests/test_crud_api.py apps/catalog/tests/test_isolation.py -v`
Expected: 4 passed (isolation returns `[]` and 404 for other-store access).

- [ ] **Step 5: Commit**

```bash
git add backend/apps/catalog
git commit -m "feat(catalog): Category/Product CRUD with strict tenant isolation"
```

---

## Task 10: Product photo upload (catalog)

**Files:**
- Modify: `backend/apps/catalog/views.py`, `backend/apps/catalog/urls.py`
- Test: `backend/apps/catalog/tests/test_photo.py`

- [ ] **Step 1: Write the failing test**

`test_photo.py`:
```python
import io
import pytest
from PIL import Image
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.accounts.models import User
from apps.stores.models import Store
from apps.catalog.models import Product

pytestmark = pytest.mark.django_db

def _png():
    buf = io.BytesIO()
    Image.new("RGB", (2, 2)).save(buf, "PNG")
    buf.seek(0)
    return SimpleUploadedFile("p.png", buf.read(), content_type="image/png")

def test_upload_product_photo():
    store = Store.objects.create(name="S", phone="1")
    user = User.objects.create_user(username="op", role="operator", store=store)
    p = Product.objects.create(store=store, name_ru="a", name_uz="a", price=1)
    c = APIClient(); c.force_authenticate(user=user)
    r = c.post(f"/api/products/{p.id}/photo", {"photo": _png()}, format="multipart")
    assert r.status_code == 200
    p.refresh_from_db()
    assert p.photo_url.endswith(".png") or "/media/" in p.photo_url
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest apps/catalog/tests/test_photo.py -v`
Expected: FAIL — 404.

- [ ] **Step 3: Add the photo action**

Add to `ProductViewSet` in `apps/catalog/views.py`:
```python
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import default_storage

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def photo(self, request, pk=None):
        product = self.get_object()
        f = request.FILES.get("photo")
        if not f:
            return Response({"detail": "No file"}, status=400)
        path = default_storage.save(f"products/{product.id}_{f.name}", f)
        product.photo_url = request.build_absolute_uri(default_storage.url(path))
        product.save(update_fields=["photo_url"])
        return Response({"photo_url": product.photo_url})
```
(The router already exposes `/api/products/{id}/photo` for a detail action named `photo`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest apps/catalog/tests/test_photo.py -v`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/catalog
git commit -m "feat(catalog): product photo upload"
```

---

## Task 11: Public storefront endpoints (catalog)

**Files:**
- Modify: `backend/apps/catalog/views.py`, `backend/apps/catalog/serializers.py`, `backend/apps/catalog/urls.py`
- Test: `backend/apps/catalog/tests/test_shop.py`

- [ ] **Step 1: Write the failing test**

`test_shop.py`:
```python
import pytest
from rest_framework.test import APIClient
from apps.stores.models import Store
from apps.catalog.models import Category, Product

pytestmark = pytest.mark.django_db

def test_public_shop_and_catalog():
    store = Store.objects.create(name="Shop", phone="1")
    cat = Category.objects.create(store=store, name_ru="a", name_uz="a")
    Product.objects.create(store=store, category=cat, name_ru="v", name_uz="v", price=1)
    Product.objects.create(store=store, category=cat, name_ru="hidden", name_uz="h",
                           price=1, is_hidden=True)
    Product.objects.create(store=store, category=cat, name_ru="oos", name_uz="o",
                           price=1, in_stock=False)
    c = APIClient()  # no auth
    assert c.get(f"/api/shop/{store.slug}").json()["name"] == "Shop"
    cat_data = c.get(f"/api/shop/{store.slug}/catalog").json()
    names = [p["name_uz"] for cc in cat_data["categories"] for p in cc["products"]]
    assert names == ["v"]      # hidden & out-of-stock excluded
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest apps/catalog/tests/test_shop.py -v`
Expected: FAIL — 404.

- [ ] **Step 3: Add public serializers + views + urls**

Add to `apps/catalog/serializers.py`:
```python
class PublicProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name_ru", "name_uz", "description_ru", "description_uz",
                  "price", "unit", "photo_url"]

class PublicCategorySerializer(serializers.ModelSerializer):
    products = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name_ru", "name_uz", "image_url", "products"]

    def get_products(self, obj):
        qs = obj.products.filter(in_stock=True, is_hidden=False)
        return PublicProductSerializer(qs, many=True).data
```

Ensure these imports exist at the top of `apps/catalog/views.py` (add any that are missing — `APIView` and `Response` were added in Task 10):
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.generics import RetrieveAPIView
from django.shortcuts import get_object_or_404
from apps.stores.models import Store
from apps.stores.serializers import StoreSerializer
from .serializers import PublicCategorySerializer
```

Then add these views to `apps/catalog/views.py`:
```python
class ShopView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = StoreSerializer
    lookup_field = "slug"
    queryset = Store.objects.filter(is_active=True)

class ShopCatalogView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        store = get_object_or_404(Store, slug=slug, is_active=True)
        cats = store.categories.filter(is_active=True)
        return Response({"categories": PublicCategorySerializer(cats, many=True).data})
```

Add to `apps/catalog/urls.py` (before `urlpatterns = router.urls`):
```python
from django.urls import path
from .views import ShopView, ShopCatalogView

urlpatterns = [
    path("shop/<slug:slug>", ShopView.as_view()),
    path("shop/<slug:slug>/catalog", ShopCatalogView.as_view()),
] + router.urls
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest apps/catalog/tests/test_shop.py -v`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/catalog
git commit -m "feat(catalog): public storefront + catalog endpoints"
```

---

## Task 12: Order creation (orders)

**Files:**
- Create: `backend/apps/orders/serializers.py`, `backend/apps/orders/views.py`; modify `backend/apps/orders/urls.py`
- Test: `backend/apps/orders/tests/test_create.py`

- [ ] **Step 1: Write the failing test**

`test_create.py`:
```python
import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from apps.stores.models import Store
from apps.catalog.models import Product
from apps.orders.models import Order

pytestmark = pytest.mark.django_db

def test_create_order_computes_total_from_db_prices():
    store = Store.objects.create(name="S", phone="1")
    p1 = Product.objects.create(store=store, name_ru="a", name_uz="a", price=Decimal("5000"))
    p2 = Product.objects.create(store=store, name_ru="b", name_uz="b", price=Decimal("3000"))
    payload = {
        "store": store.id,
        "customer_name": "Ali", "customer_phone": "998900000000",
        "delivery_address": "Tashkent",
        "items": [{"product": p1.id, "quantity": 2},
                  {"product": p2.id, "quantity": 1}],
    }
    r = APIClient().post("/api/orders", payload, format="json")
    assert r.status_code == 201
    order = Order.objects.get(id=r.json()["id"])
    assert order.total_amount == Decimal("13000")   # 2*5000 + 3000, server-side
    assert order.items.count() == 2
    assert order.items.first().price == Decimal("5000")  # snapshot

def test_create_order_rejects_foreign_product():
    store = Store.objects.create(name="S", phone="1")
    other = Store.objects.create(name="O", phone="2")
    foreign = Product.objects.create(store=other, name_ru="x", name_uz="x", price=1)
    payload = {"store": store.id, "customer_name": "A", "customer_phone": "1",
               "items": [{"product": foreign.id, "quantity": 1}]}
    r = APIClient().post("/api/orders", payload, format="json")
    assert r.status_code == 400
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest apps/orders/tests/test_create.py -v`
Expected: FAIL — 404.

- [ ] **Step 3: Write serializer + view + url**

`apps/orders/serializers.py`:
```python
from rest_framework import serializers
from apps.catalog.models import Product
from .models import Order, OrderItem

class OrderItemInput(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "price", "quantity", "line_total"]

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "store", "customer_name", "customer_phone", "status",
                  "delivery_address", "latitude", "longitude", "total_amount",
                  "payment_method", "comment", "items", "created_at"]
        read_only_fields = ["status", "total_amount", "created_at"]

class OrderCreateSerializer(serializers.Serializer):
    store = serializers.IntegerField()
    customer_name = serializers.CharField()
    customer_phone = serializers.CharField()
    delivery_address = serializers.CharField(required=False, allow_blank=True)
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    comment = serializers.CharField(required=False, allow_blank=True)
    telegram_id = serializers.CharField(required=False, allow_blank=True)
    items = OrderItemInput(many=True)

    def create(self, validated):
        items = validated.pop("items")
        store_id = validated.pop("store")
        validated.pop("telegram_id", None)
        order = Order.objects.create(store_id=store_id, **validated)
        total = 0
        for it in items:
            product = Product.objects.filter(id=it["product"], store_id=store_id).first()
            if not product:
                order.delete()
                raise serializers.ValidationError("Product not in this store")
            line = product.price * it["quantity"]
            OrderItem.objects.create(order=order, product=product,
                                     product_name=product.name_uz or product.name_ru,
                                     price=product.price, quantity=it["quantity"],
                                     line_total=line)
            total += line
        order.total_amount = total
        order.save(update_fields=["total_amount"])
        return order
```

`apps/orders/views.py`:
```python
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import OrderCreateSerializer, OrderSerializer

class OrderCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = OrderCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        order = ser.save()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
```

`apps/orders/urls.py`:
```python
from django.urls import path
from .views import OrderCreateView

urlpatterns = [
    path("orders", OrderCreateView.as_view()),
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest apps/orders/tests/test_create.py -v`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/orders
git commit -m "feat(orders): order creation with server-side totals + snapshots"
```

---

## Task 13: Operator order list + status update (orders)

**Files:**
- Modify: `backend/apps/orders/views.py`, `backend/apps/orders/urls.py`
- Test: `backend/apps/orders/tests/test_manage.py`

- [ ] **Step 1: Write the failing test**

`test_manage.py`:
```python
import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.stores.models import Store
from apps.orders.models import Order

pytestmark = pytest.mark.django_db

def _op(store):
    u = User.objects.create_user(username=f"op{store.id}", role="operator", store=store)
    c = APIClient(); c.force_authenticate(user=u)
    return c

def test_operator_lists_only_own_orders():
    a = Store.objects.create(name="A", phone="1")
    b = Store.objects.create(name="B", phone="2")
    Order.objects.create(store=a, customer_name="x", customer_phone="1")
    Order.objects.create(store=b, customer_name="y", customer_phone="2")
    assert len(_op(a).get("/api/admin/orders").json()) == 1

def test_operator_updates_status():
    a = Store.objects.create(name="A", phone="1")
    o = Order.objects.create(store=a, customer_name="x", customer_phone="1")
    r = _op(a).patch(f"/api/admin/orders/{o.id}/status", {"status": "preparing"},
                     format="json")
    assert r.status_code == 200
    o.refresh_from_db()
    assert o.status == "preparing"

def test_operator_cannot_update_other_store_order():
    a = Store.objects.create(name="A", phone="1")
    b = Store.objects.create(name="B", phone="2")
    o = Order.objects.create(store=b, customer_name="x", customer_phone="1")
    assert _op(a).patch(f"/api/admin/orders/{o.id}/status",
                        {"status": "preparing"}, format="json").status_code == 404

def test_invalid_status_rejected():
    a = Store.objects.create(name="A", phone="1")
    o = Order.objects.create(store=a, customer_name="x", customer_phone="1")
    assert _op(a).patch(f"/api/admin/orders/{o.id}/status",
                        {"status": "bogus"}, format="json").status_code == 400
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest apps/orders/tests/test_manage.py -v`
Expected: FAIL — 404.

- [ ] **Step 3: Add views + urls**

Append to `apps/orders/views.py`:
```python
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListAPIView
from django.shortcuts import get_object_or_404
from .models import Order

VALID_STATUSES = {s for s, _ in Order.STATUS}

class OrderListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        qs = Order.objects.filter(store=self.request.user.store)
        st = self.request.query_params.get("status")
        return qs.filter(status=st) if st else qs

class OrderStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        order = get_object_or_404(Order, pk=pk, store=request.user.store)
        new = request.data.get("status")
        if new not in VALID_STATUSES:
            return Response({"detail": "Invalid status"}, status=400)
        order.status = new
        order.save(update_fields=["status", "updated_at"])
        return Response(OrderSerializer(order).data)
```

Update `apps/orders/urls.py`:
```python
from django.urls import path
from .views import OrderCreateView, OrderListView, OrderStatusView

urlpatterns = [
    path("orders", OrderCreateView.as_view()),
    path("admin/orders", OrderListView.as_view()),
    path("admin/orders/<int:pk>/status", OrderStatusView.as_view()),
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest apps/orders/tests/test_manage.py -v`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/orders
git commit -m "feat(orders): operator order list + status update (tenant-isolated)"
```

---

## Task 14: Full suite + admin registration + final commit

**Files:**
- Modify: `backend/apps/*/admin.py`
- Test: full run

- [ ] **Step 1: Register models in Django admin**

In each app's `admin.py`:
```python
# apps/stores/admin.py
from django.contrib import admin
from .models import Store
admin.site.register(Store)
```
Repeat for `accounts.User`, `catalog.Category`, `catalog.Product`, `orders.Customer`, `orders.Order`, `orders.OrderItem`.

- [ ] **Step 2: Run the full test suite**

Run: `cd backend && pytest -v`
Expected: all tests pass (models + auth + stores + catalog + isolation + orders ≈ 20+ tests).

- [ ] **Step 3: Sanity boot check + migrations**

Run:
```bash
cd backend && python manage.py makemigrations --check --dry-run && python manage.py check
```
Expected: no missing migrations; no system issues.

- [ ] **Step 4: Commit**

```bash
git add backend
git commit -m "chore(backend): register admin models; backend MVP complete"
```

---

## Self-Review Notes (author)

- **Spec coverage:** Store registration (T8) ✓, bilingual catalog CRUD + photo (T9,T10) ✓, public storefront (T11) ✓, order create with snapshot+server totals (T12) ✓, order list + status (T13) ✓, JWT browser + Telegram WebApp auth (T6,T7) ✓, multi-tenant isolation tests (T9,T12,T13) ✓.
- **Deferred per spec (not in this plan):** payments, delivery pricing, billing/balance, reservations, broadcast, banners, analytics, super-admin, per-store bots, variants, inventory qty — correct.
- **Type consistency:** `Order.STATUS` choices reused in T13 via `VALID_STATUSES`; `store`/`role`/`telegram_id` field names consistent across accounts↔stores↔catalog↔orders.
- **Imports:** Task 11 uses clean top-of-file imports (`APIView`, `Response`, `AllowAny`, `RetrieveAPIView`); no hacks remain.
- **Next plans:** Plan 2 (aiogram bot), Plan 3 (React SPA), both consume this API.
