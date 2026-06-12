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

Flue découvre les agents dans `agents/`. L'agent expose 3 outils :
`list_pending`, `record_result`, `get_standings` (voir `agents/prono-agent.ts`).

## 1. Installer

```bash
cd flue
npm install
cp .env.example .env        # puis mets ta vraie clé dans .env
npx flue init --target node # génère flue.config.ts
```

> Modèle utilisé : `google/gemini-2.5-pro` (clé `GEMINI_API_KEY`). Pour un autre id Gemini
> ou un autre provider, change `model:` dans `agents/prono-agent.ts` — catalogue : https://pi.dev/docs/latest/providers

## 2. Lancer en local (interactif)

```bash
npm run connect             # = npx flue connect prono-agent local
```

Tu discutes avec l'agent : il appelle `list_pending` pour voir les matchs joués non notés,
tu lui donnes (ou il recherche) les scores, il appelle `record_result`, puis `get_standings`
te sort le classement. `data/results.json` est mis à jour — le dashboard reflète aussitôt.

⚠️ **Recherche des résultats** : le modèle seul n'a pas d'accès web. Deux options :
- **interactif** : tu colles/confirmes les scores dans la session `connect` (le plus simple) ;
- **autonome** : ajoute un outil web (fetch/search) dans `tools` pour que l'agent récupère les
  scores tout seul. Tant que ce n'est pas fait, l'autonomie totale n'est pas possible —
  d'où l'intérêt du skill `/prono-recap` (lui a la recherche web de Claude Code).

## 3. Logs & observabilité

| Commande | Ce que ça donne |
|---|---|
| `npm run connect` (`flue connect`) | Sortie **live** dans le terminal : appels d'outils (`list_pending` → `record_result` → `get_standings`) et réponses de l'agent au fil de l'eau. C'est le log principal en interactif. |
| `npx flue dev --target node` | Serveur de dev en watch-mode (reload auto), port **3583**. |
| `npx flue logs` | Rejoue / suit les événements d'un run depuis un serveur lancé. |
| OpenTelemetry | Flue émet des traces OTel — à brancher sur un collector pour du tracing structuré (prod). |

Pour démarrer, `connect` suffit : tu vois l'agent travailler en direct.

## 4. Exécution one-shot (pour un cron)

```bash
npm run daily               # = npx flue run prono-agent  (une invocation, pas d'interactif)
```

Planifie-le avec un cron système ou un GitHub Actions quotidien (ex. `0 9 * * *`) qui lance
cette commande puis commit `data/results.json` → le dashboard se rafraîchit seul.

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
| Recherche web des scores | ✅ native (Claude Code) | à câbler (outil web) sinon manuel |
| Idéal pour | Suivi quand tu veux | Pipeline autonome / déploiement |
| Données + scoring | `data/*.json` + `scripts/score.py` | `data/*.json` + `lib/scoring.ts` (identique) |
