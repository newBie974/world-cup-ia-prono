#!/usr/bin/env python3
"""Scoring déterministe du AI Prono Battle (Mondial 2026).

Couvre la phase de poules ET la phase finale (bracket) :
- Poules  : data/predictions.json + data/results.json — 1 pt par résultat juste.
- Finale  : data/bracket.json — barème enrichi, jusqu'à 3 pts par match :
    +1 bonne équipe qualifiée, +1 score exact (temps régl./prolong.),
    +1 BONUS si l'IA annonce une séance de tirs au but qui a effectivement lieu.

Le classement est cumulé sur les deux phases. La « réussite » est le pourcentage des
points POSSIBLES réellement gagnés (1 par match de poule ; 2 par match de finale, 3 s'il y a TAB).

Usage:
    python3 scripts/score.py                      # classement général
    python3 scripts/score.py --date 2026-06-12    # + focus poules de ce jour
    python3 scripts/score.py --round r32          # + focus d'un tour de phase finale
    python3 scripts/score.py --pending 2026-06-28 # matchs à noter (poules + finale), JSON
"""
import argparse
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PRED = ROOT / "data" / "predictions.json"
RES = ROOT / "data" / "results.json"
BRACKET = ROOT / "data" / "bracket.json"
AIS = ["claude", "gpt", "gemini"]
LABEL = {"claude": "Claude", "gpt": "GPT", "gemini": "Gemini"}
ROUND_LABEL = {"r32": "32es de finale", "r16": "16es de finale", "qf": "Quarts de finale",
               "sf": "Demi-finales", "third": "Match 3e place", "final": "Finale"}


def load():
    pred = json.loads(PRED.read_text(encoding="utf-8"))
    res = json.loads(RES.read_text(encoding="utf-8"))
    matches = {str(m["id"]): m for m in pred["matches"]}
    results = res.get("results", {})
    bracket, bracket_updated = [], None
    if BRACKET.exists():
        bj = json.loads(BRACKET.read_text(encoding="utf-8"))
        bracket = bj.get("matches", [])
        bracket_updated = bj.get("last_updated")
    last = max(x for x in (res.get("last_updated"), bracket_updated) if x) if (res.get("last_updated") or bracket_updated) else None
    return matches, results, bracket, last


def _pred_of(raw):
    """Normalise un prono bracket en {team, score, tab} (tolère l'ancien format string)."""
    if raw is None:
        return None
    if isinstance(raw, str):
        return {"team": raw, "score": None, "tab": None}
    return {"team": raw.get("team"), "score": raw.get("score"), "tab": raw.get("tab")}


def bracket_points(pred, m):
    """Barème phase finale : +1 qualifié, +1 score exact, +1 BONUS si l'IA annonce les
    tirs au but (tab=True) et qu'ils ont bien lieu. Annoncer « pas de TAB » ne rapporte rien.
    Max 3 (2 s'il n'y a pas de séance)."""
    pts = 0
    if pred.get("team") and pred["team"] == m.get("winner"):
        pts += 1
    if pred.get("score") and m.get("score") and pred["score"] == m["score"]:
        pts += 1
    if pred.get("tab") and m.get("tab"):
        pts += 1
    return pts


def evaluate(matches, results, bracket):
    """Retourne (group_rows, bracket_rows, totals).

    totals[ai] = {pts, graded (matchs notés), possible (points en jeu)}.
    """
    totals = {ai: {"pts": 0, "graded": 0, "possible": 0} for ai in AIS}

    group_rows = []
    for mid, actual in sorted(results.items(), key=lambda kv: int(kv[0])):
        m = matches.get(mid)
        if not m:
            print(f"⚠️  Résultat pour match inconnu id={mid}", file=sys.stderr)
            continue
        winner = actual["winner"]
        row = {"id": int(mid), "group": m["group"], "label": f'{m["home"]} – {m["away"]}',
               "score": actual.get("score", ""), "winner": winner, "hits": {}}
        for ai in AIS:
            hit = m["pred"][ai] == winner
            row["hits"][ai] = hit
            totals[ai]["pts"] += int(hit)
            totals[ai]["graded"] += 1
            totals[ai]["possible"] += 1
        group_rows.append(row)

    bracket_rows = []
    for m in bracket:
        if not m.get("winner"):
            continue
        row = {"id": m["id"], "round": m["round"], "label": f'{m["home"]} – {m["away"]}',
               "winner": m["winner"], "score": m.get("score", ""), "tab": m.get("tab"),
               "pens": m.get("pens"), "pts": {}}
        for ai in AIS:
            pred = _pred_of((m.get("pred") or {}).get(ai))
            if pred is None:
                row["pts"][ai] = None
                continue
            pts = bracket_points(pred, m)
            row["pts"][ai] = pts
            totals[ai]["pts"] += pts
            totals[ai]["graded"] += 1
            totals[ai]["possible"] += 3 if m.get("tab") else 2  # point TAB en jeu seulement s'il y a séance
        bracket_rows.append(row)

    return group_rows, bracket_rows, totals


def render(group_rows, bracket_rows, totals, last_updated, focus_date, focus_round, matches):
    out = []
    out.append("# 🏆 AI Prono Battle — Classement\n")
    if last_updated:
        out.append(f"_Dernière mise à jour : {last_updated}_\n")

    graded = sum(1 for _ in group_rows) + sum(1 for _ in bracket_rows)
    ranking = sorted(AIS, key=lambda a: totals[a]["pts"], reverse=True)
    out.append(f"## Classement général ({graded} matchs notés)\n")
    out.append("| # | IA | Points | Réussite |")
    out.append("|---|---|---|---|")
    for i, ai in enumerate(ranking, 1):
        poss = totals[ai]["possible"]
        # arrondi demi-vers-le-haut, identique à Math.round() du dashboard JS
        pct = f'{int(100 * totals[ai]["pts"] / poss + 0.5)}%' if poss else "—"
        medal = ["🥇", "🥈", "🥉"][i - 1] if i <= 3 else ""
        out.append(f'| {medal}{i} | {LABEL[ai]} | {totals[ai]["pts"]} | {pct} |')
    out.append("")

    if focus_date:
        day_rows = [r for r in group_rows if matches[str(r["id"])]["date"] == focus_date]
        out.append(f"## Focus du {focus_date} ({len(day_rows)} matchs)\n")
        if day_rows:
            out.append("| Match | Résultat | Claude | GPT | Gemini |")
            out.append("|---|---|---|---|---|")
            for r in day_rows:
                sc = f' ({r["score"]})' if r["score"] else ""
                cells = ["✅" if r["hits"][ai] else "❌" for ai in AIS]
                out.append(f'| {r["label"]} | **{r["winner"]}**{sc} | {cells[0]} | {cells[1]} | {cells[2]} |')
        else:
            out.append("_Aucun résultat enregistré pour cette date._")
        out.append("")

    if focus_round:
        rnd_rows = [r for r in bracket_rows if r["round"] == focus_round]
        title = ROUND_LABEL.get(focus_round, focus_round)
        out.append(f"## Focus {title} ({len(rnd_rows)} matchs · +1 qualifié / +1 score / +1 TAB annoncé)\n")
        if rnd_rows:
            out.append("| Match | Résultat | Claude | GPT | Gemini |")
            out.append("|---|---|---|---|---|")
            for r in rnd_rows:
                sc = f' ({r["score"]}{" tab " + r["pens"] if r["tab"] and r["pens"] else (" tab" if r["tab"] else "")})' if r["score"] else ""
                cells = [("—" if r["pts"][ai] is None else f'+{r["pts"][ai]}') for ai in AIS]
                out.append(f'| {r["label"]} | **{r["winner"]}**{sc} | {cells[0]} | {cells[1]} | {cells[2]} |')
        else:
            out.append("_Aucun résultat enregistré pour ce tour._")
        out.append("")

    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", help="Date YYYY-MM-DD pour le focus poules du jour")
    ap.add_argument("--round", help="Tour de phase finale pour le focus (r32, r16, qf, sf, third, final)")
    ap.add_argument(
        "--pending",
        metavar="YYYY-MM-DD",
        help="Matchs à noter (JSON) : poules joués (date <= valeur) + matchs de phase finale "
             "dont l'affiche est connue mais le résultat manquant.",
    )
    args = ap.parse_args()
    matches, results, bracket, last_updated = load()

    if args.pending:
        pend = [
            {"phase": "poules", "id": m["id"], "group": m["group"], "date": m["date"],
             "match": f'{m["home"]} – {m["away"]}'}
            for m in matches.values()
            if m["date"] <= args.pending and str(m["id"]) not in results
        ]
        pend.sort(key=lambda x: (x["date"], x["id"]))
        # Phase finale : affiche connue (home + away) et pas encore de vainqueur.
        bpend = [
            {"phase": "finale", "id": m["id"], "round": m["round"],
             "round_label": ROUND_LABEL.get(m["round"], m["round"]),
             "match": f'{m["home"]} – {m["away"]}'}
            for m in bracket
            if m.get("home") and m.get("away") and not m.get("winner")
        ]
        print(json.dumps(pend + bpend, ensure_ascii=False, indent=2))
        return

    group_rows, bracket_rows, totals = evaluate(matches, results, bracket)
    print(render(group_rows, bracket_rows, totals, last_updated, args.date, args.round, matches))


if __name__ == "__main__":
    main()
