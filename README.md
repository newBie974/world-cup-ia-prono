# 🏆 AI Prono Battle — Coupe du Monde 2026

**Claude vs GPT vs Gemini** : qui pronostique le mieux la phase de poules du Mondial 2026 ?

Trois IA ont chacune pronostiqué **les 72 matchs de poule** (vainqueur ou nul) *avant* le coup
d'envoi. Ce repo confronte leurs pronostics aux **vrais résultats**, tient un **classement cumulé**
et l'affiche sur un dashboard public.

🔗 **Dashboard live → https://newbie974.github.io/world-cup-ia-prono/**

---

## Le concept

- Les pronostics des 3 IA sont **figés** (fichiers d'origine dans `*.Prono.md`, normalisés en JSON).
- À chaque journée, on enregistre les scores réels et on note chaque IA.
- **Scoring : 1 point par résultat juste** (le vainqueur OU le nul prédit correspond au résultat
  réel). Pas de bonus de score exact — seul GPT donnait des scores, ce serait inéquitable.

Deux manières de faire tourner la mise à jour quotidienne, **interchangeables et partageant
exactement les mêmes données** :

| | **Skill `/prono-recap`** (Claude Code) | **Agent Flue** (`flue/`) |
|---|---|---|
| Déclenchement | Manuel, dans Claude Code | `connect` (interactif) ou autonome |
| Récup. des scores | Recherche web native (couverture complète) | API TheSportsDB + secours web |
| Publication GitHub | ✅ via Claude Code | ✅ via l'outil `publish` de l'agent |
| Scoring | `scripts/score.py` | `flue/lib/scoring.ts` (logique identique) |

---

## Architecture

**Source de vérité unique = deux fichiers JSON.** Tout le reste (script Python, lib TS, dashboard)
ne fait que les lire/écrire.

```
data/predictions.json   ← FIGÉ : 72 matchs (id, groupe, date, équipes) + le prono de chaque IA
data/results.json       ← MÉMOIRE mutable : les vrais résultats, ajoutés au fil des matchs
        │
        ├── scripts/score.py        (Python)  → classement, focus du jour, matchs en attente
        ├── flue/lib/scoring.ts     (TS)       → même logique, pour l'agent Flue
        └── index.html              (statique) → dashboard, fetch les 2 JSON, zéro build
```

Points clés :

- **Le scoring compare des chaînes** : le `winner` d'un résultat doit matcher *exactement*
  l'orthographe canonique du prono dans `predictions.json` (`Tchéquie`, `Côte d'Ivoire`,
  `États-Unis`, `Arabie saoudite`, `RD Congo`, `Cap-Vert`, `Bosnie`…) ou `"Nul"`.
- Les matchs sont identifiés par leur **`id` (1-72)**, jamais par la date (plusieurs matchs
  partagent une date).
- La logique de scoring existe en **double, volontairement identique** (`score.py` + `scoring.ts`) :
  toute évolution des règles doit être répercutée dans les deux.

### Structure du repo

```
.
├── data/
│   ├── predictions.json          # référence figée
│   └── results.json              # état mutable (la "mémoire")
├── scripts/score.py              # scoring déterministe (skill)
├── index.html                    # dashboard néo-brutaliste (GitHub Pages)
├── recaps/AAAA-MM-JJ.md          # récap écrit à chaque run du skill
├── .claude/skills/prono-recap/   # le skill Claude Code
├── flue/                         # l'agent Flue autonome
│   ├── agents/prono-agent.ts     # agent + ses 6 outils
│   ├── lib/scoring.ts            # scoring partagé (miroir de score.py)
│   └── flue.config.ts
├── *.Prono.md                    # pronostics d'origine des 3 IA (audit)
└── CLAUDE.md                     # guide pour les sessions Claude Code
```

---

## Utilisation avec Claude Code (skill `/prono-recap`)

Le skill `.claude/skills/prono-recap/` automatise la journée. Dans Claude Code, tape :

```
/prono-recap
```

Il déroule :

1. `python3 scripts/score.py --pending <date>` → liste les matchs joués pas encore notés.
2. Recherche web des **vrais scores** (FIFA / L'Équipe / ESPN…).
3. Écrit les résultats dans `data/results.json` (noms canoniques uniquement).
4. `python3 scripts/score.py --date <date>` → recalcule, écrit `recaps/<date>.md`.
5. Commit + push → le dashboard se rafraîchit tout seul.

Commandes utiles à la main :

```bash
python3 scripts/score.py                 # classement général
python3 scripts/score.py --date 2026-06-14   # + focus des matchs du jour
python3 scripts/score.py --pending 2026-06-14 # matchs à noter (JSON)
```

---

## Utilisation avec Flue (agent autonome)

L'agent Flue (`flue/`) fait le même travail, mais piloté par un LLM (Gemini) avec ses propres
outils. Voir **[`flue/README.md`](flue/README.md)** pour le détail.

> ⚠️ Le CLI est `@flue/cli` (scopé). Le paquet npm non-scopé `flue` est un squatteur sans rapport.
> **Toujours `npm install` AVANT toute commande**, puis `npm run …` (binaire local) — jamais
> `npx flue` à froid.

```bash
cd flue
npm install                 # installe @flue/cli + @flue/runtime en local
cp .env.example .env        # mets ta clé GEMINI_API_KEY dedans
npm run connect             # session interactive avec l'agent
```

Puis demande-lui « *mets à jour* ». L'agent enchaîne ses **6 outils** :

| Outil | Rôle |
|---|---|
| `list_pending` | matchs joués pas encore notés |
| `fetch_results` | scores réels via l'API JSON TheSportsDB (clé test gratuite par défaut) |
| `fetch_url` | secours générique (lit une page web) si l'API ne couvre pas un match |
| `record_result` | écrit le résultat dans `data/results.json` |
| `get_standings` | classement cumulé des 3 IA |
| `publish` | `git add/commit/push` → rafraîchit le dashboard (identifiants Git de la machine) |

- Modèle : **`google/gemini-2.5-flash`** (éligible free tier ; `gemini-2.5-pro` exige la
  facturation Google, sinon `429 limit: 0`).
- L'agent n'appelle `publish` que s'il a enregistré au moins un nouveau résultat.
- Pour un déclenchement quotidien autonome : cron système / GitHub Actions, ou Cloudflare
  (voir `flue/README.md`).

---

## Dashboard

`index.html` est un fichier **statique autonome** (CSS maison néo-brutaliste, vanilla JS) qui
`fetch()` les deux JSON et calcule le classement côté client. Déployé via **GitHub Pages**
(racine de `main`). Pour le tester en local (le `fetch` exige un serveur HTTP) :

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

---

## Provenance des données

Les pronostics viennent des 3 fichiers d'origine (`Claude - Prono.md`, `GPT - Prono.md`,
`Gemini - Prono.md`), normalisés dans `data/predictions.json` (clé par paire d'équipes au sein
d'un groupe). Les résultats réels proviennent des sources officielles (FIFA) et de l'API
TheSportsDB. *Projet ludique — pronostics à titre indicatif.*
