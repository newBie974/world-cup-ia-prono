# Spec — Autonomie quotidienne + assets sociaux

_AI Prono Battle · 2026-06-13_

## Objectif

Rendre la mise à jour quotidienne **autonome** (plus de lancement manuel de `/prono-recap`)
et produire à chaque run des **assets sociaux** (image OG à jour + texte de post prêt) pour
partager facilement sur LinkedIn/X — **sans auto-publication** (l'utilisateur poste lui-même).

## Hors scope (volontairement)

- Auto-publication LinkedIn/X (OAuth, X payant, publication sans relecture) — exclu.
- Phase à élimination directe, mode « bats les IA » — autres cycles.
- Changement des règles de scoring ou du modèle de données.

## Décisions arrêtées

| Sujet | Décision |
|---|---|
| Runner d'autonomie | Routine cloud Claude Code (`/schedule`) qui exécute `/prono-recap` |
| Cadence | Quotidienne, **08:00 Europe/Paris** = `0 6 * * *` UTC (CEST = UTC+2 en juin) |
| Image OG | Générée à chaque run en **Pillow** (Python), `og.png` 1200×630 à la racine |
| Social | **Générer les assets, l'utilisateur poste** — `social/AAAA-MM-JJ.md` |

## Composants

### 1. Routine d'autonomie
- Créée via le skill `/schedule` (routine cron cloud), expression `0 6 * * *`.
- Action : exécuter le flux `/prono-recap` de bout en bout, **y compris commit + push**.
- **Prérequis** : l'environnement de la routine doit pouvoir `git push` sur
  `newBie974/world-cup-ia-prono`. À vérifier au moment de la création (`/schedule`).
  Si le push n'est pas possible dans l'env cloud, repli documenté : la routine prépare le
  commit et l'utilisateur pousse, OU on bascule l'autonomie sur une GitHub Action (autre cycle).

### 2. `scripts/og_card.py` — image OG
- Entrées : `data/predictions.json` + `data/results.json` (réutilise la logique de `score.py`
  pour le classement ; importer/partager la fonction de scoring plutôt que la redupliquer).
- Sortie : `og.png` (1200×630) à la racine du repo.
- Rendu **néo-brutaliste** cohérent avec le dashboard : fond clair, bordures noires épaisses,
  3 cartes IA (Claude cyan / GPT lime / Gemini magenta) avec points + %, titre « AI PRONO
  BATTLE », sous-titre « N matchs notés · AAAA-MM-JJ ».
- Implémentation Pillow ; police bold (DejaVuSans-Bold, dispo par défaut avec Pillow, ou
  police bundlée dans `assets/`). 
- **Fallback** : si Pillow indisponible ou erreur de rendu, le script journalise et sort en
  code 0 sans bloquer le reste du run (l'image n'est juste pas régénérée).

### 3. Meta OG/Twitter dans `index.html`
- Ajout dans `<head>` :
  - `og:type`, `og:title`, `og:description`, `og:url`, `og:image` → URL absolue de `og.png`
    sur GitHub Pages, `og:image:width/height` 1200×630.
  - `twitter:card = summary_large_image`, `twitter:title/description/image`.
- Tags **statiques** ; seule `og.png` change → chaque partage montre le classement à jour.
- Note : les scrapers sociaux mettent l'image en cache ; un partage peut afficher une version
  un peu décalée tant que le cache n'a pas expiré (acceptable).

### 4. `social/AAAA-MM-JJ.md` — texte de post prêt
- Écrit par le skill à chaque run où il y a du nouveau.
- Contenu : 4-6 lignes en français — classement à jour (Claude/GPT/Gemini), 1-2 faits
  marquants du jour, lien live `https://newbie974.github.io/world-cup-ia-prono/`, hashtags.
- Format « copier-coller direct ». Pas de publication automatique.

### 5. Mise à jour du skill `/prono-recap`
Le flux devient :
```
pending → fetch résultats (web) → écrire results.json → score.py --date
   → recaps/<date>.md → og_card.py → social/<date>.md → git add+commit+push
```
- Ajouter au `SKILL.md` les étapes explicites **génération OG**, **écriture social**, et
  **commit + push** (aujourd'hui implicites/manuelles).
- Idempotence : si aucun nouveau match, ne rien committer (comme aujourd'hui).

## Flux de données

`predictions.json` (figé) + `results.json` (mémoire) → `score.py` (classement) →
consommé par : `recaps/*.md`, `og_card.py` → `og.png`, `social/*.md`, et `index.html` (dashboard).
Source de vérité inchangée.

## Risques & parades

| Risque | Parade |
|---|---|
| Push impossible depuis la routine cloud | Vérifier au `/schedule` ; repli GitHub Action ou push manuel |
| Pillow/police absents dans l'env | Fallback : skip image, run continue (code 0) |
| Cache OG des scrapers | Acceptable ; documenté |
| Couverture web partielle un jour | Le skill n'enregistre que les matchs confirmés (déjà le cas) |

## Critères de succès

1. La routine tourne à 08:00 Paris et, les jours avec matchs terminés, met à jour
   `results.json` + `recaps/` + `og.png` + `social/` et **pousse** — sans intervention.
2. `og.png` reflète le classement courant ; un partage du lien live affiche une preview soignée.
3. `social/<date>.md` est copiable-collable tel quel.
4. Les jours sans nouveau match : aucun commit, aucun bruit.
5. `score.py` reste l'unique logique de scoring (réutilisée par `og_card.py`, non dupliquée).

## Tests / vérification

- `og_card.py` : lancer en local sur l'état courant → `og.png` 1200×630 généré, lisible.
- Meta OG : valider via un inspecteur de preview (ou `curl` + lecture des balises).
- Skill : run à blanc un jour sans match → aucun commit. Run avec match → tous les artefacts
  + push.
- Routine : vérifier la création `/schedule` et un premier déclenchement.
