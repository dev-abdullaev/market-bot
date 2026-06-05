# Make Celery app available when Django starts so @shared_task decorators resolve.
from .celery import app as celery_app  # noqa: F401

__all__ = ["celery_app"]
