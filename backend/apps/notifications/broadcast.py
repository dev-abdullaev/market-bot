from apps.orders.models import Customer, Order
from .telegram import send_message


def broadcast_to_customers(store, text: str) -> int:
    tg_ids = (Order.objects.filter(store=store, customer__isnull=False)
              .exclude(customer__telegram_id="")
              .values_list("customer__telegram_id", flat=True).distinct())
    sent = 0
    for tid in tg_ids:
        if send_message(tid, text) is not None:
            sent += 1
    return sent
