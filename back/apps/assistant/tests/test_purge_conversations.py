from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.assistant.models import AssistantConversation, AssistantMessage
from apps.assistant.tasks import purge_old_conversations


class PurgeConversationsTests(TestCase):
    def test_only_conversations_older_than_a_year_are_deleted(self):
        old = AssistantConversation.objects.create(session_id="old")
        recent = AssistantConversation.objects.create(session_id="recent")
        AssistantMessage.objects.create(conversation=old, role="user", content="?")
        AssistantConversation.objects.filter(pk=old.pk).update(
            last_message_at=timezone.now() - timedelta(days=400)
        )
        purge_old_conversations()
        self.assertFalse(AssistantConversation.objects.filter(pk=old.pk).exists())
        self.assertFalse(AssistantMessage.objects.filter(conversation_id=old.pk).exists())
        self.assertTrue(AssistantConversation.objects.filter(pk=recent.pk).exists())
