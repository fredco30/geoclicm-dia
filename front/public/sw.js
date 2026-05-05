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
 * Mais sans ce fichier, les SW déjà installés chez les utilisateurs
 * resteraient actifs indéfiniment (next-pwa désactivé ne génère plus rien
 * de neuf, donc le navigateur n'a pas de nouvelle version à comparer et
 * garde l'ancien). Ce killer prend le relais : le navigateur le détecte
 * comme une nouvelle version (bytes différents de l'ancien sw.js workbox),
 * l'installe, et il se désinscrit lui-même au moment de l'activation.
 *
 * Effet net : au prochain reload de chaque utilisateur, l'ancien SW est
 * remplacé, ses caches sont vidés, et le SW courant se supprime. Plus
 * jamais de SW sur le site.
 *
 * À supprimer une fois que tous les utilisateurs auront rechargé au moins
 * une fois (≈ 1 mois après déploiement). Garder en place ne nuit pas, mais
 * sert à rien dès que la base est nettoyée.
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
        // Pas critique : si le navigateur refuse pour une raison X, on
        // continue quand même vers l'unregister.
      }

      // 2. Désinscrit ce SW. Comme next-pwa est désactivé côté serveur,
      //    aucun nouveau SW ne sera jamais enregistré ensuite.
      try {
        await self.registration.unregister();
      } catch (e) {
        /* idem, non critique */
      }

      // 3. Force-reload chaque fenêtre cliente pour que la prochaine
      //    requête parte sans intermédiaire SW (l'ancien SW reste actif
      //    dans les onglets jusqu'au refresh tant qu'on ne navigate pas).
      try {
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          client.navigate(client.url);
        }
      } catch (e) {
        /* idem */
      }
    })(),
  );
});

// Pas de fetch handler : si jamais une requête nous arrive avant
// l'activation, le navigateur fait passe-plat vers le réseau (comportement
// par défaut quand pas de listener fetch).
