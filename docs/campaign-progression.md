# Campagne d’Ilota — Le Cycle des Marées

## Promesse

- Fantaisie principale : transformer un îlot manuel en archipel organisé, puis transmettre les connaissances acquises à une Nouvelle Marée plus exigeante.
- Boucle principale : récolter, choisir le prochain investissement, construire, recruter, affecter et améliorer les travailleurs, puis spécialiser durablement l’archipel dans une branche de talents.
- Durée cible de la première Marée : 25 à 45 minutes selon la part de récolte manuelle et l’ordre des investissements.
- Durée cible des Marées suivantes : 20 à 35 minutes chacune, avec davantage de coûts mais des talents permanents et un départ accélérable.
- Durée optionnelle : cycle ouvert de Marées et maîtrise des trois branches (30 Savoir dépensé au total).
- État initial : un renard, deux ressources, aucun bâtiment et aucun talent.
- Conclusion d’une Marée : éveiller le Cœur après avoir relié cinq îles et formé une équipe couvrant les quatre métiers.
- Conclusion méta : aucune fin forcée ; chaque Cœur éveillé permet soit le mode libre, soit une Nouvelle Marée.
- Nombre de chapitres jouables par Marée : 5.

## Arc d’une Marée

| Chapitre | État | Durée cible | Objectif | Nouveauté | Mécaniques réutilisées | Déblocage | Climax | Transition |
|---|---|---:|---|---|---|---|---|---|
| 1. Camp des Marées | jouable | 6–10 min | Camp, 2 travailleurs, pont des Pins | Recrutement, affectation bois/pierre, premier Savoir | Récolte manuelle | Capacité 3 | Premier pont | Accès aux Pins |
| 2. Atelier des Pins | jouable | 5–9 min | Atelier, équipe de 4, premier niveau 2 | Rendement et premier choix de talent utile | Affectations et vrais trajets | Capacité 5, niveau 2 | Pont cuivré | Accès au cuivre |
| 3. Île Cuivrée | jouable | 5–9 min | Fonderie, cuivrier, équipe de 5 | Troisième ressource et niveau 3 | Arbitrage stocks / coûts | Capacité 7, métier cuivre | Pont des Cristaux | Accès au cristal |
| 4. Observatoire | jouable | 5–10 min | Observatoire, cristallier, 10 niveaux | Quatrième ressource et production multizone | Tous les systèmes précédents | Capacité 9, métier cristal | Pont de la Couronne | Accès au Cœur |
| 5. Cœur de l’Archipel | jouable | 4–7 min | 8 travailleurs, 4 métiers, 12 niveaux, offrande | Composition finale et choix de branche complet | Économie et logistique combinées | +2 Savoir, Nouvelle Marée | Éveil du Cœur | Mode libre ou rebirth |

## Méta-progression persistante

Chaque structure et chaque pont rapporte 1 Savoir ; le Cœur en rapporte 2. Une Marée complète donne donc exactement 10 Savoir, soit le prix cumulé d’une branche entière (1 + 2 + 3 + 4).

| Branche | Palier 1 | Palier 2 | Palier 3 | Sommet |
|---|---|---|---|---|
| Intelligence | Vitesse ouvriers | Routes réellement les plus courtes | Prévision de la pénurie | Auto-régulation des métiers |
| Industrie | Double récolte manuelle | Cargaisons renforcées | Régénération accélérée | Production ouvrière maîtrisée |
| Exploration | Vitesse joueur | Caches enrichies | Coûts réduits | Réserve de départ après rebirth |

La Nouvelle Marée :

- remet à zéro les ressources, bâtiments, ponts, caches et travailleurs ;
- conserve le Savoir non dépensé et tous les talents ;
- accorde 3 à 6 Savoir supplémentaires selon le nombre de Marées déjà franchies ;
- augmente les exigences de 22 % par Marée, jusqu’à un plafond ;
- donne une réserve initiale croissante si Mémoire des marées est acquise.

## Navigation et intelligence des ouvriers

- Une livraison est créditée uniquement lorsque le travailleur revient physiquement à un dépôt.
- Un trajet inter-îles est une route de points : terre, entrée du pont, sortie du pont, puis terre.
- Une réaffectation repart de la position actuelle ; elle ne téléporte jamais le travailleur.
- Sans Routes calculées, l’affectation reste stable et prévisible.
- Avec Routes calculées, chaque renard compare les couples gisement / dépôt accessibles et choisit la distance totale minimale.
- Avec Auto-régulation active, le jeu évalue le prochain coût, les stocks, les métiers non couverts et la production présente. Toutes les huit secondes au plus, un seul travailleur excédentaire peut changer de métier, ce qui évite les oscillations permanentes.

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
- Une branche complète transforme la boucle : automatisation, puissance productive ou accélération des cycles.
- L’inflation des Marées est accompagnée de talents permanents, de récompenses de Savoir et d’un possible stock de départ.
- Le Cœur reste atteignable à chaque cycle et le mode libre reste disponible.

## Preuve de complétion

- Un test automatisé parcourt les cinq chapitres jusqu’au Cœur.
- La sauvegarde v1 et la campagne v2 sont migrées vers la v3.
- Des tests unitaires contrôlent les prérequis de talents, la conservation au rebirth et l’auto-régulation.
- Le graphe de navigation refuse une île sans pont et inclut les deux extrémités de chaque pont utilisé.
- Un test navigateur réaffecte un ouvrier en mouvement, confirme l’absence de téléportation et échantillonne sa présence sur le réseau marchable.
- Un test navigateur débloque les quatre paliers Intelligence, active l’auto-régulation, puis vérifie une Nouvelle Marée persistante.
