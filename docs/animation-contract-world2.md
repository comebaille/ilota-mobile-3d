# Contrat d’animation — World 2

## Inventaire

| Clip | Rôle | Durée | Boucle | Root motion | Événements | Variante | Source |
|---|---|---:|---|---|---|---|---|
| Wolf/Idle | attente et décision | 3 s | oui | non | aucun | Idle_2 disponible | Ultimate Animated Animal Pack |
| Wolf/Walk | approche courte | 1 s | oui | non | aucun | — | Ultimate Animated Animal Pack |
| Wolf/Gallop | déplacement et retour | 1 s | oui | non | aucun | — | Ultimate Animated Animal Pack |
| Wolf/Attack | morsure minière ou combat | 1 s | oui pendant l’action | non | frappe pilotée par le timer gameplay | Eating en repli | Ultimate Animated Animal Pack |
| Wolf/Idle_HitReact1 | réaction aux dégâts | 1 s | non | non | aucun | Idle_HitReact2 | Ultimate Animated Animal Pack |
| Wolf/Death | mort | 1 s | non | non | retrait après la fenêtre | — | Ultimate Animated Animal Pack |
| Monster/Idle | garde de terrasse | selon modèle | oui | non | aucun | Flying_Idle pour le spectre | Ultimate Monsters |
| Monster/Run | poursuite locale | selon modèle | oui | non | aucun | Fast_Flying pour le spectre | Ultimate Monsters |
| Monster/Punch | attaque | selon modèle | oui pendant l’action | non | dégât piloté par le timer gameplay | Headbutt pour le spectre | Ultimate Monsters |
| Monster/HitReact | réaction aux dégâts | selon modèle | non | non | aucun | — | Ultimate Monsters |
| Monster/Death | mort lisible | selon modèle | non | non | disparition après 1,35 s | — | Ultimate Monsters |

## Paramètres

| Paramètre | Type | Producteur gameplay | Consommateur animation | Valeurs |
|---|---|---|---|---|
| phase | enum | IA de meute | machine du loup | seeking, moving, gathering, returning, depositing, combat |
| speed | float | locomotion locale | Walk/Gallop et transform du groupe | 0..2,82 unités/s |
| target | référence | sélection de filon/ennemi | orientation du groupe | ressource, dépôt ou monstre |
| health | entier | combat | HitReact/Death | 0..maximum |
| deathTimer | float | combat ennemi | maintien du clip Death | 0..1,35 s |

## États et transitions

| État | Clip/blend | Entrée | Sortie | Crossfade | Interruptions | Priorité | Fallback |
|---|---|---|---|---:|---|---:|---|
| idle | Idle | aucune route active | cible choisie | 0,12 s | combat | 1 | premier clip |
| locomotion | Gallop | route ou cible distante | arrivée | 0,12 s | combat, mort | 2 | Walk |
| mining | Attack | devant un filon compatible | coup terminé ou filon vide | 0,06 s | combat, mort | 3 | Eating |
| combat | Attack/Punch | ennemi à portée | cible morte ou éloignée | 0,05 s | mort | 4 | premier clip |
| hit | HitReact | dégât reçu sans mort | prochaine décision IA | 0,03 s | mort | 5 | Idle |
| death | Death | santé à zéro | disparition/respawn | 0,04 s | aucune | 6 | Idle figé |

## Événements

| Événement | Instant/fenêtre | Effet gameplay | Effet visuel/audio | Règle anti-double |
|---|---|---|---|---|
| wolfStrike | timer de récolte arrivé à zéro | retire `niveau + bonus` unités | particules du minerai | le timer est réarmé à 0,78 s |
| wolfDeposit | arrivée au Refuge | convertit toute la cargaison en argent | chute de cargaison et feedback dépôt | phase `depositing` unique |
| wolfBite | timer de combat arrivé à zéro | dégâts au monstre | HitReact et particules cuivre | cooldown 0,62 ou 0,92 s |
| monsterHit | timer d’attaque arrivé à zéro | dégâts au loup | HitReact et particules pierre | cooldown 1,15 ou 2,2 s |
| monsterDeath | santé à zéro | victoire persistée | Death visible 1,35 s | `deathTimer` interdit une seconde validation |

## Contrôles

- Aucun clip requis ne manque sur les nouveaux GLB.
- Les transitions critiques sont déterministes et les actions de mort sont `LoopOnce`.
- Le déplacement est appliqué au groupe de gameplay ; aucun root motion ne peut créer de glisse cumulative.
- Les événements sont déclenchés par des timers gameplay indépendants du crossfade.
- Pause et reprise conservent un état valide.
- Les modèles restent lisibles même si les effets visuels optionnels sont désactivés.
