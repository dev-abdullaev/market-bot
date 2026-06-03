"""Management command: seed_demo

Creates a demo operator user and a linked demo store for quick first-login.
Idempotent — safe to run on every deploy (uses get_or_create throughout).

    python manage.py seed_demo

Credentials created:
    username / phone : 998901112233
    password         : demo123
    role             : operator
    store slug       : demo-shop
"""
from django.core.management.base import BaseCommand

from apps.accounts.models import User
from apps.stores.models import Store

DEMO_USERNAME = "998901112233"
DEMO_PASSWORD = "demo123"
DEMO_STORE_SLUG = "demo-shop"
DEMO_STORE_NAME = "Demo do'kon"


class Command(BaseCommand):
    help = "Seed a demo operator user and store (idempotent)."

    def handle(self, *args, **options):
        # 1. Create or fetch the demo store with the exact slug.
        store, store_created = Store.objects.get_or_create(
            slug=DEMO_STORE_SLUG,
            defaults={
                "name": DEMO_STORE_NAME,
                "is_active": True,
            },
        )
        if store_created:
            self.stdout.write(self.style.SUCCESS(f"[seed_demo] Store '{DEMO_STORE_NAME}' created (slug={DEMO_STORE_SLUG})."))
        else:
            self.stdout.write(f"[seed_demo] Store '{DEMO_STORE_NAME}' already exists — skipping.")

        # 2. Create or fetch the demo operator user.
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
                f"[seed_demo] User '{DEMO_USERNAME}' created with role=operator linked to store."
            ))
        else:
            # Ensure the existing user is linked to the store and has the right role.
            updated_fields = []
            if user.store_id != store.pk:
                user.store = store
                updated_fields.append("store")
            if user.role != "operator":
                user.role = "operator"
                updated_fields.append("role")
            if updated_fields:
                user.save(update_fields=updated_fields)
                self.stdout.write(f"[seed_demo] User '{DEMO_USERNAME}' updated: {updated_fields}.")
            else:
                self.stdout.write(f"[seed_demo] User '{DEMO_USERNAME}' already exists — skipping.")

        self.stdout.write(self.style.SUCCESS("[seed_demo] Done."))
