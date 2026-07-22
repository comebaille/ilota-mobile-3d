# Ilota — L’Archipel éveillé

Jeu 3D mobile de collecte, construction et gestion. Le renard bâtisseur récolte du bois, de la pierre, du cuivre et du cristal, relie cinq îles et dirige jusqu’à neuf travailleurs persistants.

## Contenu jouable

- cinq chapitres et quatre ponts réellement traversables ;
- arbres et minerais de tailles variées qui rétrécissent à chaque coup, disparaissent au dernier et réapparaissent ensuite ;
- quatre métiers réassignables : bois, pierre, cuivre et cristal ;
- neuf travailleurs maximum, avec trois niveaux de rendement ;
- camp, atelier, fonderie, observatoire et Cœur final ;
- caches optionnelles, sauvegarde locale et migration de la première version ;
- commandes tactiles, interface paysage et installation PWA hors ligne.

Le contrat complet de campagne se trouve dans [docs/campaign-progression.md](./docs/campaign-progression.md).

## Jouer localement

```bash
npm install
npm run dev
```

Passe le téléphone en paysage. Sur ordinateur : WASD ou flèches pour se déplacer, `E` ou espace pour agir.

## Vérifier

```bash
npm run test:unit
npm run build
npm run test:e2e
```

## Installation mobile

- iPhone/iPad : Safari → Partager → Sur l’écran d’accueil.
- Android : Chrome → menu → Installer l’application ou Ajouter à l’écran d’accueil.

## Crédits

Les modèles 3D Quaternius sont CC0. Voir [CREDITS.md](./CREDITS.md).
