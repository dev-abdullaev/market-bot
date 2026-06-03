"""
Catalog service layer.

Business logic is kept here so views stay thin.
"""
from decimal import Decimal, InvalidOperation

from django.db import transaction

from .models import Category, GlobalProduct, Product


def _get_or_create_category(store, name, parent):
    """Fetch an existing category (case-sensitive, same store + parent) or create it."""
    name = name.strip()
    obj, _ = Category.objects.get_or_create(
        store=store,
        parent=parent,
        name_uz=name,
        defaults={"name_ru": name, "is_active": True},
    )
    return obj


def _get_or_create_category_bilingual(store, name_uz, name_ru, parent):
    """Variant of _get_or_create_category that accepts distinct uz/ru names."""
    name_uz = name_uz.strip()
    name_ru = (name_ru or name_uz).strip()
    obj, _ = Category.objects.get_or_create(
        store=store,
        parent=parent,
        name_uz=name_uz,
        defaults={"name_ru": name_ru, "is_active": True},
    )
    return obj


def _resolve_category(store, row):
    """Walk the 3-level category chain from a row dict and return the deepest category.

    Returns None when all three category columns are blank.
    """
    cat1_name = (row.get("category_1") or "").strip()
    cat2_name = (row.get("category_2") or "").strip()
    cat3_name = (row.get("category_3") or "").strip()

    if not cat1_name:
        return None

    cat1 = _get_or_create_category(store, cat1_name, parent=None)

    if not cat2_name:
        return cat1

    cat2 = _get_or_create_category(store, cat2_name, parent=cat1)

    if not cat3_name:
        return cat2

    cat3 = _get_or_create_category(store, cat3_name, parent=cat2)
    return cat3


def import_products(store, rows):
    """Process a list of row dicts and bulk-import products.

    Returns a dict: {"created": int, "skipped": int, "errors": list[str]}

    Per-row errors are collected; the entire import does NOT abort on one bad row.
    Category chain is built (get_or_create) per row.
    Rows with neither a name nor a price are silently skipped.
    """
    created = 0
    skipped = 0
    errors = []

    for idx, row in enumerate(rows, start=1):
        name_ru = (row.get("name_ru") or "").strip()
        name_uz = (row.get("name_uz") or "").strip()
        price_raw = (row.get("price") or "").strip()

        # Skip rows with no name AND no price
        if not name_ru and not name_uz and not price_raw:
            skipped += 1
            continue

        # Validate price
        try:
            price = Decimal(price_raw)
        except (InvalidOperation, ValueError):
            errors.append(
                f"Row {idx}: invalid price {price_raw!r} for product {name_ru or name_uz!r}"
            )
            continue

        try:
            category = _resolve_category(store, row)
            Product.objects.create(
                store=store,
                category=category,
                name_ru=name_ru,
                name_uz=name_uz,
                description_ru=(row.get("description_ru") or "").strip(),
                description_uz=(row.get("description_uz") or "").strip(),
                price=price,
                unit=(row.get("unit") or "dona").strip() or "dona",
                barcode=(row.get("barcode") or "").strip(),
                ikpu=(row.get("ikpu") or "").strip(),
            )
            created += 1
        except Exception as exc:  # noqa: BLE001
            errors.append(f"Row {idx}: {exc}")

    return {"created": created, "skipped": skipped, "errors": errors}


def add_global_products_to_store(store, ids):
    """Copy GlobalProduct rows (by id list) into a store's own product catalog.

    Idempotent: when a non-empty barcode already exists in the store, the
    product is skipped.  The category chain from ``category_path`` is resolved
    (or created) per-store.

    Returns: {"created": int, "skipped": int}
    """
    created_count = 0
    skipped_count = 0

    global_products = GlobalProduct.objects.filter(id__in=ids)

    with transaction.atomic():
        for gp in global_products:
            # Idempotency: skip when barcode already present in store
            if gp.barcode and store.products.filter(barcode=gp.barcode).exists():
                skipped_count += 1
                continue

            # Resolve category chain (root → leaf) from category_path
            category = None
            for node in (gp.category_path or []):
                node_uz = (node.get("name_uz") or "").strip()
                node_ru = (node.get("name_ru") or "").strip()
                if not node_uz and not node_ru:
                    continue
                category = _get_or_create_category_bilingual(
                    store=store,
                    name_uz=node_uz or node_ru,
                    name_ru=node_ru or node_uz,
                    parent=category,
                )

            Product.objects.create(
                store=store,
                category=category,
                name_uz=gp.name_uz,
                name_ru=gp.name_ru,
                price=gp.price,
                unit=gp.unit,
                barcode=gp.barcode,
                ikpu=gp.ikpu,
                brand=gp.brand,
                model=gp.model,
                manufacturer=gp.manufacturer,
                weight_kg=gp.weight_kg,
                length_cm=gp.length_cm,
                width_cm=gp.width_cm,
                height_cm=gp.height_cm,
                photo_url=gp.image_url or "",
                images=[gp.image_url] if gp.image_url else [],
                has_discount=bool(gp.discount_price),
                discount_price=gp.discount_price,
            )
            created_count += 1

    return {"created": created_count, "skipped": skipped_count}
