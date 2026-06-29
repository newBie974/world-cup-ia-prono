---
name: prono-recap
description: Met à jour le AI Prono Battle (Mondial 2026). Récupère les vrais résultats des matchs de poule joués mais pas encore notés, les enregistre dans data/results.json, recalcule le classement Claude vs GPT vs Gemini, et écrit un récap du jour. À lancer quand l'utilisateur demande "le récap prono", "qui gagne", "mets à jour les scores", ou /prono-recap.
---

# Prono Recap — AI Prono Battle (Coupe du Monde 2026)

Trois IA (Claude, GPT, Gemini) ont pronostiqué le Mondial 2026. Ce skill compare leurs
pronostics aux vrais résultats et tient un classement **cumulé sur tout le tournoi** :

- **Phase de poules** (72 matchs, `data/results.json`) : **1 pt par résultat juste**
  (vainqueur OU nul correctement prédit). Pas de bonus score exact.
- **Phase finale** (bracket, `data/bracket.json`) : barème enrichi, **jusqu'à 3 pts par match** —
  **+1** bonne équipe qualifiée, **+1** score exact (temps régl./prolongation),
  **+1 bonus** si l'IA **annonce une séance de tirs au but** (`tab=true`) qui a effectivement lieu
  (parier « pas de TAB » ne rapporte rien). Pas de nul possible.

La « réussite » affichée = % des points POSSIBLES gagnés : 1 par match de poule ; 2 par match
de phase finale, 3 seulement s'il y a une séance de TAB.

## Fichiers

- `data/predictions.json` — référence figée : 72 matchs de poule + le pronostic de chaque IA. **Ne pas modifier.**
- `data/results.json` — mémoire des résultats de **poule**. Écrit par ce skill.
- `data/bracket.json` — **phase finale** : affiches, pronos (`pred[ia] = {team, score, tab}`) et
  résultats (`winner`, `score`, `tab`, `pens`). Écrit par ce skill quand on note un match de bracket.
- `scripts/score.py` — scoring déterministe (classement cumulé + focus jour `--date` / tour `--round` + `--pending`).
- `recaps/AAAA-MM-JJ.md` — récap écrit à chaque run.
- `index.html` — dashboard public (lit les 3 JSON, rien à régénérer ; déployé via GitHub Pages).
- `scripts/og_card.py` — régénère `og.png` (carte du classement) ; lit predictions+results+bracket.
- `social/AAAA-MM-JJ.md` — texte de post prêt à publier (écrit à chaque run avec du nouveau).

## Procédure

1. **Date du jour.** Utilise la date courante (contexte `currentDate`), format `AAAA-MM-JJ`.

2. **Lister les matchs à noter** :
   ```
   python3 scripts/score.py --pending <AAAA-MM-JJ>
   ```
   Le JSON renvoie deux types d'entrées (champ `phase`) :
   - `"poules"` : matchs de poule joués (date ≤ valeur) pas encore dans `results.json`.
   - `"finale"` : matchs de phase finale dont l'**affiche est connue** et le résultat manquant
     (champ `round` = `r32`/`r16`/`qf`/`sf`/`third`/`final`).

   Si la liste est vide → rien à faire, dis-le et arrête-toi (sauf si l'utilisateur demande juste le classement actuel, voir étape 6).

3. **Récupérer les vrais résultats** des matchs listés via WebSearch (sources : score final officiel,
   ex. site FIFA, L'Équipe, ESPN). Pour chaque match, déterminer :
   - le `winner` = nom de l'équipe gagnante **avec l'orthographe canonique exacte de predictions.json**
     (`Tchéquie`, `Côte d'Ivoire`, `États-Unis`, `Arabie saoudite`, `RD Congo`, `Cap-Vert`, `Bosnie`, etc.), ou `"Nul"`.
   - le `score` final (ex. `"2-1"`).
   - ⚠️ N'enregistre QUE des matchs réellement terminés. Un match non joué / en cours → ne pas l'ajouter.

4. **Écrire les résultats** (conserver l'existant, mettre `last_updated` à la date du jour) :
   - **Poules** → dans `data/results.json`, sous `results` (clé = id du match en string) :
     `{ "winner": "<équipe ou Nul>", "score": "2-1" }`.
   - **Phase finale** → dans `data/bracket.json`, sur le match correspondant (clé `id`, ex `R32-1`) :
     renseigner `winner` (équipe qualifiée, jamais "Nul"), `score` (temps régl./prolongation, ex `"1-1"`),
     `tab` (`true`/`false` selon tirs au but) et `pens` (score des TAB pour l'affichage, ex `"4-2"`, sinon `null`).
     ⚠️ Quand un tour se termine, **remplir aussi les affiches du tour suivant** (`home`/`away` des matchs
     `r16`/`qf`/… à partir des vainqueurs) puis re-demander aux 3 IA leurs pronos (`pred[ia] = {team, score, tab}`).

5. **Recalculer + récap.** Lancer (selon ce qui a été noté) :
   ```
   python3 scripts/score.py --date <AAAA-MM-JJ>   # focus poules du jour
   python3 scripts/score.py --round <r32|r16|qf|sf|third|final>   # focus d'un tour de phase finale
   ```
   Coller la sortie Markdown dans `recaps/<AAAA-MM-JJ>.md` + 2-3 phrases d'analyse (sous un titre
   `## Analyse`, en bullets — c'est cette section qui s'affiche sur le dashboard).
   Copier ensuite ce même récap dans `recaps/latest.md` (le dashboard lit ce fichier) :
   `cp recaps/<AAAA-MM-JJ>.md recaps/latest.md`.

6. **Régénérer l'image OG** :
   ```
   python3 scripts/og_card.py
   ```
   Si la commande échoue (Pillow/police absents), le noter et continuer sans bloquer.

7. **Écrire le texte de post** dans `social/<AAAA-MM-JJ>.md` : 4-6 lignes en français, prêtes
   à copier-coller — classement à jour (Claude/GPT/Gemini), 1-2 faits marquants du jour, le
   lien `https://newbie974.github.io/world-cup-ia-prono/`, et 3-4 hashtags
   (#AI #LLM #WorldCup2026). Pas de publication : on génère seulement l'asset.

8. **Publier** : committer et pousser tous les changements :
   ```
   git add data/results.json data/bracket.json recaps/ og.png social/
   git commit -m "data: maj résultats <date> + recap + assets sociaux"
   git push
   ```
   S'il n'y a aucun nouveau match (rien de neuf), ne rien committer.

9. **Restituer** à l'utilisateur : classement à jour + faits marquants. Concis, en français.

> **Classement seul** (si l'utilisateur veut juste l'état actuel sans rien récupérer) :
> `python3 scripts/score.py` et résume.

## Notes

- Le scoring compare des chaînes : le `winner` doit matcher exactement le nom dans `predictions.json`
  (poules) ou `bracket.json` (`home`/`away` d'un match de finale). En cas de doute, copie le nom exact.
- Matchs de poule identifiés par `id` (1-72) ; matchs de phase finale par `id` texte (`R32-1`, `QF-3`, `FINAL`…).
- Phase finale : **pas de "Nul"** (prolongation/TAB donnent toujours un vainqueur). Si TAB, `score` est
  l'égalité de fin de prolongation (ex `"1-1"`) et `tab` vaut `true`.
- Si un résultat a été mal saisi, corrige l'entrée (`results.json` ou `bracket.json`) et relance `score.py`.
- Toute évolution du barème doit être répercutée dans les **deux** moteurs : `scripts/score.py`
  (Python) et `flue/lib/scoring.ts` (TS).
