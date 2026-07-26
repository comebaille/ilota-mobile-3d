# Matrice de feedback — ouvriers et terrier

| Action | Réponse immédiate | Confirmation simulation | Lisible sans couleur | Mouvement réduit |
|---|---|---|---|---|
| Sélectionner un renard | contour épais, fond clair, `aria-pressed` | son nom apparaît dans l’instruction | nom + état sélectionné | aucun mouvement requis |
| Affecter un métier | cible de métier marquée, icône et libellé | le trajet repart de la position réelle | icône + texte + nombre | transition instantanée |
| Recruter | cartouche `NOUVEAU`, carte qui surgit | renard 3D ajouté et premier trajet planifié | message de statut et nom | carte apparaît sans rebond |
| Améliorer | cartouche `LEVEL UP`, halo et impulsion | niveau, rendement et coût sont mis à jour | niveau écrit + trois segments | halo statique très bref |
| Récolte ouvrière | particules sur le filon | réserve réduite de la cargaison exacte | diagnostic et taille du filon | disparition par fondu court |
| Épuisement | filon rétréci jusqu’à zéro | cible invalidée, repousse lancée, nouveau choix | disparition complète | échelle mise à jour quasi instantanément |
| Routes optimales | aucun effet artificiel | comparaison de chaque aller + retour | talent nommé dans l’arbre | sans animation dédiée |

Les durées de recrutement, niveau et dépôt sont centralisées dans `WORKER_FEEL`. Les effets ne créditent jamais une ressource : l’économie est modifiée par la simulation, puis seulement représentée par l’interface.
