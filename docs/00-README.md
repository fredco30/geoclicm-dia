# Le Camarguais — Documentation projet

> Média local indépendant du littoral camarguais, en remplacement et en complément de la page Facebook historique. PWA + back-office Django + diffusion automatique multi-canal + régie publicitaire pour artisans et commerçants locaux.

Cette documentation regroupe toute la réflexion menée en amont du développement. Elle sert de référence pour le développement avec Claude Code et de mémoire de projet.

## Ordre de lecture recommandé

1. **[01-vision-strategie.md](./01-vision-strategie.md)** — Le pourquoi, les objectifs, le positionnement
2. **[02-modele-economique.md](./02-modele-economique.md)** — Sources de revenus, formules annonceurs, juridique
3. **[03-architecture-technique.md](./03-architecture-technique.md)** — Stack, schémas, choix techniques
4. **[04-modeles-donnees.md](./04-modeles-donnees.md)** — Modèles Django détaillés
5. **[05-roadmap-sprints.md](./05-roadmap-sprints.md)** — Découpage par sprint, planning
6. **[06-sprint-1-fondations.md](./06-sprint-1-fondations.md)** — Détail du sprint 1
7. **[07-sprint-2-diffusion.md](./07-sprint-2-diffusion.md)** — Détail du sprint 2
8. **[08-meta-app-setup.md](./08-meta-app-setup.md)** — Procédure complète Meta App Review
9. **[09-seo-strategie.md](./09-seo-strategie.md)** — Stratégie SEO local complète
10. **[10-espace-annonceurs.md](./10-espace-annonceurs.md)** — Vision et architecture du self-service
11. **[11-equipe-organisation.md](./11-equipe-organisation.md)** — Rôles, répartition, points d'attention
12. **[12-checklist-demarrage.md](./12-checklist-demarrage.md)** — TODO concret pour démarrer
13. **[21-registre-routes-promesses.md](./21-registre-routes-promesses.md)** — état vérifié des routes, promesses et compatibilités
14. **[22-architecture-agenda-marches-decouvrir.md](./22-architecture-agenda-marches-decouvrir.md)** — conception des trois modules confirmés

## Reprise actuelle

- **[23-carte-des-pages.md](./23-carte-des-pages.md)** — inventaire des routes web et API
- **[24-continuite-projet.md](./24-continuite-projet.md)** — état courant, exploitation et feuille de route

## Principes directeurs du projet

- **Indépendance** : ne plus dépendre uniquement de Facebook, capturer la valeur en propre
- **Mutualisation** : réutiliser au maximum les briques de GéoClic Suite
- **Vitesse à la valeur** : PWA d'abord, app native plus tard si pertinent
- **Self-service** : automatiser au maximum la régie pub pour passer le plafond de gestion manuelle
- **Qualité éditoriale** : la connaissance locale est notre vrai différenciateur SEO et commercial
- **Pragmatisme** : pas de sur-ingénierie, on livre par incréments utiles

## Stack en une ligne

Django 5 + DRF + PostgreSQL/PostGIS + Celery + Redis (back) — Next.js 15 + Tailwind + shadcn/ui + MapLibre (front) — Stripe (paiement) — Brevo (email) — Plausible (analytics) — VPS OVH + Nginx + Cloudflare CDN.

## Équipe

- **Fred** : développement, infrastructure, technique
- **Partenaire de projet** : contenu éditorial, démarchage commercial des annonceurs

## Statut documentation

Document de référence rédigé en mai 2026 avant démarrage dev. À mettre à jour au fur et à mesure des décisions et changements pendant les sprints.

Les documents `01` à `12` décrivent principalement la vision et le plan
initial. Ils restent utiles comme historique, mais ne suffisent pas pour
conclure qu'une fonctionnalité existe.

Pour reprendre le développement, lire d'abord `24-continuite-projet.md`, puis
consulter `21`, `22` et `23`. Le document `24` distingue le code déployé, la
configuration de production et les actions métier encore à faire.
