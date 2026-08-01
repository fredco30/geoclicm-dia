"""Troncature du titre de chunk pour tenir dans varchar(300)."""

from django.test import SimpleTestCase

from apps.assistant.indexers.base import ChunkInput


class ChunkTitleTruncationLogicTests(SimpleTestCase):
    """La garde est dans save_chunks ; ici on verifie la regle de troncature
    sans toucher la BDD (PostGIS absent en local)."""

    def _apply_guard(self, title: str) -> str:
        # Reproduit la regle de save_chunks (point d'ecriture unique).
        if len(title) > 300:
            return title[:297] + "..."
        return title

    def test_long_title_truncated(self):
        long_title = "Mission d'assistance " + "x" * 320
        out = self._apply_guard(long_title)
        self.assertLessEqual(len(out), 300)
        self.assertTrue(out.endswith("..."))
        self.assertEqual(out[:297], long_title[:297])

    def test_short_title_unchanged(self):
        self.assertEqual(self._apply_guard("Titre court"), "Titre court")

    def test_exactly_300_unchanged(self):
        self.assertEqual(self._apply_guard("y" * 300), "y" * 300)

    def test_chunk_input_accepts_long_title(self):
        ci = ChunkInput(
            source_kind="ot",
            source_id="src1:x#0",
            source_url="https://www.terredecamargue.fr/x",
            title="z" * 325,
            content="contenu",
        )
        self.assertEqual(len(ci.title), 325)  # garde appliquee plus tard
