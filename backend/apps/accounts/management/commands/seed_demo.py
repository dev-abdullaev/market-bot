"""Management command: seed_demo

Creates a demo operator user, linked demo store, and seeds the store's
category tree from global_categories.json. Idempotent.

    python manage.py seed_demo

Credentials:
    username / phone : 998901112233
    password         : demo123
    role             : operator
    store slug       : demo-shop
"""
from django.core.management.base import BaseCommand

from apps.accounts.models import User
from apps.catalog.services import seed_store_categories
from apps.stores.models import Store

DEMO_USERNAME = "998901112233"
DEMO_PASSWORD = "demo123"
DEMO_STORE_SLUG = "demo-shop"
DEMO_STORE_NAME = "Demo do'kon"


class Command(BaseCommand):
    help = "Seed a demo operator user, store, and store categories (idempotent)."

    def handle(self, *args, **options):
        # 1. Store
        store, store_created = Store.objects.get_or_create(
            slug=DEMO_STORE_SLUG,
            defaults={"name": DEMO_STORE_NAME, "is_active": True},
        )
        if store_created:
            self.stdout.write(self.style.SUCCESS(
                f"[seed_demo] Store '{DEMO_STORE_NAME}' created."
            ))
        else:
            self.stdout.write(f"[seed_demo] Store already exists.")

        # 2. Operator user
        user, user_created = User.objects.get_or_create(
            username=DEMO_USERNAME,
            defaults={
                "phone": DEMO_USERNAME,
                "full_name": "Demo Operator",
                "role": "operator",
                "store": store,
                "is_active": True,
                "is_staff": False,
            },
        )
        if user_created:
            user.set_password(DEMO_PASSWORD)
            user.save(update_fields=["password"])
            self.stdout.write(self.style.SUCCESS(
                f"[seed_demo] User '{DEMO_USERNAME}' created."
            ))
        else:
            updated = []
            if user.store_id != store.pk:
                user.store = store; updated.append("store")
            if user.role != "operator":
                user.role = "operator"; updated.append("role")
            if updated:
                user.save(update_fields=updated)
            self.stdout.write(f"[seed_demo] User already exists.")

        # 3. Seed store categories from global_categories.json
        n = seed_store_categories(store)
        if n:
            self.stdout.write(self.style.SUCCESS(
                f"[seed_demo] {n} store categories created from global catalog."
            ))
        else:
            self.stdout.write(f"[seed_demo] Store categories already seeded.")

        self.stdout.write(self.style.SUCCESS("[seed_demo] Done."))
