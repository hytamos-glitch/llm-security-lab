"""Sons supplémentaires pour le montage, et copie WAV des enregistrements CC0 du kit.

    python simulation/sons_extra.py <kit teardown> <dossier sons>
"""
import os
import shutil
import subprocess
import sys

sys.path.insert(0, sys.argv[1])

from sfx.mix import Mix  # noqa: E402
from sfx.score_kit import beep, hz, thud  # noqa: E402
from sfx.synth import chime, click, impact, riser, whoosh  # noqa: E402

KIT, OUT = sys.argv[1], sys.argv[2]


def casse(m):
    """Le 5/5 qui se casse."""
    m.put(0.0, impact(0.9), 0.6)
    for i, t in enumerate((0.02, 0.07, 0.13, 0.22)):
        m.put(t, click(2600 - i * 450, 0.03), 0.42)


def montee(m):
    """Monte vers le chiffre : à finir exactement sur le silence."""
    m.put(0.0, riser(2.4), 0.45)


def chiffre(m):
    """Le chiffre 23/30 → 1/30 apparaît."""
    m.put(0.0, thud(82, 0.14, 0.5), 0.6)
    m.put(0.03, chime([hz("E4"), hz("B4"), hz("E5")], 2.0, 0.8), 0.32)


def whoosh_court(m):
    m.put(0.0, whoosh(0.35, 500, 4200, 0.5), 0.5)


def scan(m):
    """L'IPS ou le contrôle final inspecte le contenu."""
    for i in range(6):
        m.put(i * 0.11, beep(1100 + i * 90, 0.05, 0.8), 0.16)


def erreur(m):
    """Un test échoue dans le tableau."""
    m.put(0.0, beep(hz("D4"), 0.1, 1.0), 0.3)
    m.put(0.13, beep(hz("A3"), 0.18, 1.0), 0.3)


def validation(m):
    """Une barrière tient, un test passe."""
    m.put(0.0, beep(hz("B5"), 0.08, 1.0), 0.2)
    m.put(0.09, beep(hz("E6"), 0.14, 1.0), 0.2)


SONS = [("casse_5sur5", casse, 1.2, -15), ("montee_vers_chiffre", montee, 2.6, -18), ("chiffre_reveal", chiffre, 2.4, -15),
        ("whoosh_court", whoosh_court, 0.5, -18), ("scan_controle", scan, 0.9, -20), ("erreur_test", erreur, 0.5, -18),
        ("validation_test", validation, 0.4, -18)]
for name, build, dur, lufs in SONS:
    mix = Mix(dur, seed=11)
    build(mix)
    mix.master(target_lufs=lufs, ceiling_db=-3.0, fade_out=0.04)
    mix.write(os.path.join(OUT, f"{name}.wav"))

SAMPLES = os.path.join(KIT, "sfx", "samples")
CC0 = os.path.join(OUT, "cc0_enregistres")
os.makedirs(CC0, exist_ok=True)
for f in sorted(os.listdir(SAMPLES)):
    if f.endswith(".ogg"):
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(SAMPLES, f), "-ar", "48000", os.path.join(CC0, f[:-4] + ".wav")], check=True)
shutil.copy(os.path.join(SAMPLES, "SOURCES.md"), os.path.join(CC0, "SOURCES.md"))
print("ok")
