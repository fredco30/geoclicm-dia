"""
Management command : seed 4 articles éditoriaux variés pour démo / dev.

Usage : python manage.py seed_articles [--force]
        --force : recrée les articles même s'ils existent déjà.

Génère des images de cover placeholder (gradient + titre) via Pillow.
Les versions WebP redimensionnées sont créées par le signal post_save.
"""
from __future__ import annotations

from datetime import timedelta
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.utils.text import slugify
from PIL import Image, ImageDraw, ImageFont

from apps.core.models import Commune, User
from apps.editorial.models import Article, Category, Tag


ARTICLES = [
    {
        "title": "Les saliniers d'Aigues-Mortes racontent leurs étés de braise",
        "chapeau": (
            "Trois générations de saunier·ères du domaine du Grand Salin se confient sur leur métier, "
            "entre traditions séculaires et défis du dérèglement climatique."
        ),
        "body": """Au cœur des marais salants d'Aigues-Mortes, la récolte du sel se prépare dès l'aube. Les pelles glissent dans la fleur de sel, les camelles s'élèvent comme des montagnes blanches, et les saliniers — appelés ici **sauniers** — perpétuent un savoir-faire vieux de plus de huit siècles.

## Une mémoire orale qui s'estompe

Joseph, 72 ans, a commencé à travailler aux salins à 16 ans. *« Mon père y était, mon grand-père aussi. À l'époque, on ne parlait que d'occitan sur les tables salantes. Aujourd'hui, je suis un des derniers à connaître les anciens noms des bassins. »*

Il évoque les **paratiers**, ces tables d'évaporation qui n'existent plus, et les routes du sel vers Lyon, Genève, Berne, qui ont fait la fortune de la cité fortifiée pendant tout le Moyen Âge.

## Le climat change, le sel aussi

Sa fille Marie, 38 ans, ingénieure agronome, a repris le flambeau avec une approche différente :

> Le réchauffement modifie tout : la salinité de la lagune, le régime des vents, les périodes de récolte. On adapte nos méthodes presque chaque année.

Les saisons « parfaites » — chaud, sec, ventées de tramontane — se font plus rares. Les saliniers expérimentent de nouvelles techniques, mêlant **observations traditionnelles** et **données satellites**.

## Transmettre, mais à qui ?

Le métier attire de moins en moins. Sur les 50 saisonniers qu'employait le domaine il y a vingt ans, ils ne sont plus que 15. *« Les jeunes ne supportent plus la chaleur, le sel qui ronge la peau. Et puis le smic toute la saison, c'est dur »*, soupire Joseph.

Pourtant, la fleur de sel d'Aigues-Mortes reste un produit d'exception, expédié dans les meilleures tables d'Europe. Une fierté qui peine à se transmettre.""",
        "category_slug": "memoire-vivante",
        "commune_slug": "aigues-mortes",
        "article_type": "portrait",
        "is_featured": False,
        "tags": ["sel", "tradition", "agriculture", "climat"],
        "color_from": (139, 69, 19),    # marron mémoire vivante
        "color_to": (180, 110, 60),
        "days_ago": 5,
    },
    {
        "title": "La Grande-Motte célèbre 50 ans d'architecture pyramidale",
        "chapeau": (
            "Inscrite au patrimoine du XXᵉ siècle depuis 2010, la cité balnéaire imaginée par Jean Balladur "
            "fête un demi-siècle d'audace urbaine. Reportage entre dunes, immeubles-paquebots et mémoire vive."
        ),
        "body": """En 1965, le sable nu. En 2026, **120 000 estivants** par jour au plus fort de l'été. La Grande-Motte est née d'une volonté politique — la Mission Racine — et de la vision d'un architecte unique, **Jean Balladur** (1924-2002), qui a dessiné chaque immeuble, chaque place, chaque palmier.

## Un anti-Las Vegas méditerranéen

Balladur voulait *« une ville pour les vacances populaires, pas pour les milliardaires »*. Les pyramides, les courbes, les couleurs ocre et blanc, l'omniprésence du végétal : tout est pensé pour briser la monotonie des stations balnéaires linéaires.

> Une ville n'est pas une suite d'immeubles. C'est une partition urbaine.
> — Jean Balladur, 1972

## Le label patrimoine, un tournant

L'inscription au patrimoine du XXᵉ siècle en 2010 a tout changé. Avant : on déboulonnait les balcons, on repeignait en blanc les fresques, on remplaçait les fenêtres d'origine par du PVC. Après : **chaque rénovation est encadrée**.

L'Architecte des Bâtiments de France, Cécile Mauvis, explique : *« On a sauvé la Grande-Motte d'une banalisation rampante. Aujourd'hui, les copropriétaires sont fiers d'habiter dans une œuvre. »*

## Et la suite ?

Avec la montée des eaux, la cité doit repenser son trait de côte. Balladur l'avait pourtant prévu : il avait fait planter **12 000 arbres** pour stabiliser les dunes. Cinquante ans plus tard, ils tiennent encore. Le génie d'un architecte est de penser à long terme.""",
        "category_slug": "patrimoine",
        "commune_slug": "la-grande-motte",
        "article_type": "dossier",
        "is_featured": True,  # à la une
        "tags": ["architecture", "Balladur", "patrimoine", "anniversaire"],
        "color_from": (184, 134, 11),
        "color_to": (220, 180, 70),
        "days_ago": 1,
    },
    {
        "title": "Une nuit avec les chalutiers du Grau-du-Roi",
        "chapeau": (
            "Embarquement à 3h du matin sur le Saint-Pierre. Reportage en mer avec ceux qui font vivre "
            "le dernier port de pêche méditerranéen de la région."
        ),
        "body": """Il fait encore nuit noire quand le quai s'anime. Les **22 chalutiers** du port se préparent, dans le froid mordant de la tramontane de printemps. Le Saint-Pierre, 14 mètres de coque bleue et blanche, sera de la sortie. À son bord : Patrick, le patron, son fils Lucas, 26 ans, et le mousse Yacine.

## Trois heures du matin, larguez les amarres

Le moteur diesel rugit. Patrick scrute la météo une dernière fois sur sa tablette. *« Force 4 ouest, ça va secouer mais on peut pêcher. Plus loin que d'habitude par contre. »* Direction : à 18 milles au sud, là où les fonds chalutables descendent à 50 mètres.

Lucas prépare le **chalut de fond**, ce filet en forme de manche qu'on traîne pendant deux heures. Il a appris le métier avec son père, sans école : *« On apprend en faisant des bêtises, en cassant un filet, en perdant une nuit de sommeil. »*

## Cinq heures du matin, première trait

Le filet remonte. Le winch peine. *« Ça a accroché »*, marmonne Patrick. Quand le sac débarque sur le pont, il est plein : merlus, rougets, baudroies, soles. Une bonne pêche. *« On va tenir le bouclard cette semaine. »*

Pour la première fois depuis longtemps, le port du Grau-du-Roi voit revenir ses chalutiers à pleine charge. La **réserve de Camargue** étendue en 2023 commence à porter ses fruits.

## Onze heures, retour au port

À la criée, l'ambiance est électrique. Les mareyeurs enchérissent au smartphone, les caisses s'envolent vers Marseille, Lyon, Paris. Patrick a fait sa journée. *« 6 200 euros au débarquement. Net : 1 800 pour moi, après le gasoil et les charges. »*

Il sourit quand même. *« On vit. C'est déjà ça. Il y a dix ans on était sur le carreau. »*""",
        "category_slug": "peche-et-traditions",
        "commune_slug": "le-grau-du-roi",
        "article_type": "reportage",
        "is_featured": False,
        "tags": ["pêche", "chalutier", "métier", "économie locale"],
        "color_from": (47, 79, 79),
        "color_to": (90, 130, 130),
        "days_ago": 3,
    },
    {
        "title": "Marc, gardian de la dernière manade traditionnelle de Petite Camargue",
        "chapeau": (
            "À Vauvert, un homme refuse de céder à la mécanisation. Avec ses chevaux Camargue et 80 taureaux, "
            "il perpétue un métier menacé. Portrait."
        ),
        "body": """Le **mas de Cougourlude**, sur la route de Generac, n'a presque pas changé depuis 1937. Ni la mas, ni les enclos, ni la cabane de gardian. Marc Aubanel, 51 ans, troisième génération, ne veut rien y changer. *« Le jour où je mettrai un quad, ce sera fini. »*

## La selle camarguaise, pas le quad

À 5h30, Marc enfourche **Lou Caïrou**, son cheval gris pommelé de 11 ans, et part rassembler le bétail. Sa manade compte **80 taureaux** Raço di Biou, plus une dizaine de chevaux Camargue. *« Avec un quad, tu vas plus vite, oui. Mais le taureau ne te respecte pas. »*

Il s'arrête, désigne un taureau noir au loin :

> Celui-là, c'est Pourtoun. Il connaît ma voix. Il connaît mon cheval. On a une relation depuis 8 ans. Tu remplaces ça par une moto ?

## L'économie d'un métier en sursis

Sa manade vit des **courses camarguaises** — ces jeux taurins sans mise à mort où des « raseteurs » tentent d'attraper une cocarde sur le front du taureau. Marc loue ses bêtes aux arènes de la région : Vauvert, Lunel, Saint-Gilles, Aimargues.

*« Une saison normale, je rentre 30 000 euros nets. Mais si la canicule frappe, ou que l'arène annule à cause des nouvelles règlementations, je n'ai aucun filet. »*

## Transmission incertaine

Son fils Léo, 24 ans, a choisi la viticulture. *« Je le comprends. C'est plus stable. »* Marc ne reproche rien, mais avoue son inquiétude : sur les **120 manades** que comptait la Petite Camargue dans les années 1980, il en reste **moins de 60**.

Une association locale s'est créée pour faire labelliser **« le pastoralisme camarguais »** au patrimoine immatériel UNESCO. Marc y croit. *« Pas pour mon orgueil. Pour que ça continue. »*""",
        "category_slug": "portraits",
        "commune_slug": "vauvert",
        "article_type": "portrait",
        "is_featured": False,
        "tags": ["gardian", "manade", "tradition", "taureau Camargue"],
        "color_from": (70, 130, 180),
        "color_to": (110, 170, 210),
        "days_ago": 2,
    },
]


def make_cover_image(title: str, color_from: tuple, color_to: tuple) -> bytes:
    """Génère une cover JPEG 1600x900 : gradient diagonal + titre overlay."""
    width, height = 1600, 900
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)

    # Gradient diagonal
    for y in range(height):
        ratio = y / height
        r = int(color_from[0] * (1 - ratio) + color_to[0] * ratio)
        g = int(color_from[1] * (1 - ratio) + color_to[1] * ratio)
        b = int(color_from[2] * (1 - ratio) + color_to[2] * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Titre wrapped
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 80)
    except Exception:
        try:
            font = ImageFont.truetype("arial.ttf", 80)
        except Exception:
            font = ImageFont.load_default()

    # Word wrap manuel
    margin = 100
    max_w = width - 2 * margin
    words = title.split()
    lines, line = [], ""
    for w in words:
        test = (line + " " + w).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] > max_w:
            if line:
                lines.append(line)
            line = w
        else:
            line = test
    if line:
        lines.append(line)

    # Draw block with vertical centering
    line_h = 100
    total_h = line_h * len(lines)
    y_start = (height - total_h) // 2
    for i, ln in enumerate(lines):
        bbox = draw.textbbox((0, 0), ln, font=font)
        w = bbox[2] - bbox[0]
        x = (width - w) // 2
        # Shadow
        draw.text((x + 3, y_start + i * line_h + 3), ln, font=font, fill=(0, 0, 0, 128))
        draw.text((x, y_start + i * line_h), ln, font=font, fill=(255, 255, 255))

    buf = BytesIO()
    img.save(buf, format="JPEG", quality=88, optimize=True)
    return buf.getvalue()


class Command(BaseCommand):
    help = "Crée 4 articles seed avec covers générées (gradient + titre)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Recrée les articles même s'ils existent déjà (overwrite).",
        )

    def handle(self, *args, force: bool = False, **kwargs):
        author = (
            User.objects.filter(is_superuser=True).first()
            or User.objects.first()
        )
        if not author:
            raise CommandError(
                "Aucun utilisateur trouvé : créez un superuser d'abord (createsuperuser)."
            )

        self.stdout.write(f"Auteur seed : {author.username}")
        created, skipped, updated = 0, 0, 0

        for art in ARTICLES:
            slug = slugify(art["title"])[:280]
            existing = Article.objects.filter(slug=slug).first()

            if existing and not force:
                self.stdout.write(self.style.WARNING(f"  ⊘ skip (existe) : {art['title']}"))
                skipped += 1
                continue

            published_at = timezone.now() - timedelta(days=art["days_ago"])
            category = Category.objects.get(slug=art["category_slug"])
            commune = Commune.objects.get(slug=art["commune_slug"])

            data = dict(
                title=art["title"],
                slug=slug,
                chapeau=art["chapeau"],
                body=art["body"],
                category=category,
                commune=commune,
                article_type=art["article_type"],
                is_featured=art["is_featured"],
                author=author,
                status=Article.Status.PUBLISHED,
                published_at=published_at,
            )

            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                article = existing
                updated += 1
            else:
                article = Article(**data)
                created += 1

            # Génère et attache la cover
            cover_bytes = make_cover_image(
                art["title"], art["color_from"], art["color_to"]
            )
            article.cover_image.save(
                f"{slug}.jpg",
                ContentFile(cover_bytes),
                save=False,
            )
            article.save()  # déclenche le signal post_save → versions WebP

            # Tags
            tag_objs = []
            for tag_name in art["tags"]:
                tag, _ = Tag.objects.get_or_create(
                    name=tag_name, defaults={"slug": slugify(tag_name)}
                )
                tag_objs.append(tag)
            article.tags.set(tag_objs)

            verb = "Mis à jour" if existing else "Créé"
            self.stdout.write(self.style.SUCCESS(f"  ✓ {verb} : {art['title']}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. créés={created} mis à jour={updated} ignorés={skipped}"
            )
        )
