"""
Celery — découverte automatique des tâches via @shared_task.

Sprint 1 : aucune tâche métier, juste l'infrastructure prête.
Sprint 2 : tâche de publication Facebook auto.
"""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

app = Celery("geoclicmedia")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
