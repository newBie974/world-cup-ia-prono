---
name: prono-recap
description: Met à jour le AI Prono Battle (Mondial 2026). Récupère les vrais résultats des matchs de poule joués mais pas encore notés, les enregistre dans data/results.json, recalcule le classement Claude vs GPT vs Gemini, et écrit un récap du jour. À lancer quand l'utilisateur demande "le récap prono", "qui gagne", "mets à jour les scores", ou /prono-recap.
---

# Prono Recap — AI Prono Battle (Coupe du Monde 2026)

Trois IA (Claude, GPT, Gemini) ont pronostiqué les 72 matchs de poule du Mondial 2026
(vainqueur ou nul). Ce skill compare leurs pronostics aux vrais résultats et tient un
classement cumulé. Scoring : **1 pt par résultat juste** (le vainqueur OU le nul prédit
correspond au résultat réel). Pas de bonus score exact.

## Fichiers

- `data/predictions.json` — référence figée : 72 matchs + le pronostic de chaque IA. **Ne pas modifier.**
- `data/results.json` — la mémoire : les vrais résultats enregistrés. C'est le SEUL fichier que ce skill écrit côté données.
- `scripts/score.py` — scoring déterministe (classement + focus du jour + liste des matchs en attente).
- `recaps/AAAA-MM-JJ.md` — récap écrit à chaque run.
- `index.html` — dashboard public (lit les 2 JSON, rien à régénérer ; déployé via GitHub Pages).
- `scripts/og_card.py` — régénère `og.png` (carte du classement) ; lit predictions+results.
- `social/AAAA-MM-JJ.md` — texte de post prêt à publier (écrit à chaque run avec du nouveau).

## Procédure

1. **Date du jour.** Utilise la date courante (contexte `currentDate`), format `AAAA-MM-JJ`.

2. **Lister les matchs à noter** (joués, date ≤ aujourd'hui, pas encore dans results.json) :
   ```
   python3 scripts/score.py --pending <AAAA-MM-JJ>
   ```
   Si la liste est vide → rien à faire, dis-le et arrête-toi (sauf si l'utilisateur demande juste le classement actuel, voir étape 6).

3. **Récupérer les vrais résultats** des matchs listés via WebSearch (sources : score final officiel,
   ex. site FIFA, L'Équipe, ESPN). Pour chaque match, déterminer :
   - le `winner` = nom de l'équipe gagnante **avec l'orthographe canonique exacte de predictions.json**
     (`Tchéquie`, `Côte d'Ivoire`, `États-Unis`, `Arabie saoudite`, `RD Congo`, `Cap-Vert`, `Bosnie`, etc.), ou `"Nul"`.
   - le `score` final (ex. `"2-1"`).
   - ⚠️ N'enregistre QUE des matchs réellement terminés. Un match non joué / en cours → ne pas l'ajouter.

4. **Écrire dans `data/results.json`** : ajouter chaque résultat sous `results` (clé = id du match en string),
   et mettre `last_updated` à la date du jour. Conserver les résultats déjà présents.

5. **Recalculer + récap.** Lancer :
   ```
   python3 scripts/score.py --date <AAAA-MM-JJ>
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
   git add data/results.json recaps/ og.png social/
   git commit -m "data: maj résultats <date> + recap + assets sociaux"
   git push
   ```
   S'il n'y a aucun nouveau match (rien de neuf), ne rien committer.

9. **Restituer** à l'utilisateur : classement à jour + faits marquants. Concis, en français.

> **Classement seul** (si l'utilisateur veut juste l'état actuel sans rien récupérer) :
> `python3 scripts/score.py` et résume.

## Notes

- Le scoring compare des chaînes : le `winner` doit matcher exactement le nom dans `predictions.json`.
  En cas de doute sur l'orthographe, ouvre `predictions.json` pour copier le nom exact.
- Les matchs sont identifiés par leur `id` (1-72), pas par la date — plusieurs matchs partagent une date.
- Si un résultat a été mal saisi, corrige l'entrée dans `results.json` et relance `score.py`.
