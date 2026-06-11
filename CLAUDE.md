# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

**AI Prono Battle** — Claude, GPT et Gemini ont chacun pronostiqué les 72 matchs de poule
de la Coupe du Monde 2026 (vainqueur ou nul). Ce repo compare ces pronostics aux vrais
résultats, tient un classement cumulé, et l'affiche sur une page publique.

Deux façons de faire tourner la mise à jour quotidienne, **interchangeables et partageant
les mêmes données** :
- **Skill manuel** `/prono-recap` (`.claude/skills/prono-recap/`) — lancé à la main.
- **Agent Flue** (`flue/`) — autonome, déployable avec un cron quotidien.

## Source de vérité unique : `data/`

- `data/predictions.json` — **figé.** Les 72 matchs (id 1-72, groupe, date, équipes) + le
  pronostic de chaque IA. Le pronostic est un nom d'équipe **canonique** ou `"Nul"`.
- `data/results.json` — **la mémoire mutable.** Les vrais résultats, ajoutés au fil des
  matchs : `results[<id>] = { winner, score? }`. `winner` doit matcher exactement
  l'orthographe canonique de `predictions.json` (`Tchéquie`, `Côte d'Ivoire`, `États-Unis`,
  `Arabie saoudite`, `RD Congo`, `Cap-Vert`, `Bosnie`…) ou `"Nul"`.

Tout le reste (script Python, lib TS, dashboard HTML) ne fait que lire/écrire ces deux
fichiers. **Le scoring se compare par égalité de chaînes** entre le pronostic et le `winner` —
d'où l'importance des noms canoniques. Les matchs sont identifiés par `id`, jamais par date
(plusieurs matchs partagent une date).

## Scoring

1 point par résultat juste (vainqueur OU nul correctement prédit). Pas de bonus score exact
(seul GPT donnait des scores ; le garder départagerait injustement). La logique existe en
double, volontairement identique :
- `scripts/score.py` (Python, utilisé par le skill)
- `flue/lib/scoring.ts` (TS, utilisé par l'agent Flue)

Toute évolution des règles doit être répercutée dans les **deux**.

## Commandes

```bash
# Classement général
python3 scripts/score.py

# Classement + focus des matchs d'une date
python3 scripts/score.py --date 2026-06-14

# Matchs joués (date <= valeur) pas encore notés → JSON (à rechercher)
python3 scripts/score.py --pending 2026-06-14

# Agent Flue en local
cd flue && npm install && npx flue connect prono-agent local
```

Aucune étape de build pour le dashboard : `index.html` est un fichier statique autonome
qui `fetch()` les deux JSON. Pour le tester localement (le fetch exige un serveur HTTP,
pas `file://`) :

```bash
python3 -m http.server 8000   # puis ouvrir http://localhost:8000
```

## Déploiement du dashboard

`index.html` à la racine → **GitHub Pages** (servir depuis la racine de la branche). Mettre
à jour le classement = mettre à jour `data/results.json` puis commit : la page se rafraîchit
sans rebuild.

## Boucle de mise à jour (skill ou agent)

À chaque run : `--pending` pour lister les matchs à noter → rechercher les vrais scores
(web) → écrire dans `results.json` (noms canoniques uniquement) → `score.py --date` →
récap dans `recaps/AAAA-MM-JJ.md`. Détail dans `.claude/skills/prono-recap/SKILL.md`.

## Source des pronostics

Les 3 fichiers d'origine (`Claude - Prono.md`, `GPT - Prono.md`, `Gemini - Prono.md`) sont
conservés pour référence/audit. `predictions.json` en est la normalisation (clé par paire
d'équipes au sein d'un groupe). En cas de doute sur un pronostic, ils font foi.
