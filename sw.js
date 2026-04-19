// ============================================================
// SERVICE WORKER — Dashboard Moto-École
// ============================================================
// Un service worker est un petit programme qui tourne en arrière-plan
// dans le navigateur, indépendamment de ta page. Il sert à :
//   1. Faire fonctionner l'app même sans connexion internet
//   2. Permettre son installation sur l'écran d'accueil d'un téléphone
//   3. Accélérer l'app en mettant en cache les fichiers
// ============================================================

// Version du cache : change ce numéro quand tu modifies ton app
// pour forcer le rafraîchissement chez tes utilisateurs.
const CACHE_VERSION = 'moto-ecole-v13';

// Liste des fichiers à mettre en cache dès l'installation de l'app.
// Ce sont les fichiers essentiels pour que l'app fonctionne hors-ligne.
const FICHIERS_A_CACHER = [
  './',
  './index.html',
  './manifest.json',
  // La bibliothèque Chart.js est chargée depuis internet (CDN).
  // On la met en cache pour qu'elle fonctionne hors-ligne aussi.
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];

// ============================================================
// ÉVÉNEMENT "install" : déclenché quand le navigateur installe
// le service worker pour la première fois.
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installation en cours...');

  // event.waitUntil() dit au navigateur :
  // "attends que cette opération soit finie avant de considérer
  // l'installation comme terminée"
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.log('[SW] Mise en cache des fichiers essentiels');
      return cache.addAll(FICHIERS_A_CACHER);
    })
  );

  // skipWaiting() force le nouveau service worker à prendre le relais
  // immédiatement, sans attendre que l'utilisateur ferme tous les onglets.
  self.skipWaiting();
});

// ============================================================
// ÉVÉNEMENT "activate" : déclenché quand le service worker devient actif.
// On en profite pour supprimer les anciens caches (de versions précédentes).
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation en cours...');

  event.waitUntil(
    caches.keys().then((nomsDesCaches) => {
      // On parcourt tous les caches existants
      return Promise.all(
        nomsDesCaches.map((nomCache) => {
          // Si le cache n'est pas la version actuelle, on le supprime
          if (nomCache !== CACHE_VERSION) {
            console.log('[SW] Suppression de l\'ancien cache :', nomCache);
            return caches.delete(nomCache);
          }
        })
      );
    })
  );

  // clients.claim() prend le contrôle immédiat de toutes les pages ouvertes
  return self.clients.claim();
});

// ============================================================
// ÉVÉNEMENT "fetch" : déclenché à chaque fois que l'app demande
// un fichier (HTML, JS, image, etc.).
// ============================================================
// STRATÉGIE : "Cache d'abord, puis réseau"
//   1. On regarde si le fichier est dans le cache
//   2. Si oui, on le renvoie immédiatement (ultra rapide, marche hors-ligne)
//   3. Si non, on va le chercher sur internet et on le met en cache pour la prochaine fois
// ============================================================
self.addEventListener('fetch', (event) => {
  // On ne gère que les requêtes GET (récupération de fichiers).
  // Les POST/PUT/DELETE partent directement sur le réseau.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((reponseDuCache) => {
      // Si on trouve le fichier dans le cache, on le renvoie
      if (reponseDuCache) {
        return reponseDuCache;
      }

      // Sinon, on va le chercher sur internet
      return fetch(event.request).then((reponseDuReseau) => {
        // On vérifie que la réponse est valide avant de la mettre en cache
        if (!reponseDuReseau || reponseDuReseau.status !== 200) {
          return reponseDuReseau;
        }

        // On clone la réponse parce qu'une réponse ne peut être lue qu'une fois :
        // une fois pour le cache, une fois pour le navigateur.
        const copiePourCache = reponseDuReseau.clone();

        caches.open(CACHE_VERSION).then((cache) => {
          cache.put(event.request, copiePourCache);
        });

        return reponseDuReseau;
      }).catch(() => {
        // Si le réseau échoue ET qu'on n'a pas le fichier en cache,
        // on renvoie une page basique d'erreur.
        // (Pour l'instant, on ne gère pas ce cas — ton index.html
        // sera toujours dans le cache après la première visite.)
        console.log('[SW] Requête échouée et non trouvée dans le cache');
      });
    })
  );
});
