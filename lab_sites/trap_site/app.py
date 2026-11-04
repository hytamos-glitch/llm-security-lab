"""Site PIÉGÉ du lab — page contrôlée par un "attaquant". Port 8082.

SEMAINE 1 (baseline) : la page est volontairement BÉNIGNE.
C'est en SEMAINE 2 qu'on y étudiera l'injection indirecte (instructions
cachées dans le contenu que l'assistant lit). Le point d'insertion est
marqué dans le template par un commentaire, pour garder le lab propre et
reproductible. Aucun payload offensif n'est livré ici.
"""
from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/invoice/INV-9001")
def invoice():
    return render_template("invoice.html")


@app.route("/invoice/INV-9002")
def invoice_visible():
    return render_template("invoice_visible.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8082)
