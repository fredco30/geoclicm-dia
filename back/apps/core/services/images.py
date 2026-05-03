"""
Redimensionnement d'images via Pillow.

3 tailles générées automatiquement à l'upload :
- thumbnail : 400px max (listings, miniatures)
- medium   : 800px max (mobile détail)
- large    : 1600px max (desktop détail, retina)

Format de sortie : WebP (meilleur ratio qualité/poids), fallback JPEG si transparent.
"""
from __future__ import annotations

from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from django.db.models.fields.files import ImageFieldFile
from PIL import Image, ImageOps

# Tailles cibles : (suffix, largeur max)
SIZES: tuple[tuple[str, int], ...] = (
    ("thumbnail", 400),
    ("medium", 800),
    ("large", 1600),
)

WEBP_QUALITY = 82


def generate_resized_versions(image_field: ImageFieldFile) -> dict[str, str]:
    """
    Génère 3 versions redimensionnées d'une image et retourne un dict {size_name: path}.

    Les versions sont sauvegardées dans le même dossier que l'original,
    avec le suffix `_<size>` ajouté avant l'extension.

    Idempotent : si les versions existent déjà, ne fait rien.
    """
    if not image_field or not image_field.name:
        return {}

    storage = image_field.storage
    original_path = Path(image_field.name)
    original_stem = original_path.stem
    parent = original_path.parent

    results: dict[str, str] = {}

    with image_field.open("rb") as f:
        img = Image.open(f)
        # Corriger l'orientation EXIF (photos mobile)
        img = ImageOps.exif_transpose(img)
        img.load()

    for size_name, max_width in SIZES:
        suffix = f"_{size_name}.webp"
        new_name = str(parent / f"{original_stem}{suffix}")

        if storage.exists(new_name):
            results[size_name] = new_name
            continue

        # Resize en respectant le ratio, max_width sur le côté le plus long
        resized = img.copy()
        resized.thumbnail((max_width, max_width * 2), Image.Resampling.LANCZOS)

        buf = BytesIO()
        # WebP supporte alpha, on garde le mode original (RGBA ou RGB)
        if resized.mode not in ("RGB", "RGBA"):
            resized = resized.convert("RGBA" if "A" in resized.mode else "RGB")
        resized.save(buf, format="WEBP", quality=WEBP_QUALITY, method=6)

        storage.save(new_name, ContentFile(buf.getvalue()))
        results[size_name] = new_name

    return results


def get_resized_url(image_field: ImageFieldFile, size: str = "medium") -> str | None:
    """Retourne l'URL d'une version redimensionnée si elle existe, sinon l'URL d'origine."""
    if not image_field or not image_field.name:
        return None

    original_path = Path(image_field.name)
    suffix = f"_{size}.webp"
    new_name = str(original_path.parent / f"{original_path.stem}{suffix}")

    storage = image_field.storage
    if storage.exists(new_name):
        return storage.url(new_name)
    return image_field.url
