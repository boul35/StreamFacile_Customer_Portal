# Contribution à StreamFacile

Merci de votre intérêt pour le portail client StreamFacile!

## Prérequis

- Node.js 20+ (voir `.nvmrc`)
- PostgreSQL 16+
- `npm`

## Mise en place

```bash
cp .env.example .env
npm install
npm run migrate
npm run seed
npm run build:css
npm start
```

## Avant de soumettre une PR

- `npm run build:css` (les changements Tailwind doivent être recompilés)
- `npm test` (les tests utilisent un PostgreSQL de test via `TEST_DATABASE_URL`)
- Vérifiez qu'aucune clé Dispatcharr n'est exposée côté client
- Tout nouveau texte affiché à l'utilisateur doit être en français québécois

## Tests

Les tests (`tests/`) utilisent Jest + Supertest. Ils attendent une base
`streamfacile_test` accessible via `TEST_DATABASE_URL` (ou une valeur par défaut
locale). La protection CSRF est automatiquement désactivée en `NODE_ENV=test`.

## Structure

Voir le `README.md` pour la cartographie des sections du cahier des charges.

## Notes

- `scripts/setup-continue-openrouter-free.sh` est un utilitaire indépendant
  (configuration de l'éditeur Continue.dev + OpenRouter) et n'est **pas** lié
  au portail StreamFacile. Il peut être ignoré pour le développement du portail.
