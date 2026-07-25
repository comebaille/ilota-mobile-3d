# Campagne d’Ilota — Le Cycle des Marées

## Promesse

- Fantaisie principale : transformer un îlot manuel en archipel organisé, puis transmettre les connaissances acquises à une Nouvelle Marée plus exigeante.
- Boucle principale : récolter, choisir le prochain investissement, construire, recruter, affecter et améliorer les travailleurs, puis spécialiser durablement l’archipel dans une branche de talents.
- Durée cible de la première Marée : 25 à 45 minutes selon la part de récolte manuelle et l’ordre des investissements.
- Durée cible des Marées suivantes : 20 à 35 minutes chacune, avec davantage de coûts mais des talents permanents et un départ accélérable.
- Durée optionnelle : cycle ouvert de Marées et maîtrise d’une constellation de 26 nœuds (plusieurs dizaines de Savoir par sommet, 173 pour tout maximiser).
- État initial : un renard, deux ressources, aucun bâtiment et aucun talent.
- Conclusion d’une Marée : éveiller le Cœur après avoir relié cinq îles et formé une équipe couvrant les quatre métiers.
- Conclusion méta : aucune fin forcée ; chaque Cœur éveillé permet soit le mode libre, soit une Nouvelle Marée.
- Nombre de chapitres jouables par Marée : 5.

## Arc d’une Marée

| Chapitre | État | Durée cible | Objectif | Nouveauté | Mécaniques réutilisées | Déblocage | Climax | Transition |
|---|---|---:|---|---|---|---|---|---|
| 1. Camp des Marées | jouable | 6–10 min | Camp, 2 travailleurs, pont des Pins | Recrutement, affectation bois/pierre, premier Savoir | Récolte manuelle | Capacité 3 | Premier pont puis émergence | Accès aux Pins |
| 2. Atelier des Pins | jouable | 5–9 min | Atelier, équipe de 4, premier niveau 2 | Rendement et premier choix de talent utile | Affectations et vrais trajets | Capacité 5, niveau 2 | Pont cuivré | Accès au cuivre |
| 3. Île Cuivrée | jouable | 5–9 min | Fonderie, cuivrier, équipe de 5 | Troisième ressource et niveau 3 | Arbitrage stocks / coûts | Capacité 7, métier cuivre | Pont des Cristaux | Accès au cristal |
| 4. Observatoire | jouable | 5–10 min | Observatoire, cristallier, 10 niveaux | Quatrième ressource et production multizone | Tous les systèmes précédents | Capacité 9, métier cristal | Pont de la Couronne | Accès au Cœur |
| 5. Cœur de l’Archipel | jouable | 4–7 min | 8 travailleurs, 4 métiers, 12 niveaux, offrande | Composition finale et choix de branche complet | Économie et logistique combinées | +2 Savoir, Nouvelle Marée | Éveil du Cœur | Mode libre ou rebirth |

## Méta-progression persistante

Chaque structure et chaque pont rapporte 1 Savoir ; le Cœur en rapporte 2. Une Marée complète donne donc 10 Savoir avant la récompense de Nouvelle Marée. Ce revenu ouvre plusieurs choix immédiats, mais aucun sommet en un seul cycle.

L’arbre commence par l’hexagone gratuit **Démarrer**. Il révèle trois portes, puis seulement les nœuds dont les prérequis sont atteints. Les voies ne sont pas des colonnes isolées : trois savoirs hybrides créent des passerelles et les sommets exigent certains croisements.

| Voie | Début | Milieu | Pouvoir profond | Sommet |
|---|---|---|---|---|
| Intelligence | Vitesse et vrais plus courts chemins | Prévisions et relèves coordonnées | Auto-régulation des métiers | Esprit collectif : deux changements toutes les 3 s |
| Technique | Récolte manuelle et cargaisons | Régénération et effectif répétable | Maîtres bâtisseurs | Moteur perpétuel : cargaisons doublées |
| Exploration | Vitesse joueur et caches | Coûts et mémoire de départ | Horizon lointain | Héritage océanique : 35 % des stocks conservés |
| Hybrides | Réseau logistique | Récolte adaptative et éclaireurs | Connexions entre voies | Conscience de l’Archipel : +2 postes et réduction globale |

**Cercle des bâtisseurs** possède cinq rangs : chaque rang ajoute un poste permanent, mais coûte successivement 3, 5, 8, 12 puis 17 Savoir. Avec le sommet hybride, la capacité maximale passe de 9 à 16 travailleurs.

La Nouvelle Marée :

- remet à zéro les ressources, bâtiments, ponts, caches et travailleurs ;
- conserve le Savoir non dépensé et tous les talents ;
- accorde 3 à 6 Savoir supplémentaires selon le nombre de Marées déjà franchies ;
- augmente les exigences de 22 % par Marée, jusqu’à un plafond ;
- donne une réserve initiale croissante si Mémoire des marées est acquise.
- conserve 35 % des quatre stocks si Héritage océanique est acquis.

## Navigation et intelligence des ouvriers

- Une livraison est créditée uniquement lorsque le travailleur revient physiquement à un dépôt.
- Un trajet inter-îles est une route de points : terre, entrée du pont, sortie du pont, puis terre.
- Une réaffectation repart de la position actuelle ; elle ne téléporte jamais le travailleur.
- Sans Routes calculées, l’affectation reste stable et prévisible.
- Avec Routes calculées, chaque renard compare les couples gisement / dépôt accessibles et choisit la distance totale minimale.
- Avec Auto-régulation active, le jeu évalue le prochain coût, les stocks, les métiers non couverts et la production présente. La réaction passe de 8 à 5 secondes avec Relèves coordonnées, puis à deux changements toutes les 3 secondes avec Esprit collectif.

## Révélation de l’archipel

- Au chargement, seul l’îlot de départ reste à la surface.
- Chaque île future, ses ressources, sa cache, son décor et son chantier attendent à 8,5 unités sous l’eau.
- La construction du pont lance une émergence de 2,15 secondes avec easing, ressac concentrique et particules.
- L’île reste non marchable pendant sa remontée ; les traversées deviennent possibles après stabilisation.
- Éclaireurs autonomes récupère la cache locale à la fin de l’émergence sans révéler l’île à l’avance.

## Contenu secondaire

| Activité | Chapitre | Variation | Récompense | Facultatif |
|---|---|---|---|---|
| Caches d’exploration | 1–4 | Détours spatiaux sans coût | Réserves adaptées, puis +50 % avec Instinct | Oui |
| Choix de branche | Tous | Spécialisation d’une stratégie de Marée | Pouvoirs persistants | Oui, mais structurant |
| Équipe parfaite | 5 | Optimisation des niveaux, métiers et distances | Production maximale | Oui |
| Nouvelles Marées | Après le Cœur | Recommencer avec des règles permanentes différentes | Savoir et maîtrise multibranche | Oui |

## Contrôle anti-remplissage

- La durée supplémentaire vient des décisions de logistique, des spécialisations et du cycle persistant, pas de points de vie artificiels.
- Les distances comptent parce que les ouvriers les parcourent réellement ; le talent d’itinéraire change donc une décision mesurable.
- Un sommet transforme la boucle : équipe autonome, production doublée ou transmission massive entre les cycles.
- L’inflation des Marées est accompagnée de talents permanents, de récompenses de Savoir et d’un possible stock de départ.
- Le Cœur reste atteignable à chaque cycle et le mode libre reste disponible.

## Preuve de complétion

- Un test automatisé parcourt les cinq chapitres jusqu’au Cœur.
- Les sauvegardes v1, v2 et v3 sont migrées vers la v4, y compris les anciens talents replacés dans le nouveau graphe.
- Des tests unitaires contrôlent les prérequis croisés, les coûts de rang, la conservation au rebirth et l’auto-régulation.
- Le graphe de navigation refuse une île sans pont et inclut les deux extrémités de chaque pont utilisé.
- Un test navigateur réaffecte un ouvrier en mouvement, confirme l’absence de téléportation et échantillonne sa présence sur le réseau marchable.
- Un test navigateur fait apparaître les trois voies depuis le nœud gratuit, atteint l’auto-régulation profonde et achète deux rangs d’effectif.
- Le parcours complet attend et vérifie l’émergence de chacune des quatre îles avant de la traverser.
