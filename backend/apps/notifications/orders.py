from apps.accounts.models import User
from .telegram import send_message

STATUS_BUTTONS = [
    ("✅ Qabul", "preparing"),
    ("🚗 Yetkazilmoqda", "delivering"),
    ("✔️ Yetkazildi", "delivered"),
    ("❌ Bekor", "cancelled"),
]


def build_status_keyboard(order_id: int) -> dict:
    row = [{"text": label, "callback_data": f"ord:{order_id}:{status}"}
           for label, status in STATUS_BUTTONS]
    # two buttons per row
    rows = [row[0:2], row[2:4]]
    return {"inline_keyboard": rows}


def target_chat_id(store):
    if store.telegram_group_id:
        return store.telegram_group_id
    op = User.objects.filter(store=store, role="operator").exclude(
        telegram_id__isnull=True).exclude(telegram_id="").first()
    return op.telegram_id if op else None


def notify_new_order(order) -> None:
    chat = target_chat_id(order.store)
    if not chat:
        return
    lines = [f"🆕 <b>Yangi buyurtma #{order.id}</b>", ""]
    for it in order.items.all():
        lines.append(f"• {it.product_name} × {it.quantity} = {it.line_total}")
    lines += ["", f"💰 Jami: <b>{order.total_amount}</b>",
              f"📞 {order.customer_phone}",
              f"📍 {order.delivery_address or '-'}"]
    send_message(chat, "\n".join(lines), reply_markup=build_status_keyboard(order.id))
