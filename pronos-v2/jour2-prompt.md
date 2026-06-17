# 🎯 AI Prono Battle — Pronostics de la Journée 2 (révision mi-parcours)

> Copie-colle l'intégralité de ce message à chaque IA (Claude, GPT, Gemini). Le prompt est **identique pour les trois**, pour que la comparaison reste équitable.

---

## Contexte

Tu participes à un défi de pronostics sur la **phase de poules de la Coupe du Monde 2026** (format à 48 équipes, 12 groupes de 4, 3 journées). En début de compétition, tu avais pronostiqué tous les matchs « à l'aveugle », sans aucun résultat connu.

La **journée 1 des poules** vient de se jouer. Voici les vrais résultats. On te **redonne une chance** : tu peux **réviser tes pronostics pour la journée 2**, en tenant compte des résultats réels et des tendances que tu observes (forme des équipes, surprises, écarts de niveau, dynamique de chaque groupe).

## Règle de scoring

- Pour **chaque match**, tu prédis soit le **vainqueur**, soit un **match nul**.
- **1 point** par pronostic correct (bon vainqueur OU nul correctement prédit).
- Pas de bonus pour le score exact : seul le résultat (1/N/2) compte.

---

## ✅ Résultats de la Journée 1 (groupes A → J)

Format : `Domicile  score  Extérieur` → vainqueur. Classement du groupe indiqué après les deux matchs.

**Groupe A**
- Mexique **2–0** Afrique du Sud → 🏆 Mexique
- Corée du Sud **2–1** Tchéquie → 🏆 Corée du Sud
- *Classement : Mexique 3 pts · Corée du Sud 3 · Tchéquie 0 · Afrique du Sud 0*

**Groupe B**
- Canada **1–1** Bosnie → 🤝 Nul
- Qatar **1–1** Suisse → 🤝 Nul
- *Classement : Canada 1 · Bosnie 1 · Qatar 1 · Suisse 1*

**Groupe C**
- Brésil **1–1** Maroc → 🤝 Nul
- Haïti **0–1** Écosse → 🏆 Écosse
- *Classement : Écosse 3 · Brésil 1 · Maroc 1 · Haïti 0*

**Groupe D**
- États-Unis **4–1** Paraguay → 🏆 États-Unis
- Australie **2–0** Turquie → 🏆 Australie
- *Classement : États-Unis 3 · Australie 3 · Turquie 0 · Paraguay 0*

**Groupe E**
- Allemagne **7–1** Curaçao → 🏆 Allemagne
- Côte d'Ivoire **1–0** Équateur → 🏆 Côte d'Ivoire
- *Classement : Allemagne 3 · Côte d'Ivoire 3 · Équateur 0 · Curaçao 0*

**Groupe F**
- Pays-Bas **2–2** Japon → 🤝 Nul
- Suède **5–1** Tunisie → 🏆 Suède
- *Classement : Suède 3 · Pays-Bas 1 · Japon 1 · Tunisie 0*

**Groupe G**
- Belgique **1–1** Égypte → 🤝 Nul
- Iran **2–2** Nouvelle-Zélande → 🤝 Nul
- *Classement : Belgique 1 · Égypte 1 · Iran 1 · Nouvelle-Zélande 1*

**Groupe H**
- Espagne **0–0** Cap-Vert → 🤝 Nul
- Arabie saoudite **1–1** Uruguay → 🤝 Nul
- *Classement : Espagne 1 · Cap-Vert 1 · Arabie saoudite 1 · Uruguay 1*

**Groupe I**
- France **3–1** Sénégal → 🏆 France
- Irak **1–4** Norvège → 🏆 Norvège
- *Classement : France 3 · Norvège 3 · Sénégal 0 · Irak 0*

**Groupe J**
- Argentine **3–0** Algérie → 🏆 Argentine
- Autriche **1–1** Jordanie → 🤝 Nul
- *Classement : Argentine 3 · Autriche 1 · Jordanie 1 · Algérie 0*

> ℹ️ Les groupes **K et L** n'ont pas encore disputé leur journée 1 au moment de ce prompt : tu pronostiques leurs matchs de journée 2 sans résultats préalables (comme à l'aveugle).

---

## 🎯 Matchs à pronostiquer — Journée 2 (24 matchs, et UNIQUEMENT ceux-ci)

Tu dois donner un pronostic pour **chacun** de ces 24 matchs (et aucun autre).

| ID | Date | Match |
|----|------|-------|
| 3  | 18/06 | Tchéquie – Afrique du Sud |
| 4  | 18/06 | Mexique – Corée du Sud |
| 9  | 18/06 | Suisse – Bosnie |
| 10 | 18/06 | Canada – Qatar |
| 15 | 19/06 | Écosse – Maroc |
| 16 | 19/06 | Brésil – Haïti |
| 21 | 19/06 | États-Unis – Australie |
| 22 | 19/06 | Turquie – Paraguay |
| 27 | 20/06 | Allemagne – Côte d'Ivoire |
| 28 | 20/06 | Équateur – Curaçao |
| 33 | 20/06 | Pays-Bas – Suède |
| 34 | 20/06 | Tunisie – Japon |
| 39 | 21/06 | Belgique – Iran |
| 40 | 21/06 | Nouvelle-Zélande – Égypte |
| 45 | 21/06 | Espagne – Arabie saoudite |
| 46 | 21/06 | Uruguay – Cap-Vert |
| 51 | 22/06 | France – Irak |
| 52 | 22/06 | Norvège – Sénégal |
| 57 | 22/06 | Argentine – Autriche |
| 58 | 22/06 | Jordanie – Algérie |
| 63 | 23/06 | Portugal – Ouzbékistan |
| 64 | 23/06 | Colombie – RD Congo |
| 69 | 23/06 | Angleterre – Ghana |
| 70 | 23/06 | Panama – Croatie |

---

## 📤 Format de réponse attendu

1. **D'abord**, un bloc JSON (et rien d'autre dedans), avec l'**ID du match en clé** et ton pronostic en valeur. La valeur est soit le **nom exact de l'équipe gagnante**, soit `"Nul"`.

```json
{
  "3": "...", "4": "...", "9": "...", "10": "...", "15": "...", "16": "...",
  "21": "...", "22": "...", "27": "...", "28": "...", "33": "...", "34": "...",
  "39": "...", "40": "...", "45": "...", "46": "...", "51": "...", "52": "...",
  "57": "...", "58": "...", "63": "...", "64": "...", "69": "...", "70": "..."
}
```

2. **Ensuite**, une courte justification (1 phrase par groupe max) expliquant ce que tu as ajusté par rapport à un pronostic « à l'aveugle » et pourquoi.

### ⚠️ Orthographe canonique imposée (à respecter à la lettre dans le JSON)

Utilise EXACTEMENT ces noms (sinon le pronostic ne sera pas comptabilisé) :

`Afrique du Sud`, `Algérie`, `Allemagne`, `Angleterre`, `Arabie saoudite`, `Argentine`, `Australie`, `Autriche`, `Belgique`, `Bosnie`, `Brésil`, `Canada`, `Cap-Vert`, `Colombie`, `Corée du Sud`, `Côte d'Ivoire`, `Croatie`, `Curaçao`, `Écosse`, `Égypte`, `Équateur`, `Espagne`, `États-Unis`, `France`, `Ghana`, `Haïti`, `Irak`, `Iran`, `Japon`, `Jordanie`, `Maroc`, `Mexique`, `Norvège`, `Nouvelle-Zélande`, `Ouzbékistan`, `Panama`, `Paraguay`, `Pays-Bas`, `Portugal`, `Qatar`, `RD Congo`, `Sénégal`, `Suède`, `Suisse`, `Tchéquie`, `Tunisie`, `Uruguay`, `Nul`
