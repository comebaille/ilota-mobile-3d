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
- vraie nurserie, dépôts, atelier, fonderie et Autel du Savoir fondés sur des modèles 3D CC0, assemblés pièce par pièce lors de leur construction et espacés visuellement, sans volumes bloquants ;
- Autel de Cristal rééquilibré à `78 bois + 68 pierre + 48 cuivre + 24 cristal`, construit directement sur la quatrième île avant l’ouverture de l’arbre ;
- quinze Grands Travaux regroupés dans cinq Maisons, dont une dès l’île de départ, à construire après le bâtiment principal de chaque île ; chacune ouvre trois grandes cartes lisibles et allume trois sceaux d’avancement ;
- trois pôles bâtis en triangle sur chaque île du World 1, repoussés vers les rives tout en gardant le centre et les accès aux ponts dégagés ;
- HUD paysage compact : l’étape suivante reste visible, le détail des objectifs se déplie à la demande, disparaît définitivement après le paiement du pont, puis des flèches 3D partent du renard et le suivent jusqu’au passage ;
- tutoriel contextuel réservé aux sauvegardes neuves : dépôt, cargaison, nurserie, objectifs, formations, talents et Nouvelle Marée ;
- arbre hexagonal à 32 nœuds : futur invisible, doubles prérequis stricts, capacité de cargaison évolutive, tournées complètes, Frappe de maîtrise à deux rangs, Instinct de relève anti-inactivité, Conseil itinérant optionnel, héritage de Marée progressif, pincement tactile libéré même après une interruption iOS, trois sommets et convergence finale très coûteuse ;
- vrai portail temporel 3D **World 2** sur l’île de base, ouvert après 5 rebirths et les 32 savoirs maximisés, avec traversée aller-retour au sol sur un sentier de terre instancié, allégé et encaissé dans la montagne ;
- **Montagne du Zénith** : onze terrasses et dix rampes accessibles immédiatement, enceinte montagneuse et trente filons — de la pierre au diamant puis au Célestium — dont seuls les minerais trop durs restent noirs ; tous les minerais exploitables sont colorés et cerclés de lumière ;
- économie du World 2 entièrement fondée sur l’argent : les minerais portés sont vendus au Refuge des Échos, les crocs du héros et de la meute possèdent trente niveaux, et aucun stock local ne pollue le HUD ;
- tanière payée en argent, nouveaux loups Quaternius plus détaillés avec douze animations, démon, spectre et yéti animés, défense de meute et six Savoirs du Zénith dédiés ;
- économie, cargaison, travailleurs et progression du World 2 totalement indépendants du World 1 ; objectifs, crocs, fortune, meute et sommet restent persistants dans la sauvegarde v11 ;
- sélection d’un savoir sans achat automatique : une grande fiche explique l’effet, le prix et les prérequis avant confirmation ;
- menu de Marée avec reprise, remise à zéro confirmée et Nouvelle Marée grisée tant que l’acte actuel n’est pas terminé ;
- compteur de Savoir toujours visible, même avant la construction de l’Autel ;
- trois pouvoirs de sommet activables : Auto-régulation, Surcharge tellurique qui double la cargaison prioritaire et Courant de Marée pour les cargaisons, avec alternance visuelle garantie, messages automatiques et effets plein écran désactivables séparément ;
- pouvoir final **Conscience absolue** : réservation intelligente des filons, +4 postes, bonus économiques et synchronisation des trois voies ;
- **Courant de Marée** ne double la vitesse que des renards chargés ; il conserve 5 % des stocks, puis 10, 15 et 20 % via trois rangs coûteux d’Héritage des courants ;
- **Conseil itinérant** : liaison optionnelle à 24 Savoir entre les trois voies, ouvrant l’onglet ÉQUIPE, les métiers et les formations depuis n’importe quelle île ;
- **Frappe de maîtrise** : embranchement Technique facultatif à 12 puis 20 Savoir, faisant évoluer les coups ouvriers de `1/2/3` à `2/4/6`, puis `3/6/9` ;
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
npm run perf:transition
```

## Installation mobile

- iPhone/iPad : Safari → Partager → Sur l’écran d’accueil.
- Android : Chrome → menu → Installer l’application ou Ajouter à l’écran d’accueil.

## Crédits

Les modèles 3D Quaternius, KayKit, Kenney, HippoDevelopment et Gobkit sont CC0. Voir [CREDITS.md](./CREDITS.md).
