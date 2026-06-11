#!/usr/bin/env python3
"""Scoring déterministe du AI Prono Battle (Mondial 2026, phase de poules).

Lit data/predictions.json + data/results.json, calcule le classement cumulé
des 3 IA (1 pt par résultat juste : vainqueur OU nul correctement prédit) et
imprime un rapport Markdown sur stdout.

Usage:
    python3 scripts/score.py              # classement général
    python3 scripts/score.py --date 2026-06-12   # + focus sur les matchs de ce jour
"""
import argparse
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PRED = ROOT / "data" / "predictions.json"
RES = ROOT / "data" / "results.json"
AIS = ["claude", "gpt", "gemini"]
LABEL = {"claude": "Claude", "gpt": "GPT", "gemini": "Gemini"}


def load():
    pred = json.loads(PRED.read_text(encoding="utf-8"))
    res = json.loads(RES.read_text(encoding="utf-8"))
    matches = {str(m["id"]): m for m in pred["matches"]}
    results = res.get("results", {})
    return matches, results, res.get("last_updated")


def evaluate(matches, results):
    """Retourne (rows, totals). rows = liste de matchs notés, triés par id."""
    rows = []
    totals = {ai: {"pts": 0, "graded": 0} for ai in AIS}
    for mid, actual in sorted(results.items(), key=lambda kv: int(kv[0])):
        m = matches.get(mid)
        if not m:
            print(f"⚠️  Résultat pour match inconnu id={mid}", file=sys.stderr)
            continue
        winner = actual["winner"]
        row = {
            "id": int(mid),
            "group": m["group"],
            "label": f'{m["home"]} – {m["away"]}',
            "score": actual.get("score", ""),
            "winner": winner,
            "hits": {},
        }
        for ai in AIS:
            hit = m["pred"][ai] == winner
            row["hits"][ai] = hit
            totals[ai]["pts"] += int(hit)
            totals[ai]["graded"] += 1
        rows.append(row)
    return rows, totals


def render(rows, totals, last_updated, focus_date, matches):
    out = []
    out.append("# 🏆 AI Prono Battle — Classement\n")
    if last_updated:
        out.append(f"_Dernière mise à jour : {last_updated}_\n")

    graded = next(iter(totals.values()))["graded"] if totals else 0
    ranking = sorted(AIS, key=lambda a: totals[a]["pts"], reverse=True)
    out.append(f"## Classement général ({graded} matchs notés)\n")
    out.append("| # | IA | Points | Réussite |")
    out.append("|---|---|---|---|")
    for i, ai in enumerate(ranking, 1):
        g = totals[ai]["graded"]
        pct = f'{100 * totals[ai]["pts"] / g:.0f}%' if g else "—"
        medal = ["🥇", "🥈", "🥉"][i - 1] if i <= 3 else ""
        out.append(f'| {medal}{i} | {LABEL[ai]} | {totals[ai]["pts"]} | {pct} |')
    out.append("")

    if focus_date:
        day_rows = [r for r in rows if matches[str(r["id"])]["date"] == focus_date]
        out.append(f"## Focus du {focus_date} ({len(day_rows)} matchs)\n")
        if day_rows:
            out.append("| Match | Résultat | Claude | GPT | Gemini |")
            out.append("|---|---|---|---|---|")
            for r in day_rows:
                sc = f' ({r["score"]})' if r["score"] else ""
                cells = ["✅" if r["hits"][ai] else "❌" for ai in AIS]
                out.append(
                    f'| {r["label"]} | **{r["winner"]}**{sc} | {cells[0]} | {cells[1]} | {cells[2]} |'
                )
        else:
            out.append("_Aucun résultat enregistré pour cette date._")
        out.append("")

    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", help="Date YYYY-MM-DD pour le focus du jour")
    ap.add_argument(
        "--pending",
        metavar="YYYY-MM-DD",
        help="Liste les matchs dont la date <= valeur et sans résultat enregistré (JSON).",
    )
    args = ap.parse_args()
    matches, results, last_updated = load()

    if args.pending:
        pend = [
            {
                "id": m["id"],
                "group": m["group"],
                "date": m["date"],
                "match": f'{m["home"]} – {m["away"]}',
            }
            for m in matches.values()
            if m["date"] <= args.pending and str(m["id"]) not in results
        ]
        pend.sort(key=lambda x: (x["date"], x["id"]))
        print(json.dumps(pend, ensure_ascii=False, indent=2))
        return

    rows, totals = evaluate(matches, results)
    print(render(rows, totals, last_updated, args.date, matches))


if __name__ == "__main__":
    main()
