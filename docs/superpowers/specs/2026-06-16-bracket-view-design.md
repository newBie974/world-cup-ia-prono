# Design — Vue Tableau (phase finale) · AI Prono Battle

_Date : 2026-06-16 · Statut : approuvé (design)_

## Contexte

Le dashboard (`index.html`, fichier statique autonome) compare les pronostics de Claude,
GPT et Gemini sur les **72 matchs de poule** du Mondial 2026. La phase finale (élimination
directe) commence le **28 juin** ; les affiches ne sont connues qu'au **27 juin au soir**
(fin des poules). On prépare dès maintenant la **vue Tableau (bracket)**, même si elle
restera vide jusque-là.

Rappel format 2026 (48 équipes) : 12 groupes de 4 → 2 premiers + 8 meilleurs 3es =
**32 qualifiés** → premier tour à élimination directe = **32es de finale**.

## Décisions (validées)

1. **Intégration** : onglets **Poules / Tableau** dans la même page. Podium/classement
   commun au-dessus, inchangé. « Poules » = vue actuelle telle quelle.
2. **Scoring** : **cumul global**. 1 pt par résultat juste partout (poules + bracket).
   En phase finale, **pas de `"Nul"`** : prolongation/tab donnent toujours un vainqueur ;
   les IA prédisent l'équipe qui se qualifie.
3. **État initial (avant 27 juin)** : **squelette du bracket vide** affiché — cases
   « Qualifié 1 / Qualifié 2 » à remplir.
4. **Vue poules** : on ne la modifie pas, hormis qu'elle devient un onglet (« les onglets
   suffisent »).
5. **3e place (petite finale)** : conservée comme match pronosticable.

## Modèle de données

Nouveau fichier **`data/bracket.json`**, séparé de `predictions.json` (qui reste la
référence figée des poules). Il contient les **32 matchs** à élimination directe :

- 16 × 32es (`r32`)
- 8 × 16es (`r16`)
- 4 × quarts (`qf`)
- 2 × demis (`sf`)
- 1 × 3e place (`third`)
- 1 × finale (`final`)

Structure d'un match :

```json
{
  "id": "R32-1",
  "round": "r32",
  "slot": "Qualifié 1 vs Qualifié 2",
  "home": null,
  "away": null,
  "pred": {},
  "winner": null,
  "score": null
}
```

Remplissage **incrémental, par tour** : affiches (`home`/`away`) le 27 juin, puis pronos
des 3 IA (`pred`), puis résultats (`winner`/`score`). Tout est `null`/vide à la création.

Le fichier inclut un en-tête (`_comment`, `last_updated`) à l'image de `results.json`.

## Vue / rendu

- **Onglets** : sélecteur sous le podium qui bascule entre `#view-poules` (existant) et
  `#view-bracket` (nouveau). Toggle JS, pas de rechargement.
- **Bracket — desktop** : colonnes par tour (32es → 16es → quarts → demis → finale, +
  3e place), scroll horizontal. Style néo-brutaliste cohérent : cartes `.neo`, accents IA
  `--cyan`/`--lime`/`--pink`, mêmes primitives que la table actuelle.
- **Bracket — mobile** : bande de chips « tour » réutilisant le motif `.daystrip`
  (32es / 16es / Quarts / Demis / Finale / 3e) ; un tour visible à la fois.
- **Carte de match (bracket)** : les 2 équipes (ou « Qualifié N » si `null`), le résultat
  s'il existe, et les 3 pronos IA (✓/✗ une fois notés), comme la table poules.
- **État vide** : si aucune affiche n'est connue, on affiche le squelette avec libellés
  génériques. Optionnel : petite mention « Phase finale à partir du 28 juin ».

## Scoring (intégration site)

Le calcul JS du podium (`compute`) additionne les bons pronos **poules + bracket**
(1 pt chacun). Bracket vide → 0 pt ajouté → le classement actuel ne change pas.
La logique lit `bracket.json` en plus des deux JSON existants.

## Hors périmètre de ce build

À faire **plus tard**, quand les 32es démarrent (≈ 28 juin), pas maintenant :

- Étendre `scripts/score.py`, `flue/lib/scoring.ts`, `scripts/og_card.py` et le skill
  `/prono-recap` pour noter aussi le bracket.

Ce build se limite à : **`data/bracket.json` (vide)** + **la vue Tableau dans
`index.html`** (onglets, rendu bracket desktop/mobile, intégration du cumul au podium).
Le site (calcul JS autonome) sera donc déjà prêt ; les scripts Python/TS suivront.

## Critères de succès

- Un onglet Tableau apparaît ; on bascule Poules ↔ Tableau sans recharger.
- Le squelette des 32 matchs s'affiche (cases vides), lisible desktop **et** mobile.
- Le podium reste identique (cumul = poules + 0 bracket).
- Aucune régression sur la vue Poules actuelle.
- `bracket.json` est valide et prêt à être rempli par tour.
