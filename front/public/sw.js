/* eslint-disable */
/**
 * Killer service worker — installé volontairement pour DÉSINSCRIRE les SW
 * existants chez les utilisateurs et purger leurs caches.
 *
 * Contexte (2026-05-06) : @ducanh2912/next-pwa était activé avec sa config
 * par défaut, qui mettait toutes les pages same-origin en cache NetworkFirst.
 * Conséquence : un 307 d'authentification cached → ERR_FAILED en boucle sur
 * /admin/* et /advertiser/*. La PWA ayant zéro valeur pour un back-office,
 * on l'a complètement désactivée dans next.config.ts (`disable: true`).
 *
 * Ce killer prend le relais : le navigateur le détecte comme une nouvelle
 * version (bytes différents de l'ancien sw.js workbox), l'installe, et il
 * se désinscrit lui-même au moment de l'activation.
 *
 * VERSION SIMPLIFIÉE (2026-05-06 v2) — la 1re itération faisait
 * `client.navigate(client.url)` pour forcer le reload des onglets, mais
 * Chrome dégradait parfois le scheme HTTPS → HTTP et créait des états
 * incohérents (badge "Non sécurisé" en barre d'adresse). Ici on se
 * contente de 2 étapes simples : purge des caches + unregister. Le
 * navigateur reload naturellement quand l'utilisateur le décide.
 *
 * À supprimer dans ~1 mois quand tous les utilisateurs auront rechargé
 * au moins une fois. Garder en place ne nuit pas mais devient inutile.
 */

self.addEventListener("install", () => {
  // Active immédiatement, ne pas attendre la fermeture des onglets.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 1. Purge tous les caches workbox/precache/runtime laissés par
      //    l'ancienne config.
      try {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      } catch (e) {
        // Pas critique : on continue vers l'unregister.
      }

      // 2. Désinscrit ce SW. Comme next-pwa est désactivé côté serveur,
      //    aucun nouveau SW ne sera jamais enregistré ensuite.
      try {
        await self.registration.unregister();
      } catch (e) {
        /* idem, non critique */
      }
    })(),
  );
});

// Fetch handler explicite qui force le passe-plat réseau, sans interception.
// Sans ça, Chrome peut continuer à router certaines requêtes via ce SW
// avant qu'il soit unregistered (entre install et activate), et si on n'a
// pas de fetch handler du tout, certains navigateurs servent un état
// incohérent pour les requêtes en cours. Avec un handler explicite qui
// fait juste fetch(event.request), on garantit le comportement réseau pur.
self.addEventListener("fetch", (event) => {
  // Ne pas intercepter — laisser le navigateur faire la requête réseau
  // standard (équivalent à pas de SW). On ne fait `respondWith` que pour
  // être explicite et empêcher Chrome de bloquer la requête.
  return;
});
