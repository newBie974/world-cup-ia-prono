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
    matches, results, bracket, _ = load()
    group_rows, bracket_rows, totals = evaluate(matches, results, bracket)
    graded = len(group_rows) + len(bracket_rows)
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
        poss = totals[a]["possible"]
        # arrondi demi-vers-le-haut, identique à Math.round() du dashboard JS
        pct = int(100 * totals[a]["pts"] / poss + 0.5) if poss else 0
        d.text((x + 24, y0 + 296), f"{pct}%  -  {totals[a]['pts']} pts", font=font(26), fill=INK)

    img.save(OUT, "PNG")
    print(f"og.png genere ({W}x{H}) - {graded} matchs notes")


if __name__ == "__main__":
    main()
