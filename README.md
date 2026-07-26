# Ilota — L’Archipel éveillé

Jeu 3D mobile de collecte, construction et gestion. Le renard bâtisseur récolte du bois, de la pierre, du cuivre et du cristal, fait émerger cinq îles et dirige jusqu’à dix-neuf travailleurs persistants.

[Jouer à Ilota dans le navigateur](https://comebaille.github.io/ilota-mobile-3d/)

## Contenu jouable

- cinq chapitres, quatre ponts réellement traversables et des îles invisibles qui émergent à leur ouverture ;
- arbres et minerais de tailles variées qui rétrécissent à chaque coup, disparaissent au dernier et réapparaissent ensuite ;
- filons réellement consommés par les ouvriers, avec repousse pondérée et ressources interdites selon l’île ;
- cargaisons 3D empilées verticalement au-dessus du dos du héros et des travailleurs, plafonnées à seize unités, puis déchargées une à une depuis le sommet avant de créditer le stock ;
- cinq dépôts physiques : le central est le premier bâtiment gratuit, puis un nouveau dépôt local devient constructible à chaque Nouvelle Marée ;
- vrais trajets logistiques : sans dépôt local, un renard éloigné retraverse tous les ponts jusqu’au hangar construit le plus proche ;
- quatre métiers réassignables : bois, pierre, cuivre et cristal ;
- systèmes matérialisés : le camp ouvre la nurserie, l’atelier forme au niveau 2, la fonderie au niveau 3 et l’Autel du Savoir ouvre l’arbre des savoirs ;
- nurserie lumineuse et scrollable : le niveau reste écrit sur chaque renard, un toucher ouvre sa fiche, mais les formations ne sont possibles que dans le bon bâtiment ;
- neuf postes par les bâtiments, dix postes supplémentaires via projets et savoirs, et trois niveaux de rendement ;
- vraie nurserie, dépôts, atelier, fonderie et Autel du Savoir fondés sur des modèles 3D CC0, assemblés pièce par pièce lors de leur construction ;
- douze Grands Travaux regroupés dans quatre Maisons des Travaux identiques : un seul bâtiment par île présente ses trois projets et allume trois sceaux d’avancement ;
- panneau d’objectif à droite : chaque condition est explicitement cochée, le panneau disparaît définitivement dès que son pont est payé, puis des flèches 3D guident jusqu’au passage ;
- tutoriel contextuel réservé aux sauvegardes neuves : dépôt, cargaison, nurserie, objectifs, formations, talents et Nouvelle Marée ;
- arbre hexagonal à 26 nœuds : futur invisible, doubles prérequis stricts, pincement tactile, trois sommets et convergence finale très coûteuse ;
- sélection d’un savoir sans achat automatique : une grande fiche explique l’effet, le prix et les prérequis avant confirmation ;
- menu de Marée avec reprise, remise à zéro confirmée et Nouvelle Marée grisée tant que l’acte actuel n’est pas terminé ;
- compteur de Savoir toujours visible, même avant la construction de l’Autel ;
- trois pouvoirs de sommet activables : Auto-régulation, Surcharge tellurique de repousse et Courant de Marée pour les cargaisons, avec messages automatiques et effets plein écran désactivables séparément ;
- pouvoir final **Conscience absolue** : réservation intelligente des filons, +4 postes, bonus économiques, héritage à 55 % et synchronisation des trois voies ;
- cinématique de rebirth : îles englouties de la dernière à la première, ponts brisés et héros ressortant de la nurserie ;
- caches optionnelles, sauvegarde locale et migration des versions antérieures ;
- commandes tactiles, interface paysage et installation PWA hors ligne.

Le contrat complet de campagne se trouve dans [docs/campaign-progression.md](./docs/campaign-progression.md).
La matrice de retour visuel et tactile se trouve dans [docs/feedback-matrix.md](./docs/feedback-matrix.md).
Le cahier des charges clarifié de cette refonte se trouve dans [docs/refonte-logistique-v0.8.md](./docs/refonte-logistique-v0.8.md).

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
