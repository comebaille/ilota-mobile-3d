# Ilota — L’Archipel éveillé

Jeu 3D mobile de collecte, construction et gestion. Le renard bâtisseur récolte du bois, de la pierre, du cuivre et du cristal, fait émerger cinq îles et dirige jusqu’à dix-neuf travailleurs persistants.

[Jouer à Ilota dans le navigateur](https://comebaille.github.io/ilota-mobile-3d/)

## Contenu jouable

- cinq chapitres, quatre ponts réellement traversables et des îles invisibles qui émergent à leur ouverture ;
- arbres et minerais de tailles variées qui rétrécissent à chaque coup, disparaissent au dernier et réapparaissent ensuite ;
- filons réellement consommés par les livraisons des ouvriers, avec repousse pondérée et ressources interdites selon l’île ;
- quatre métiers réassignables : bois, pierre, cuivre et cristal ;
- nurserie lumineuse et scrollable : le niveau reste écrit sur chaque renard, un toucher ouvre sa fiche fixe, son métier et son bouton `LEVEL UP` ;
- neuf postes par les bâtiments, dix postes supplémentaires via projets et savoirs, et trois niveaux de rendement ;
- camp, atelier, fonderie et observatoire fondés sur de vrais modèles 3D CC0 ;
- douze Grands Travaux répartis sur quatre îles, qui réemploient les mêmes ressources et conditionnent les ponts puis le Cœur ;
- arbre hexagonal à 26 nœuds : futur invisible, doubles prérequis stricts, zoom 10–130 %, trois sommets et convergence finale très coûteuse ;
- pouvoir final **Conscience absolue** : +4 postes, +50 % par livraison, −20 % sur les coûts, vitesse accrue, héritage à 55 % et auto-régulation totale ;
- caches optionnelles, sauvegarde locale et migration de la première version ;
- commandes tactiles, interface paysage et installation PWA hors ligne.

Le contrat complet de campagne se trouve dans [docs/campaign-progression.md](./docs/campaign-progression.md).
La matrice de retour visuel et tactile se trouve dans [docs/feedback-matrix.md](./docs/feedback-matrix.md).

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

Les modèles 3D Quaternius et KayKit sont CC0. Voir [CREDITS.md](./CREDITS.md).
