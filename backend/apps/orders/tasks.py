import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name="apps.orders.tasks.process_scheduled_broadcasts")
def process_scheduled_broadcasts():
    """
    Runs every 60 seconds (configured in CELERY_BEAT_SCHEDULE).
    Finds pending ScheduledBroadcast rows whose scheduled_at is in the past,
    sends them, then handles repeat scheduling.
    """
    # Late import to avoid circular imports at module load time.
    from apps.orders.models import ScheduledBroadcast
    from apps.notifications.broadcast import broadcast_to_customers

    now = timezone.now()
    due = ScheduledBroadcast.objects.select_related("store").filter(
        status="pending", scheduled_at__lte=now
    )

    for broadcast in due:
        try:
            sent = broadcast_to_customers(broadcast.store, broadcast.text)
            broadcast.sent_count = sent
            broadcast.status = "sent"
            broadcast.sent_at = timezone.now()
            broadcast.save(update_fields=["sent_count", "status", "sent_at"])
            logger.info(
                "ScheduledBroadcast #%s sent to %s recipients (store=%s)",
                broadcast.pk, sent, broadcast.store_id,
            )
        except Exception:
            broadcast.status = "failed"
            broadcast.save(update_fields=["status"])
            logger.exception("ScheduledBroadcast #%s failed (store=%s)", broadcast.pk, broadcast.store_id)
            continue

        # Handle repeat: create next occurrence for daily/weekly
        if broadcast.repeat == "daily":
            next_at = broadcast.scheduled_at + timedelta(days=1)
            ScheduledBroadcast.objects.create(
                store=broadcast.store,
                text=broadcast.text,
                image_url=broadcast.image_url,
                repeat=broadcast.repeat,
                scheduled_at=next_at,
                status="pending",
            )
            logger.info(
                "ScheduledBroadcast #%s (daily) — next occurrence created for %s",
                broadcast.pk, next_at,
            )
        elif broadcast.repeat == "weekly":
            next_at = broadcast.scheduled_at + timedelta(weeks=1)
            ScheduledBroadcast.objects.create(
                store=broadcast.store,
                text=broadcast.text,
                image_url=broadcast.image_url,
                repeat=broadcast.repeat,
                scheduled_at=next_at,
                status="pending",
            )
            logger.info(
                "ScheduledBroadcast #%s (weekly) — next occurrence created for %s",
                broadcast.pk, next_at,
            )
        # repeat == "once": already marked sent, nothing more to do.
