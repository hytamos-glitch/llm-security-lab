"""Sons de scène séparés pour le montage, synthétisés avec le kit du skill teardown.

    python simulation/sons.py <kit teardown> <dossier de sortie>
"""
import os
import sys

sys.path.insert(0, sys.argv[1])

from sfx.mix import Mix  # noqa: E402
from sfx.score_kit import airy, beep, hz, thud  # noqa: E402
from sfx.synth import chime, click, impact, pad, pop, whoosh  # noqa: E402

OUT = sys.argv[2]
E_MAJ = [hz("E4"), hz("G#4"), hz("B4"), hz("E5")]


def clic(m):
    m.put(0.02, click(2400, 0.03), 0.5)


def frappe(m):
    m.typing(0.05, 2.9, 34)


def tic(m):
    m.put(0.02, click(3200, 0.02), 0.45)
    m.put(0.02, beep(1400, 0.05, 0.5), 0.14)


def transition(m):
    m.put(0.0, whoosh(0.8, 300, 3200, 0.55), 0.5)


def alerte(m):
    m.put(0.0, beep(hz("A5"), 0.13, 1.0), 0.28)
    m.put(0.2, beep(hz("F5"), 0.2, 1.0), 0.28)
    m.put(0.2, airy(0.9, 300, 1100, 0.7), 0.05)


def virement(m):
    m.put(0.0, impact(1.4), 0.75)
    m.put(0.02, thud(70, 0.16, 0.6), 0.4)


def blocage(m):
    m.put(0.0, click(900, 0.04), 0.7)
    m.put(0.02, thud(135, 0.05, 0.25), 0.55)
    m.put(0.05, pop(620, 240, 0.16), 0.2)


def confirmation(m):
    m.put(0.0, pop(520, 780, 0.12), 0.32)
    m.put(0.16, pop(780, 1040, 0.14), 0.32)
    m.put(0.3, click(1900, 0.03), 0.3)


def bilan(m):
    m.put(0.0, chime(E_MAJ, 2.6, 0.95), 0.5)


def nappe(m):
    left, right = pad(20.0, [(0.0, [hz("E2"), hz("B2"), hz("E3"), hz("G3")]), (10.0, [hz("C2"), hz("G2"), hz("C3"), hz("E3")])])
    m.put_stereo(0.0, left, right, 0.35)


SONS = [
    ("clic_ui", clic, 0.3, -18), ("frappe_clavier", frappe, 3.2, -18), ("paquet_tic", tic, 0.3, -20),
    ("whoosh_transition", transition, 1.0, -18), ("alerte_injection", alerte, 1.4, -16),
    ("virement_impact", virement, 1.8, -14), ("blocage_garde_fou", blocage, 0.7, -16),
    ("confirmation_requise", confirmation, 0.8, -18), ("bilan_chime", bilan, 3.0, -16),
    ("nappe_tension", nappe, 20.0, -26),
]
os.makedirs(OUT, exist_ok=True)
for name, build, dur, lufs in SONS:
    mix = Mix(dur, seed=7)
    build(mix)
    mix.master(target_lufs=lufs, ceiling_db=-3.0, fade_out=0.04)
    mix.write(os.path.join(OUT, f"{name}.wav"))
    print(name)
