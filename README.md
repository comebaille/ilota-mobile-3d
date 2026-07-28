# Ilota — L’Archipel éveillé

Jeu 3D mobile de collecte, construction et gestion. Le renard bâtisseur récolte du bois, de la pierre, du cuivre et du cristal, fait émerger cinq îles et dirige jusqu’à dix-neuf travailleurs persistants.

[Jouer à Ilota dans le navigateur](https://comebaille.github.io/ilota-mobile-3d/)

## Contenu jouable

- cinq chapitres, quatre ponts réellement traversables et des îles invisibles qui émergent à leur ouverture ;
- arbres et minerais de tailles variées qui rétrécissent à chaque coup, disparaissent au dernier et réapparaissent ensuite ;
- filons réellement consommés par les ouvriers, avec repousse pondérée et ressources interdites selon l’île ;
- cargaisons 3D compactes au-dessus du dos du héros et des travailleurs : 8 places de base, puis +4 par rang de Harnais modulaires jusqu’à 32 ;
- cinq dépôts physiques : le central est le premier bâtiment gratuit, puis un nouveau dépôt local devient constructible à chaque Nouvelle Marée ;
- vrais trajets logistiques : sans dépôt local, un renard éloigné retraverse tous les ponts jusqu’au hangar construit le plus proche ;
- quatre métiers réassignables : bois, pierre, cuivre et cristal ;
- systèmes matérialisés : le camp ouvre la nurserie, l’atelier forme au niveau 2, la fonderie au niveau 3 et l’Autel du Savoir spécialise l’île de Cristal ;
- nurserie lumineuse et scrollable : le niveau reste écrit sur chaque renard, un toucher ouvre sa fiche, mais les formations ne sont possibles que dans le bon bâtiment ;
- neuf postes par les bâtiments, dix postes supplémentaires via projets et savoirs, et trois niveaux de rendement ;
- vraie nurserie, dépôts, atelier, fonderie et Autel du Savoir fondés sur des modèles 3D CC0, assemblés pièce par pièce lors de leur construction et séparés par une marge anti-collision vérifiée ;
- Autel de Cristal exigeant `120 bois + 110 pierre + 90 cuivre + 70 cristal`, construit directement sur la quatrième île avant l’ouverture de l’arbre ;
- douze Grands Travaux regroupés dans quatre Maisons identiques : un seul bâtiment par île ouvre trois grandes cartes lisibles et allume trois sceaux d’avancement ;
- HUD paysage compact : l’étape suivante reste visible, le détail des objectifs se déplie à la demande, disparaît définitivement après le paiement du pont, puis des flèches 3D guident jusqu’au passage ;
- tutoriel contextuel réservé aux sauvegardes neuves : dépôt, cargaison, nurserie, objectifs, formations, talents et Nouvelle Marée ;
- arbre hexagonal à 28 nœuds : futur invisible, doubles prérequis stricts, capacité de cargaison évolutive, tournées complètes, pincement tactile, trois sommets et convergence finale très coûteuse ;
- sélection d’un savoir sans achat automatique : une grande fiche explique l’effet, le prix et les prérequis avant confirmation ;
- menu de Marée avec reprise, remise à zéro confirmée et Nouvelle Marée grisée tant que l’acte actuel n’est pas terminé ;
- compteur de Savoir toujours visible, même avant la construction de l’Autel ;
- trois pouvoirs de sommet activables : Auto-régulation, Surcharge tellurique de repousse et Courant de Marée pour les cargaisons, avec messages automatiques et effets plein écran désactivables séparément ;
- pouvoir final **Conscience absolue** : réservation intelligente des filons, +4 postes, bonus économiques, héritage à 55 % et synchronisation des trois voies ;
- cinématique de rebirth : îles englouties de la dernière à la première, ponts brisés et héros ressortant de la nurserie ;
- ambiance et signaux sonores procéduraux, vibrations réglables, caches optionnelles, sauvegarde locale doublée d’une copie de secours et migration des versions antérieures ;
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
