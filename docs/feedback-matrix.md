# Matrice de feedback — ouvriers et terrier

| Action | Réponse immédiate | Confirmation simulation | Lisible sans couleur | Mouvement réduit |
|---|---|---|---|---|
| Sélectionner un renard | contour épais, fond clair, `aria-pressed` | son nom apparaît dans l’instruction | nom + état sélectionné | aucun mouvement requis |
| Affecter un métier | cible de métier marquée, icône et libellé | le trajet repart de la position réelle | icône + texte + nombre | transition instantanée |
| Recruter | cartouche `NOUVEAU`, carte qui surgit | renard 3D ajouté et premier trajet planifié | message de statut et nom | carte apparaît sans rebond |
| Améliorer | cartouche `LEVEL UP`, halo et impulsion | niveau, rendement et coût sont mis à jour | niveau écrit + trois segments | halo statique très bref |
| Parcourir 16+ renards | liste verticale à cartes fixes | aucune compression des lignes | `NIV` reste écrit sur chaque carte | défilement natif |
| Ouvrir une fiche | identité, métier, niveau et bouton fixe | cible le même identifiant de travailleur | nom + `NIV` + étoiles | aucun mouvement requis |
| Zoomer l’arbre | boutons −/+, curseur et vue globale | échelle 10–130 % autour de la carte | pourcentage explicite | transformation instantanée |
| Achever un Grand Travail | carte cochée et compteur de palier | coût retiré, bonus actif et Savoir attribué | nom, effet et état `ACHEVÉ` | aucun mouvement requis |
| Récolte ouvrière | particules sur le filon | réserve réduite de la cargaison exacte | diagnostic et taille du filon | disparition par fondu court |
| Épuisement | filon rétréci jusqu’à zéro | cible invalidée, repousse lancée, nouveau choix | disparition complète | échelle mise à jour quasi instantanément |
| Routes optimales | aucun effet artificiel | comparaison de chaque aller + retour | talent nommé dans l’arbre | sans animation dédiée |

Les durées de recrutement, niveau et dépôt sont centralisées dans `WORKER_FEEL`. Les effets ne créditent jamais une ressource : l’économie est modifiée par la simulation, puis seulement représentée par l’interface.
