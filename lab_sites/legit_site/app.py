"""Site LÉGITIME du lab — un marchand qui publie une facture en ligne.

L'assistant Finora peut lire cette page via l'outil fetch_url.
Contenu normal, sans piège. Port 8081.
"""
from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/invoice/INV-2048")
def invoice():
    return render_template("invoice.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8081)
