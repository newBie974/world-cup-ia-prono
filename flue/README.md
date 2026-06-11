# AI Prono Battle — agent Flue

Version autonome du skill `/prono-recap`. Mêmes données, même scoring — mais l'agent
tourne seul (en local ou déployé avec un cron quotidien) au lieu d'être lancé à la main.

## Fichiers

- `prono-agent.ts` — l'agent (`createAgent`) + ses 3 outils (`list_pending`, `record_result`, `get_standings`).
- `lib/scoring.ts` — logique de scoring partagée, lit/écrit `../data/predictions.json` et `../data/results.json`.

L'agent et le skill manuel écrivent dans **le même `data/results.json`** : le dashboard
`index.html` reflète les deux indifféremment.

## Lancer en local

```bash
cd flue
npm install
npx flue connect prono-agent local
```

L'agent liste les matchs joués non notés, recherche leurs résultats, les enregistre, et
restitue le classement. (La recherche web suppose que ton runtime Flue expose un outil de
recherche / fetch au modèle ; sinon ajoute-le dans `tools`.)

## Déployer + cron quotidien

`flue deploy` pousse l'agent (ex. Cloudflare Workers). Pour un déclenchement quotidien,
ajoute un **cron trigger** côté plateforme de déploiement (ex. `wrangler.toml` :
`crons = ["0 9 * * *"]`) qui invoque l'agent chaque matin. À chaque tick il met à jour
`results.json`, puis un commit/redéploiement rafraîchit le dashboard.

## Pourquoi deux implémentations ?

| | Skill `/prono-recap` | Agent Flue |
|---|---|---|
| Déclenchement | Manuel, dans Claude Code | Autonome (local ou cron cloud) |
| Idéal pour | Suivi quand tu veux | "Set & forget" quotidien |
| Données / scoring | `data/*.json` + `scripts/score.py` | `data/*.json` + `lib/scoring.ts` (identique) |

Les deux sont interchangeables et cohérents : choisis selon que tu veux piloter à la main
ou laisser tourner.
