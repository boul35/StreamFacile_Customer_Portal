# StreamFacile — Portail client

Service de diffusion IPTV clé en main pour les clients non techniques du Québec.
Backend Node.js/Express + PostgreSQL, vues EJS, style Tailwind (thème sombre).

## Démarrage rapide

```bash
cp .env.example .env          # ajustez DATABASE_URL et SESSION_SECRET
npm install
npm run migrate               # crée le schéma (idempotent via schema_migrations)
npm run seed                  # client de démonstration
npm run build:css             # compile Tailwind -> public/css/main.css
npm start
```

Client démo : `demo@streamfacile.qc.ca` / `streamfacile123`

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Démarre le serveur |
| `npm run dev` | Démarre avec nodemon |
| `npm run build:css` | Compile le CSS Tailwind |
| `npm run watch:css` | Recompile le CSS en continu |
| `npm run migrate` | Applique les migrations en attente |
| `npm run seed` | Crée un client de démonstration |

## Variables d'environnement

Voir `.env.example`. Les identifiants **Dispatcharr** (`DISPATCHARR_API_KEY`,
`DISPATCHARR_ACCOUNT_ID`) restent toujours côté serveur et ne sont jamais
transmis au navigateur. En développement, `DISPATCHARR_SIMULATION=true` évite
tout appel réseau réel.

## Architecture

```
db/migrations/          Migrations SQL (001_init, 002_hardening) + tracker
src/config/             Connexion DB, configuration d'environnement
src/middleware/         auth, device (suivi), csrf, asyncHandler
src/services/           provisioner (hook Dispatcharr abstrait), provisioning, auth
src/controllers/        logique par domaine
src/routes/             routage Express
src/views/              vues EJS (thème sombre)
public/                 CSS compilé + JS client
```

## Couverture des sections du cahier des charges

- **Sections 4-7** : catalogue de chaînes, recherche, filtres de catégorie,
  moteur de sélection respectant `max_channels` (refus HTTP 409 à la limite).
- **Sections 10, 26** : `src/services/provisioner.js` expose une interface
  `Provisioner` abstraite ; `DispatcharrProvisioner` appelle l'API en serveur,
  `SimulationProvisioner` pour le développement. Les travaux sont asynchrones
  (`provisioning_jobs`).
- **Sections 14, 19, 20** : profil client (nom/courriel/téléphone), mot de passe
  haché (bcrypt), limites du forfait, date de renouvellement, appareils.
- **Sections 12, 17, 18** : billets de support avec contexte technique capturé
  automatiquement (profil, appareil, chaîne, UA/IP) dans `context_json`.

## Fiabilité & sécurité (en place)

- Sessions persistées en PostgreSQL (`connect-pg-simple`) — plus de perte au redémarrage.
- Cookie de session `httpOnly`, `sameSite=lax`, `secure` en production.
- `cookie-parser` installé et utilisé par le suivi d'appareils.
- Migrations idempotentes via la table `schema_migrations`.
- Endpoint `GET /health` (vérifie la connectivité DB) pour Docker/load balancer.
- Protection CSRF (double-submit cookie) sur tous les formulaires et le toggle AJAX.
- Limite de débit sur la connexion et l'inscription (`express-rate-limit`).
- Gestion d'erreurs async (`asyncHandler`) — plus de rejets non gérés.
- Validation des variables d'environnement au démarrage (échec rapide).
- Suivi d'appareils déterministe via un jeton unique (`device_token`).
- Politique de mot de passe renforcée (8+ caractères, lettre et chiffre).

## Docker

```bash
docker compose up --build
```

Démarre PostgreSQL + l'application. L'app attend que la base soit saine
(`healthcheck`).

## Tests & CI

```bash
npm test
```

Les tests (`tests/`) utilisent Jest + Supertest et s'exécutent contre une base
PostgreSQL de test (`TEST_DATABASE_URL`, sinon une valeur locale par défaut).
La protection CSRF est automatiquement désactivée en `NODE_ENV=test`.
Un pipeline GitHub Actions (`.github/workflows/ci.yml`) lance les migrations et
les tests sur un service Postgres.

## Remarque sur `scripts/`

`scripts/setup-continue-openrouter-free.sh` est un utilitaire **indépendant**
(configuration de l'éditeur Continue.dev + OpenRouter) et n'est pas lié au
portail StreamFacile. Il peut être ignoré pour le développement du portail.
