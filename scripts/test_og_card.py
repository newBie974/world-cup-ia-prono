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
    Image.open(OUT).verify()
    im = Image.open(OUT)
    assert im.format == "PNG", f"format inattendu: {im.format}"
    assert im.size == (1200, 630), f"taille inattendue: {im.size}"


if __name__ == "__main__":
    test_og_card_generates_valid_png()
    print("OK: og.png valide (1200x630, PNG)")
