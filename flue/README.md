# AI Prono Battle — agent Flue

Version autonome du skill `/prono-recap`. Mêmes données (`../data/*.json`), même scoring —
mais l'agent tourne via le runtime Flue au lieu d'être piloté à la main dans Claude Code.

## Layout (conventions Flue)

```
flue/
├─ agents/prono-agent.ts   ← l'agent (découvert par son nom de module : "prono-agent")
├─ lib/scoring.ts          ← scoring partagé, lit/écrit ../../data/*.json
├─ package.json
└─ .env                    ← GEMINI_API_KEY (à créer, gitignoré)
```

Flue découvre les agents dans `agents/`. L'agent expose 5 outils (voir `agents/prono-agent.ts`) :
`list_pending`, `record_result`, `get_standings`, et pour l'autonomie **`fetch_results`**
(scores réels via l'API JSON TheSportsDB) + **`fetch_url`** (secours générique, lit une page web).

> ⚠️ **Piège de nom à connaître.** Le CLI s'appelle `@flue/cli` (scopé). Le paquet npm
> **non-scopé `flue`** est un squatteur sans rapport (un "Firebase search utility").
> Donc **n'exécute jamais `npx flue …` AVANT `npm install`** : npx irait télécharger le
> squatteur. Installe d'abord, puis utilise les **scripts npm** (`npm run …`) ou le binaire
> local `./node_modules/.bin/flue` — qui pointent toujours sur le bon `@flue/cli`.

## 1. Installer

```bash
cd flue
npm install                 # installe @flue/cli + @flue/runtime EN LOCAL (indispensable d'abord)
cp .env.example .env        # puis mets ta vraie clé dans .env
```

`flue.config.ts` est déjà committé (cible node). Si besoin de le régénérer : `npm run init`.

> Modèle utilisé : `google/gemini-2.5-pro` (clé `GEMINI_API_KEY`). Pour un autre id Gemini
> ou un autre provider, change `model:` dans `agents/prono-agent.ts` — catalogue : https://pi.dev/docs/latest/providers

## 2. Lancer en local (interactif)

```bash
npm run connect             # = flue connect prono-agent local  (binaire local, jamais le squatteur)
```

Tu discutes avec l'agent : il appelle `list_pending` pour voir les matchs joués non notés,
tu lui donnes (ou il recherche) les scores, il appelle `record_result`, puis `get_standings`
te sort le classement. `data/results.json` est mis à jour — le dashboard reflète aussitôt.

**Récupération des résultats (autonome)** : l'agent appelle `fetch_results(date)` qui interroge
l'API **TheSportsDB** (JSON, clé de test publique gratuite `123` par défaut, ou ta propre clé via
`SPORTSDB_KEY` dans `.env`). Les noms reviennent en anglais — l'agent les mappe vers le français.
Il n'enregistre que les matchs `finished=true`.

> ⚠️ L'API gratuite ne couvre pas toujours 100 % des matchs d'une journée. Si un match manque,
> l'agent peut se rabattre sur `fetch_url` (une page de résultats fiable), sinon il ne l'enregistre
> pas. Pour une couverture complète garantie, le skill `/prono-recap` (recherche web de Claude Code)
> reste le plus fiable.

## 3. Logs & observabilité

| Commande | Ce que ça donne |
|---|---|
| `npm run connect` (`flue connect`) | Sortie **live** dans le terminal : appels d'outils (`list_pending` → `record_result` → `get_standings`) et réponses de l'agent au fil de l'eau. C'est le log principal en interactif. |
| `npx flue dev --target node` | Serveur de dev en watch-mode (reload auto), port **3583**. |
| `npx flue logs` | Rejoue / suit les événements d'un run depuis un serveur lancé. |
| OpenTelemetry | Flue émet des traces OTel — à brancher sur un collector pour du tracing structuré (prod). |

Pour démarrer, `connect` suffit : tu vois l'agent travailler en direct.

## 4. One-shot / cron

`flue run` cible des **workflows**, pas des agents — notre `prono-agent` se pilote donc via
`connect` (interactif). Pour une exécution quotidienne non-interactive, deux pistes :
- envelopper l'appel dans un **workflow** Flue (`flue run <workflow>`), puis le planifier ;
- ou plus simple aujourd'hui : laisser le skill `/prono-recap` (Claude Code) faire le run quotidien.

Dans tous les cas, le cron commit `data/results.json` → le dashboard se rafraîchit seul.

## 5. Déployer sur Cloudflare (optionnel)

```bash
npx flue init --target cloudflare
npx wrangler secret put GEMINI_API_KEY
npm run build               # npx flue build --target cloudflare
npx wrangler deploy
```

Pour un déclenchement quotidien : ajoute un cron trigger Cloudflare (`triggers.crons` dans
`wrangler.jsonc`) qui invoque l'agent.

## Skill vs agent Flue

| | Skill `/prono-recap` | Agent Flue |
|---|---|---|
| Déclenchement | Manuel, dans Claude Code | `connect` (interactif) / `run` (one-shot, cron) |
| Récupération des scores | ✅ recherche web (Claude Code), couverture complète | ✅ `fetch_results` (API TheSportsDB) + `fetch_url` en secours |
| Idéal pour | Suivi quand tu veux | Pipeline autonome / déploiement |
| Données + scoring | `data/*.json` + `scripts/score.py` | `data/*.json` + `lib/scoring.ts` (identique) |
