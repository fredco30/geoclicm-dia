"use client";

import { useEffect } from "react";

/**
 * Désinscrit proactivement tout service worker persistant chez le client.
 *
 * Filet de sécurité côté client en complément du killer /sw.js : pour les
 * utilisateurs qui réussissent à charger la page (donc le SW intercepte
 * sans planter), ce hook les nettoie automatiquement au mount du layout
 * racine.
 *
 * Pourquoi ne pas s'en remettre uniquement au killer SW ?
 * - Chrome ne re-vérifie le sw.js que toutes les 24 h ou sur certains
 *   triggers (refresh manuel, fermeture totale du navigateur).
 * - Le killer ne peut s'activer que SI le navigateur fait cette
 *   vérification. Pendant ce temps, l'ancien SW reste en charge.
 * - Ici on force le unregister depuis le contexte client à chaque page
 *   load — instantané, ne dépend pas du cycle Chrome.
 *
 * Composant à supprimer (avec /sw.js) dans ~1 mois quand toutes les
 * sessions auront tourné au moins une fois.
 */
export function SwCleanup() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Désinscrit tous les SW enregistrés sur cette origine.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        for (const reg of regs) {
          reg.unregister().catch(() => {
            /* non critique */
          });
        }
      })
      .catch(() => {
        /* certains navigateurs refusent l'API : on ignore */
      });

    // Purge les caches workbox/precache/runtime laissés en mémoire.
    if (typeof window !== "undefined" && "caches" in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {
          /* idem */
        });
    }
  }, []);

  return null;
}
