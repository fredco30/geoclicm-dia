"""
Redimensionnement d'images via Pillow.

Pipeline en 2 phases au moment de l'upload :

1. **Cap de l'original** (cap_original_image) — limite la dimension la plus
   longue selon le rôle de l'image. Évite de stocker des photos brutes 6 MB
   alors qu'elles seront affichées au max en 1600px sur desktop retina.

   3 paliers selon usage :
   - LOGO_MAX_SIZE (600px)    — User.avatar, Business.logo
   - COVER_MAX_SIZE (1600px)  — Article.cover_image, Business.cover_image,
                                 AdCampaign.image, Commune.cover_image
   - GALLERY_MAX_SIZE (1920px) — Media.file (galerie articles + photos
                                  Business), permet lightbox sans flou

2. **Génération de 3 variants** (generate_resized_versions) :
   - thumbnail : 400px max (listings, miniatures)
   - medium   : 800px max (mobile détail)
   - large    : 1600px max (desktop détail, retina)

Format des variants : WebP qualité 82 (meilleur ratio qualité/poids).
Format de l'original : conservé tel qu'uploadé (JPEG/PNG/WebP), juste cappé
en taille — évite de casser les URLs déjà en cache.
"""
from __future__ import annotations

import logging
from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from django.db.models.fields.files import ImageFieldFile
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------------
# Phase 1 — paliers de cap pour l'original uploadé
# ----------------------------------------------------------------------------

# Dimension max sur le côté le plus long (ratio préservé)
LOGO_MAX_SIZE = 600       # User.avatar, Business.logo — affichage max ~150px
COVER_MAX_SIZE = 1600     # cover articles + commerces + ads — desktop retina
GALLERY_MAX_SIZE = 1920   # Media (galerie / photos) — lightbox plein écran

# Qualité de recompression de l'original cappé
ORIGINAL_QUALITY = 85

# ----------------------------------------------------------------------------
# Phase 2 — variants pour responsive (srcset front)
# ----------------------------------------------------------------------------

# Tailles cibles : (suffix, largeur max)
SIZES: tuple[tuple[str, int], ...] = (
    ("thumbnail", 400),
    ("medium", 800),
    ("large", 1600),
)

WEBP_QUALITY = 82


def cap_original_image(
    image_field: ImageFieldFile,
    max_size: int,
    quality: int = ORIGINAL_QUALITY,
) -> bool:
    """
    Resize l'image originale in-place si > max_size sur le côté le plus long.

    - Préserve le ratio
    - Préserve le format de l'image (JPEG → JPEG, PNG → PNG, WebP → WebP)
    - Corrige l'orientation EXIF (photos mobile rotated)
    - Ne fait rien si l'image est déjà <= max_size sur les 2 dimensions

    Retourne True si l'image a été modifiée, False sinon.

    À appeler AVANT generate_resized_versions, pour éviter que les variants
    soient calculés depuis une image brute 4000×3000 alors qu'on stocke
    finalement un original 1600×1067.
    """
    if not image_field or not image_field.name:
        return False

    try:
        with image_field.open("rb") as f:
            img = Image.open(f)
            img = ImageOps.exif_transpose(img)
            img.load()
            original_format = (img.format or "JPEG").upper()
    except Exception:
        logger.exception("cap_original_image: cannot open %s", image_field.name)
        return False

    # Skip si déjà sous le cap (les 2 dimensions)
    if img.width <= max_size and img.height <= max_size:
        return False

    img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

    # Sauvegarde dans le format d'origine pour ne pas changer le path
    save_kwargs: dict = {}
    if original_format in ("JPEG", "JPG"):
        # Convertir RGBA → RGB pour JPEG (qui ne supporte pas l'alpha)
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGB")
        save_kwargs = {"quality": quality, "optimize": True, "progressive": True}
        save_format = "JPEG"
    elif original_format == "PNG":
        save_kwargs = {"optimize": True}
        save_format = "PNG"
    elif original_format == "WEBP":
        save_kwargs = {"quality": quality, "method": 6}
        save_format = "WEBP"
    else:
        # Format peu courant (BMP, TIFF…) → on convertit en JPEG par défaut
        if img.mode != "RGB":
            img = img.convert("RGB")
        save_kwargs = {"quality": quality, "optimize": True}
        save_format = "JPEG"

    buf = BytesIO()
    img.save(buf, format=save_format, **save_kwargs)
    buf.seek(0)

    # Écrase le fichier original sans changer son path/nom (pas de signal cascade)
    storage = image_field.storage
    name = image_field.name
    if storage.exists(name):
        storage.delete(name)
    storage.save(name, ContentFile(buf.getvalue()))
    return True


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
