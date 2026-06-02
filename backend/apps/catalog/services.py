"""
Catalog service layer.

Business logic is kept here so views stay thin.
"""
from decimal import Decimal, InvalidOperation

from .models import Category, Product


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
