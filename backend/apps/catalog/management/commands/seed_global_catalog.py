"""Management command: seed_global_catalog

Reads backend/apps/catalog/data/global_products.json and populates the
GlobalProduct table. Idempotent: uses update_or_create keyed on barcode (when
non-empty) or get_or_create keyed on (name_uz, name_ru, price) otherwise.

Usage:
    python manage.py seed_global_catalog
    python manage.py seed_global_catalog --flush   # truncate first
"""
import json
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.catalog.models import GlobalProduct

# Resolve path relative to this file: .../management/commands/seed_global_catalog.py
# parents[0] = commands/, parents[1] = management/, parents[2] = catalog/
DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "global_products.json"


def _dec(value, default="0"):
    """Safely parse a Decimal from a string; fall back to default."""
    try:
        return Decimal(str(value).strip() or default)
    except (InvalidOperation, ValueError):
        return Decimal(default)


def _dec_or_none(value):
    """Return Decimal from value, or None when falsy."""
    if value is None or str(value).strip() in ("", "null", "None"):
        return None
    try:
        return Decimal(str(value).strip())
    except (InvalidOperation, ValueError):
        return None


class Command(BaseCommand):
    help = "Seed the GlobalProduct table from global_products.json"

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete all GlobalProduct rows before seeding",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            deleted, _ = GlobalProduct.objects.all().delete()
            self.stdout.write(f"Flushed {deleted} existing global products.")

        if not DATA_FILE.exists():
            self.stderr.write(f"Data file not found: {DATA_FILE}")
            return

        with open(DATA_FILE, encoding="utf-8") as fh:
            rows = json.load(fh)

        created_count = 0
        updated_count = 0

        for row in rows:
            barcode = (row.get("barcode") or "").strip()
            name_uz = (row.get("name_uz") or "").strip()
            name_ru = (row.get("name_ru") or "").strip()
            price = _dec(row.get("price"), "0")

            defaults = {
                "name_uz": name_uz,
                "name_ru": name_ru,
                "price": price,
                "discount_price": _dec_or_none(row.get("discount_price")),
                "ikpu": (row.get("ikpu") or "").strip(),
                "unit": (row.get("unit") or "dona").strip() or "dona",
                "brand": (row.get("brand") or "").strip(),
                "model": (row.get("model") or "").strip(),
                "manufacturer": (row.get("manufacturer") or "").strip(),
                "weight_kg": _dec(row.get("weight_kg"), "0"),
                "length_cm": _dec(row.get("length_cm"), "0"),
                "width_cm": _dec(row.get("width_cm"), "0"),
                "height_cm": _dec(row.get("height_cm"), "0"),
                "image_url": (row.get("image_url") or "").strip(),
                "category_path": row.get("category_path") or [],
                "recommended_category": (row.get("recommended_category") or "").strip(),
            }

            if barcode:
                _, created = GlobalProduct.objects.update_or_create(
                    barcode=barcode,
                    defaults=defaults,
                )
            else:
                _, created = GlobalProduct.objects.get_or_create(
                    name_uz=name_uz,
                    name_ru=name_ru,
                    price=price,
                    defaults=defaults,
                )

            if created:
                created_count += 1
            else:
                updated_count += 1

        total = created_count + updated_count
        self.stdout.write(
            f"Seeded {total} global products "
            f"(created {created_count}, updated {updated_count})."
        )
