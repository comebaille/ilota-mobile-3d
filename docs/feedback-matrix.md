# Matrice de feedback — monde physique et gestion

| Action | Réponse immédiate | Confirmation simulation | Lisible sans couleur | Mouvement réduit |
|---|---|---|---|---|
| Sélectionner un renard | contour épais, fond clair, `aria-pressed` | son nom apparaît dans l’instruction | nom + état sélectionné | aucun mouvement requis |
| Affecter un métier | cible de métier marquée, icône et libellé | le trajet repart de la position réelle | icône + texte + nombre | transition instantanée |
| Recruter | cartouche `NOUVEAU`, carte qui surgit | renard 3D ajouté et premier trajet planifié | message de statut et nom | carte apparaît sans rebond |
| Améliorer | cartouche `LEVEL UP`, halo et impulsion | niveau, rendement et coût sont mis à jour | niveau écrit + trois segments | halo statique très bref |
| Parcourir 16+ renards | liste verticale à cartes fixes | aucune compression des lignes | `NIV` reste écrit sur chaque carte | défilement natif |
| Ouvrir une fiche | identité, métier et niveau fixes | la nurserie informe ; le bon bâtiment autorise la formation | nom + `NIV` + étoiles | aucun mouvement requis |
| Zoomer l’arbre | pincement à deux doigts autour du geste | l’échelle suit continûment l’écartement | aide `GLISSE · PINCE` | transformation directe |
| Choisir un savoir | grand inspecteur avec pouvoir, coût et prérequis | aucune dépense avant `CONFIRMER · ACHETER` | texte complet et bouton séparé | impulsion de bordure brève |
| Achever un Grand Travail | pièces du bâtiment assemblées successivement | coût retiré, bonus actif, Savoir attribué et objectif coché | enseigne, fiche d’interaction et état `ACHEVÉ` | pièces stabilisées sans rebond prolongé |
| Entrer sur une île | panneau latéral avec progression `x/y` | chaque ligne relit la vraie règle du pont | coche + `VALIDÉ` ou cercle + `À FAIRE` | panneau compact une fois terminé |
| Récolte ouvrière | particules sur le filon | réserve réduite de la cargaison exacte | diagnostic et taille du filon | disparition par fondu court |
| Épuisement | filon rétréci jusqu’à zéro | cible invalidée, repousse lancée, nouveau choix | disparition complète | échelle mise à jour quasi instantanément |
| Routes optimales | aucun effet artificiel | comparaison de chaque aller + retour | talent nommé dans l’arbre | sans animation dédiée |

Les durées de recrutement, niveau et dépôt sont centralisées dans `WORKER_FEEL`. Les effets ne créditent jamais une ressource : l’économie est modifiée par la simulation, puis seulement représentée par l’interface.
