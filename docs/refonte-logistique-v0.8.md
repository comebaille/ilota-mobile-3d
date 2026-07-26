# Ilota v0.8 — Refonte logistique et Nouvelles Marées

## Intention

Transformer Ilota en un jeu de logistique entièrement visible : les ressources ne
sont plus téléportées vers la nurserie ou directement dans le compteur. Elles sont
récoltées, empilées sur le dos des renards, transportées jusqu’à un dépôt physique,
puis déchargées unité par unité.

La Nouvelle Marée devient ainsi une vraie décision stratégique : chaque Marée
supplémentaire permet de construire un dépôt local sur une île plus éloignée et
réduit les longs allers-retours.

## 1. Réseau de dépôts

- Ajouter un dépôt distinct sur chacune des cinq îles.
- Utiliser la même silhouette 3D de hangar pour que sa fonction soit immédiatement
  reconnaissable.
- Le dépôt central est fourni sous forme de kit de départ gratuit et constitue la
  première construction du tutoriel.
- Les dépôts suivants sont optionnels et obéissent à cette règle permanente :
  - île 2 : une Nouvelle Marée terminée ;
  - île 3 : deux Nouvelles Marées terminées ;
  - île 4 : trois Nouvelles Marées terminées ;
  - île 5 : quatre Nouvelles Marées terminées.
- Un dépôt verrouillé reste visible sous forme de chantier et indique clairement la
  Marée requise.
- Un travailleur dépose sa cargaison dans le dépôt construit le plus proche du
  filon qu’il vient de récolter.
- Sans dépôt local, il doit réellement emprunter les ponts jusqu’au dépôt central.
- La nurserie, l’atelier, la fonderie et l’Autel du Savoir ne reçoivent plus aucune
  livraison.

## 2. Cargaisons visibles

- Le renard principal possède une capacité de transport lisible.
- Une récolte manuelle ajoute la ressource sur son dos au lieu de créditer
  immédiatement le stock global.
- Les bûches, pierres, morceaux de cuivre et cristaux disposent chacun d’une forme
  3D reconnaissable.
- Chaque travailleur affiche exactement sa cargaison, jusqu’à seize unités.
- À l’arrivée au dépôt, les unités quittent son dos et tombent une par une dans le
  bâtiment.
- Le compteur global augmente au rythme du déchargement.
- Une ressource ne peut jamais fournir plus d’unités qu’il ne lui en reste.
- Le rendement maximal d’un travailleur est plafonné à seize unités par voyage.

## 3. Tutoriel contextuel de première partie

Le tutoriel n’apparaît que sur une sauvegarde neuve, notamment après une
réinitialisation complète. Il ne se répète pas à chaque chargement ou à chaque
Nouvelle Marée.

Les cartes pédagogiques sont courtes, lisibles et déclenchées au moment utile :

1. kit de dépôt central et principe du stock ;
2. récolte portée sur le dos et déchargement ;
3. construction de la nurserie, recrutement et affectation ;
4. objectifs d’île et pont ;
5. arrivée sur l’île 2 et dépôt local verrouillé jusqu’à la Marée 2 ;
6. atelier de formation niveau 2 ;
7. fonderie de formation niveau 3 ;
8. Autel du Savoir et achat confirmé des talents ;
9. Cœur de l’Archipel et principe de la Nouvelle Marée.

Chaque carte peut être fermée immédiatement et ne masque jamais définitivement
les commandes.

## 4. Nouvelle Marée mise en scène

Après confirmation :

- la caméra prend une vue cinématique de l’archipel ;
- les îles s’enfoncent de la dernière vers la première ;
- les ponts se brisent dans le même ordre ;
- les travailleurs disparaissent avec l’ancienne Marée ;
- l’île centrale reste émergée ;
- le renard principal ressort de la nurserie ;
- la récompense de Savoir et la nouvelle Marée sont annoncées ;
- la nouvelle partie commence devant la nurserie.

La progression persistante, les talents et le nombre de Marées ne sont appliqués
qu’une seule fois, à la fin de l’animation.

## 5. Corrections des travailleurs

- Si un filon ciblé est épuisé par un autre travailleur, le renard abandonne
  immédiatement cette cible et recalcule son trajet.
- Un renard immobile joue une animation d’attente ; il ne doit plus courir,
  récolter ou « patiner » dans le vide.
- Le niveau supérieur ne produit qu’une seule célébration visuelle par amélioration.
- Avant la Conscience absolue, plusieurs renards peuvent encore choisir naïvement
  la même cible.
- Avec la Conscience absolue, les renards réservent la quantité disponible :
  aucun renard supplémentaire ne part vers un filon déjà entièrement réservé.

## 6. Équilibre des trois voies

### Intelligence

- Conserve le choix de trajets optimisés et l’Auto-régulation activable.
- Son sommet accélère et approfondit les réaffectations automatiques.

### Technique

- Le sommet devient une Surcharge tellurique activable.
- Lorsqu’elle est active, elle détecte la ressource prioritaire en pénurie.
- Elle déclenche périodiquement une phase durant laquelle la réapparition de cette
  ressource est accélérée de 100 %.
- Les filons concernés et les bords de l’écran reçoivent un effet électrique jaune.
- Le doublement permanent des cargaisons est retiré afin de ne pas masquer la
  rareté des filons.

### Exploration

- Le sommet débloque un Courant de Marée activable.
- Lorsqu’un transport est en cours, il déclenche périodiquement une phase de
  déplacement doublé pour le joueur et les travailleurs chargés.
- L’écran reçoit un effet de vague turquoise pendant la phase.
- La conservation d’une partie des stocks lors d’une Nouvelle Marée reste active.

### Conscience absolue

- Coûte toujours 30 Savoirs et requiert les trois sommets.
- Conserve ses bonus généraux.
- Ajoute la réservation intelligente des filons et synchronise les trois réseaux.

## 7. Monde, bâtiments et lisibilité

- Agrandir sensiblement les cinq îles sans augmenter artificiellement le nombre de
  filons.
- Espacer le bâtiment principal, les trois Grands Travaux et les ressources.
- Remplacer la tente centrale par un vrai bâtiment de nurserie.
- Garder les bâtiments principaux imposants.
- Donner à chacun des douze Grands Travaux un modèle cohérent avec sa fonction,
  plus petit qu’un bâtiment principal.
- Tous les bâtiments continuent à se construire par assemblage visible de leurs
  pièces.
- Déplacer le panneau d’objectifs d’île à droite, sous les compteurs de ressources.
- Autoriser les textes utiles à revenir sur deux lignes au lieu de les tronquer.
- Afficher les labels 3D importants devant le décor et adapter leur taille.
- Quand tous les objectifs d’une île sont validés, faire apparaître une suite de
  flèches 3D animées menant au pont correspondant.

## Critères d’acceptation

- Sur une sauvegarde neuve, aucune ressource récoltée n’entre dans le stock avant
  un déchargement au dépôt.
- Un travailleur de l’île 4 utilise réellement tous les ponts jusqu’au dépôt central
  durant la première Marée.
- Après une Nouvelle Marée, le dépôt de l’île 2 peut être construit et devient la
  destination locale la plus proche.
- Une cargaison de seize unités affiche et décharge seize objets distincts.
- Aucun renard ne patine plus de 0,25 seconde lorsqu’une cible disparaît.
- Une amélioration de niveau affiche exactement une célébration.
- Les trois pouvoirs de sommet peuvent être activés et désactivés.
- La Conscience absolue empêche les réservations excédentaires sur toutes les
  ressources.
- Les objectifs, tutoriels, fiches de pouvoir et labels principaux restent lisibles
  dans un viewport iPhone SE paysage de 667 × 375 pixels CSS.
- La campagne complète, la sauvegarde, la Nouvelle Marée et la migration depuis la
  version 0.7 restent jouables.
