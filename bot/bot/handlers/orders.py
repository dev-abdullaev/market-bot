from aiogram import Router
from aiogram.types import CallbackQuery
from ..api import set_order_status
from ..i18n import t

router = Router()

async def send_customer_note(bot, customer_tg, status, lang="uz"):
    await bot.send_message(customer_tg, t(lang, "status_updated", status=status))

@router.callback_query(lambda c: c.data and c.data.startswith("ord:"))
async def handle_status_callback(callback: CallbackQuery):
    parts = callback.data.split(":")
    if len(parts) != 3:
        return
    _, order_id, status = parts
    if not order_id.isdigit():
        return
    result = await set_order_status(telegram_id=callback.from_user.id,
                                    order_id=int(order_id), status=status)
    if not result:
        await callback.answer("⚠️ Xatolik", show_alert=True)
        return
    await callback.answer(t("uz", "status_updated", status=status))
    try:
        await callback.message.edit_reply_markup(reply_markup=None)
    except Exception:
        pass
    cust = result.get("customer_telegram_id")
    if cust:
        await send_customer_note(callback.message.bot, cust, status)
