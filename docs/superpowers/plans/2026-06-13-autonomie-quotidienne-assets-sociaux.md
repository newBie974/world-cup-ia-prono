# Autonomie quotidienne + assets sociaux — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la mise à jour quotidienne autonome (routine cloud qui exécute `/prono-recap`) et produire à chaque run une image OG à jour + un texte de post prêt — sans auto-publication.

**Architecture:** Un script `scripts/og_card.py` (Pillow) réutilise la logique de `score.py` pour dessiner `og.png`. `index.html` reçoit les balises OG/Twitter pointant vers `og.png`. Le skill `/prono-recap` est étendu pour générer l'image, écrire `social/<date>.md`, puis committer+pusher. Une routine `/schedule` déclenche le tout à 08:00 Paris.

**Tech Stack:** Python 3 (Pillow), HTML statique, skill Claude Code, routine cron Claude Code.

---

## File Structure

- Create: `scripts/og_card.py` — génère `og.png` depuis le classement (réutilise `score.py`).
- Create: `scripts/requirements.txt` — dépendance Pillow.
- Create: `scripts/test_og_card.py` — test : og.png valide, 1200×630, PNG.
- Create: `og.png` — artefact généré, committé (servi par GitHub Pages).
- Create: `social/.gitkeep` — dossier des textes de post.
- Modify: `index.html` (`<head>`) — balises OG/Twitter.
- Modify: `.claude/skills/prono-recap/SKILL.md` — étapes OG + social + commit/push.
- Operational: routine via `/schedule`.

---

## Task 1: Générateur d'image OG (`scripts/og_card.py`)

**Files:**
- Create: `scripts/requirements.txt`
- Create: `scripts/og_card.py`
- Test: `scripts/test_og_card.py`
- Output: `og.png`

- [ ] **Step 1: Déclarer la dépendance Pillow et l'installer**

Create `scripts/requirements.txt`:

```
Pillow>=10.0
```

Run: `pip3 install -r scripts/requirements.txt`
Expected: `Successfully installed pillow-...` (ou « already satisfied »).

- [ ] **Step 2: Écrire le test (qui échoue)**

Create `scripts/test_og_card.py`:

```python
#!/usr/bin/env python3
"""Test plain-python (pas de pytest) : lancer avec `python3 scripts/test_og_card.py`."""
import os
import subprocess
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "og.png")


def test_og_card_generates_valid_png():
    if os.path.exists(OUT):
        os.remove(OUT)
    subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "og_card.py")], check=True)
    assert os.path.exists(OUT), "og.png n'a pas été créé"
    Image.open(OUT).verify()           # PNG valide
    im = Image.open(OUT)
    assert im.format == "PNG", f"format inattendu: {im.format}"
    assert im.size == (1200, 630), f"taille inattendue: {im.size}"


if __name__ == "__main__":
    test_og_card_generates_valid_png()
    print("OK: og.png valide (1200x630, PNG)")
```

- [ ] **Step 3: Lancer le test → échec attendu**

Run: `python3 scripts/test_og_card.py`
Expected: échec — `subprocess` ne trouve pas `scripts/og_card.py` (FileNotFoundError / CalledProcessError).

- [ ] **Step 4: Implémenter `scripts/og_card.py`**

Create `scripts/og_card.py`:

```python
#!/usr/bin/env python3
"""Génère og.png (1200x630) — carte néo-brutaliste du classement AI Prono Battle.

Réutilise la logique de scoring de score.py (aucune duplication). Tolérant aux pannes :
si Pillow ou une police manque, on lève une exception claire ; le skill décide de continuer.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from score import load, evaluate, AIS, LABEL  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "og.png")

W, H = 1200, 630
INK = (0, 0, 0)
PAPER = (255, 255, 255)
YELLOW = (255, 224, 0)
ACCENT = {"claude": (0, 255, 255), "gpt": (0, 255, 0), "gemini": (255, 0, 255)}

# Polices testées dans l'ordre (Linux CI/cloud, puis macOS), fallback bitmap si rien.
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]


def font(size):
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def main():
    matches, results, _ = load()
    rows, totals = evaluate(matches, results)
    graded = next(iter(totals.values()))["graded"] if totals else 0
    ranking = sorted(list(AIS), key=lambda a: totals[a]["pts"], reverse=True)

    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)

    d.rectangle([8, 8, W - 9, H - 9], outline=INK, width=8)
    d.rectangle([40, 38, 770, 132], fill=YELLOW, outline=INK, width=6)
    d.text((60, 56), "AI PRONO BATTLE", font=font(54), fill=INK)
    d.text((44, 150), f"Coupe du Monde 2026  -  {graded} matchs notes", font=font(28), fill=INK)

    cw, gap, x0, y0, ch = 360, 20, 40, 220, 360
    for i, a in enumerate(ranking):
        x = x0 + i * (cw + gap)
        d.rectangle([x, y0, x + cw, y0 + ch], fill=ACCENT[a], outline=INK, width=6)
        medal = ["1ER", "2E", "3E"][i]
        d.rectangle([x + cw - 116, y0 + 18, x + cw - 18, y0 + 60], fill=INK)
        d.text((x + cw - 104, y0 + 26), medal, font=font(26), fill=PAPER)
        d.text((x + 24, y0 + 74), LABEL[a].upper(), font=font(40), fill=INK)
        d.text((x + 20, y0 + 130), str(totals[a]["pts"]), font=font(130), fill=INK)
        g = totals[a]["graded"]
        pct = round(100 * totals[a]["pts"] / g) if g else 0
        d.text((x + 24, y0 + 296), f"{pct}%  -  {totals[a]['pts']} pts", font=font(26), fill=INK)

    img.save(OUT, "PNG")
    print(f"og.png genere ({W}x{H}) - {graded} matchs notes")


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Lancer le test → succès, puis vérifier l'image à l'œil**

Run: `python3 scripts/test_og_card.py`
Expected: `OK: og.png valide (1200x630, PNG)`

Ouvre `og.png` pour confirmer la lisibilité (3 cartes, points). Si les polices manquent, l'image se génère quand même (rendu basique) — acceptable.

- [ ] **Step 6: Commit**

```bash
git add scripts/og_card.py scripts/requirements.txt scripts/test_og_card.py og.png
git commit -m "feat(og): scripts/og_card.py génère l'image OG du classement (Pillow, réutilise score.py)"
```

---

## Task 2: Balises OG/Twitter dans `index.html`

**Files:**
- Modify: `index.html` (dans `<head>`, après la balise `<meta name="description" …>`)

- [ ] **Step 1: Ajouter le bloc de balises**

Dans `index.html`, repère la ligne :

```html
<meta name="description" content="Claude vs GPT vs Gemini : qui pronostique le mieux la phase de poules de la Coupe du Monde 2026  ? Pronostics figés, 1 point par résultat juste." />
```

Insère **juste après** :

```html
<meta property="og:type" content="website" />
<meta property="og:title" content="AI Prono Battle — Mondial 2026" />
<meta property="og:description" content="Claude vs GPT vs Gemini : qui pronostique le mieux la Coupe du Monde 2026 ? Classement live." />
<meta property="og:url" content="https://newbie974.github.io/world-cup-ia-prono/" />
<meta property="og:image" content="https://newbie974.github.io/world-cup-ia-prono/og.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="AI Prono Battle — Mondial 2026" />
<meta name="twitter:description" content="Claude vs GPT vs Gemini sur la Coupe du Monde 2026. Classement live." />
<meta name="twitter:image" content="https://newbie974.github.io/world-cup-ia-prono/og.png" />
```

- [ ] **Step 2: Vérifier la présence des balises**

Run: `grep -c 'og:image\|twitter:card' index.html`
Expected: `2` ou plus (au moins `og:image` et `twitter:card` présents).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(web): balises OG/Twitter (preview sociale pointant vers og.png)"
```

---

## Task 3: Étendre le skill `/prono-recap` (OG + social + commit/push)

**Files:**
- Create: `social/.gitkeep`
- Modify: `.claude/skills/prono-recap/SKILL.md`

- [ ] **Step 1: Créer le dossier social**

```bash
mkdir -p social && touch social/.gitkeep
```

- [ ] **Step 2: Mettre à jour la liste des fichiers dans SKILL.md**

Dans `.claude/skills/prono-recap/SKILL.md`, sous `## Fichiers`, ajoute après la ligne `index.html` :

```markdown
- `scripts/og_card.py` — régénère `og.png` (carte du classement) ; lit predictions+results.
- `social/AAAA-MM-JJ.md` — texte de post prêt à publier (écrit à chaque run avec du nouveau).
```

- [ ] **Step 3: Remplacer les étapes 5–7 de la procédure**

Dans `SKILL.md`, remplace l'étape `5.` actuelle et la suite par :

```markdown
5. **Recalculer + récap.** Lancer :
   ```
   python3 scripts/score.py --date <AAAA-MM-JJ>
   ```
   Coller la sortie Markdown dans `recaps/<AAAA-MM-JJ>.md` + 2-3 phrases d'analyse.

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
```

- [ ] **Step 4: Vérifier la cohérence du skill**

Run: `grep -nE "og_card|social/|git push|git commit" .claude/skills/prono-recap/SKILL.md`
Expected: les lignes des étapes 6, 7 et 8 apparaissent.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/prono-recap/SKILL.md social/.gitkeep
git commit -m "feat(skill): /prono-recap génère OG + texte social et push automatiquement"
```

---

## Task 4: Planifier la routine quotidienne (opérationnel)

**Files:** aucun fichier — création d'une routine cloud Claude Code via `/schedule`.

- [ ] **Step 1: Pré-vérifier le push depuis l'environnement**

Avant de planifier, confirmer que la routine cloud pourra pousser sur
`newBie974/world-cup-ia-prono` (auth GitHub côté routine). Si le push n'est pas possible :
repli documenté dans la spec (GitHub Action ou push manuel) — s'arrêter et le signaler à l'utilisateur.

- [ ] **Step 2: Créer la routine**

Invoquer le skill `/schedule` avec la demande :

> Crée une routine quotidienne à **06:00 UTC** (08:00 Paris, cron `0 6 * * *`) qui exécute le skill `/prono-recap` sur le repo `world-cup-ia-prono`.

- [ ] **Step 3: Déclencher un run de test**

Lancer la routine une fois manuellement (via `/schedule` run-now si dispo, ou attendre le
premier déclenchement). Vérifier dans le repo distant qu'un commit « data: maj résultats … »
apparaît les jours avec matchs terminés, et qu'`og.png` + `social/<date>.md` sont mis à jour.

- [ ] **Step 4: Confirmer à l'utilisateur**

Indiquer : routine créée, prochaine exécution prévue, et comment l'arrêter/modifier (`/schedule`).

---

## Notes de vérification finale

- **Idempotence** : un run sans nouveau match ne produit aucun commit (étape 8 du skill).
- **Image OG en cache** : les scrapers sociaux peuvent afficher une version un peu décalée ; OK.
- **Pas d'auto-publication** : `social/<date>.md` est un asset à copier-coller, rien n'est posté.
