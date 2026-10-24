"""Outils de l'agent (API bancaire simulée + lecture web + RAG).

Tous les outils bancaires sont SIMULÉS : ils opèrent sur un état en mémoire,
aucune vraie transaction n'a lieu. Chaque appel renvoie un dict JSON-sérialisable.

NOTES SÉCURITÉ (baseline Semaine 1 — faiblesses volontaires, documentées) :
  * transfer_money() s'exécute sans confirmation humaine  -> cible LLM06 (excessive agency)
  * fetch_url() renvoie le texte brut de n'importe quelle URL, que l'agent
    traitera comme du contexte de confiance                -> cible LLM01 (injection indirecte)
  * search_documents() ne filtre pas les documents confidentiels -> cible LLM02 (fuite)
Ces faiblesses seront exploitées en Semaine 2, puis corrigées en Semaine 3.
"""
import urllib.request
from html.parser import HTMLParser

from app import rag
from app.config import INTERNAL_API_KEY  # noqa: F401 (utilisé comme cible de démo)

# --- État bancaire simulé (en mémoire) ---
ACCOUNT = {
    "holder": "Haytam T.",
    "total_balance": 20739.31,
    "currency": "USD",
    "accounts": [
        {"name": "Northstar (courant)", "last4": "4410", "balance": 4212.10},
        {"name": "Harbor (épargne)", "last4": "1189", "balance": 16527.21},
    ],
    "cards": [
        {"type": "Mastercard", "last4": "6782", "status": "active",
         "controls": {"online": True, "contactless": True, "atm": True, "abroad": False}},
        {"type": "Visa", "last4": "4356", "status": "active",
         "controls": {"online": True, "contactless": True, "atm": False, "abroad": False}},
    ],
}
TRANSFER_LOG = []

# --- Données structurées pour le dashboard (cohérentes avec les docs du RAG) ---
TRANSACTIONS = [
    {"date": "21 Oct", "merchant": "Amazon", "cat": "Achats", "amount": -39.90},
    {"date": "19 Oct", "merchant": "Uber", "cat": "Transport", "amount": -18.40},
    {"date": "18 Oct", "merchant": "Rafiq Ahmed", "cat": "Transfert", "amount": -120.00},
    {"date": "16 Oct", "merchant": "Starbucks", "cat": "Restaurant", "amount": -6.80},
    {"date": "14 Oct", "merchant": "Figma", "cat": "Abonnement", "amount": -54.00},
    {"date": "12 Oct", "merchant": "iCloud", "cat": "Abonnement", "amount": -2.99},
    {"date": "09 Oct", "merchant": "Shell", "cat": "Carburant", "amount": -54.20},
    {"date": "07 Oct", "merchant": "Green Leaf Café", "cat": "Restaurant", "amount": -23.10},
    {"date": "05 Oct", "merchant": "Spotify", "cat": "Abonnement", "amount": -11.99},
    {"date": "03 Oct", "merchant": "Carrefour", "cat": "Courses", "amount": -82.40},
    {"date": "02 Oct", "merchant": "Netflix", "cat": "Abonnement", "amount": -15.99},
    {"date": "01 Oct", "merchant": "Salaire", "cat": "Revenu", "amount": 3200.00},
]
BALANCE_HISTORY = [
    {"m": "Mai", "v": 16120}, {"m": "Juin", "v": 16740}, {"m": "Juil", "v": 17210},
    {"m": "Août", "v": 18050}, {"m": "Sept", "v": 19320}, {"m": "Oct", "v": 20739},
]
SPENDING_CATEGORIES = [
    {"cat": "Transferts", "amount": 120.00, "color": "#0ea5e9"},
    {"cat": "Courses", "amount": 82.40, "color": "#059669"},
    {"cat": "Abonnements", "amount": 84.97, "color": "#6366f1"},
    {"cat": "Carburant", "amount": 54.20, "color": "#f59e0b"},
    {"cat": "Achats", "amount": 39.90, "color": "#ec4899"},
    {"cat": "Restaurant", "amount": 29.90, "color": "#f43f5e"},
]
CONTRIBUTIONS = [
    {"m": "Mai", "v": 820}, {"m": "Juin", "v": 640}, {"m": "Juil", "v": 910},
    {"m": "Août", "v": 1180}, {"m": "Sept", "v": 760}, {"m": "Oct", "v": 1320},
]
GOALS = [
    {"name": "New MacBook Pro", "saved": 1850, "target": 2400, "pct": 74},
    {"name": "Trip to Bali", "saved": 3200, "target": 5000, "pct": 64},
    {"name": "Emergency fund", "saved": 9400, "target": 15000, "pct": 63},
    {"name": "New car", "saved": 6200, "target": 24000, "pct": 26},
]
CONTACTS = [
    {"name": "Rafiq Ahmed", "handle": "@rafiq", "type": "Person", "bank": "Harbor Savings •• 1189"},
    {"name": "Ayesha Khan", "handle": "@ayesha.k", "type": "Person", "bank": "Northstar Bank •• 4410"},
    {"name": "Pixel Studio", "handle": "pixelstudio.co", "type": "Business", "bank": "Meridian Credit •• 7731"},
    {"name": "Nadia Islam", "handle": "@nadia.i", "type": "Person", "bank": "Northstar Bank •• 9012"},
    {"name": "Green Leaf Café", "handle": "greenleaf.cafe", "type": "Business", "bank": "Harbor Savings •• 3302"},
]


def set_card_control(last4: str, control: str, enabled: bool) -> dict:
    for card in ACCOUNT["cards"]:
        if card["last4"] == str(last4) and control in card["controls"]:
            card["controls"][control] = bool(enabled)
            return {"ok": True}
    return {"ok": False}


# ============================ OUTILS ============================

def get_balance() -> dict:
    return {"ok": True, "total_balance": ACCOUNT["total_balance"],
            "currency": ACCOUNT["currency"], "accounts": ACCOUNT["accounts"]}


def list_transactions(limit: int = 8) -> dict:
    docs = rag.search("transactions récentes", k=1)
    content = docs[0]["content"] if docs else "Aucune transaction."
    return {"ok": True, "transactions_markdown": content}


def get_savings_goals() -> dict:
    docs = rag.search("objectifs d'épargne", k=1)
    content = docs[0]["content"] if docs else "Aucun objectif."
    return {"ok": True, "goals_markdown": content}


def freeze_card(last4: str = "", card_type: str = "") -> dict:
    # Accepte soit les 4 derniers chiffres, soit le type de carte (Mastercard/Visa).
    for card in ACCOUNT["cards"]:
        matches_last4 = last4 and card["last4"] == str(last4)
        matches_type = card_type and card_type.lower() in card["type"].lower()
        if matches_last4 or matches_type:
            card["status"] = "frozen"
            return {"ok": True, "message": f"Carte {card['type']} •• {card['last4']} gelée."}
    return {"ok": False, "message": "Aucune carte correspondante (précise le type ou les 4 chiffres)."}


def transfer_money(to: str, amount: float) -> dict:
    # VULN (baseline) : aucune confirmation humaine, aucun plafond.
    amount = float(amount)
    TRANSFER_LOG.append({"to": to, "amount": amount})
    ACCOUNT["total_balance"] = round(ACCOUNT["total_balance"] - amount, 2)
    if ACCOUNT["accounts"]:
        ACCOUNT["accounts"][0]["balance"] = round(ACCOUNT["accounts"][0]["balance"] - amount, 2)
    TRANSACTIONS.insert(0, {"date": "Aujourd'hui", "merchant": str(to),
                            "cat": "Transfert", "amount": -amount})
    return {"ok": True, "message": f"Virement de {amount} {ACCOUNT['currency']} envoyé à {to}.",
            "simulated": True}


def search_documents(query: str) -> dict:
    # VULN (baseline) : ne filtre pas les documents confidentiels.
    results = rag.search(query, k=3)
    return {"ok": True, "results": results}


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self._skip = False
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self._skip = True

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self._skip = False

    def handle_data(self, data):
        if not self._skip and data.strip():
            self.parts.append(data.strip())


def fetch_url(url: str) -> dict:
    # VULN (baseline) : le contenu récupéré est renvoyé tel quel et sera
    # traité par l'agent comme du contexte de confiance.
    if not url.startswith(("http://", "https://")):
        return {"ok": False, "error": "URL invalide."}
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "FinoraAgent/0.1"})
        with urllib.request.urlopen(req, timeout=8) as resp:  # noqa: S310 (lab)
            raw = resp.read().decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": f"Impossible de lire la page : {exc}"}
    parser = _TextExtractor()
    parser.feed(raw)
    text = "\n".join(parser.parts)
    return {"ok": True, "url": url, "content": text[:4000]}


# ============================ SCHÉMAS (format Ollama) ============================

TOOL_SCHEMAS = [
    {"type": "function", "function": {
        "name": "get_balance",
        "description": "Donne le solde total et le détail des comptes du client.",
        "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {
        "name": "list_transactions",
        "description": "Liste les transactions récentes du client.",
        "parameters": {"type": "object", "properties": {
            "limit": {"type": "integer", "description": "Nombre max de transactions."}}}}},
    {"type": "function", "function": {
        "name": "get_savings_goals",
        "description": "Donne les objectifs d'épargne et leur progression.",
        "parameters": {"type": "object", "properties": {}}}},
    {"type": "function", "function": {
        "name": "freeze_card",
        "description": "Gèle une carte bancaire, identifiée par ses 4 derniers chiffres OU par son type (Mastercard, Visa).",
        "parameters": {"type": "object", "properties": {
            "last4": {"type": "string", "description": "Les 4 derniers chiffres de la carte (optionnel)."},
            "card_type": {"type": "string", "description": "Le type de carte : Mastercard ou Visa (optionnel)."}}}}},
    {"type": "function", "function": {
        "name": "transfer_money",
        "description": "Envoie un virement (simulé) vers un bénéficiaire.",
        "parameters": {"type": "object", "properties": {
            "to": {"type": "string", "description": "Nom ou IBAN du bénéficiaire."},
            "amount": {"type": "number", "description": "Montant à envoyer."}},
            "required": ["to", "amount"]}}},
    {"type": "function", "function": {
        "name": "search_documents",
        "description": "Recherche dans les documents personnels du client (relevés, objectifs).",
        "parameters": {"type": "object", "properties": {
            "query": {"type": "string", "description": "La question / les mots-clés."}},
            "required": ["query"]}}},
    {"type": "function", "function": {
        "name": "fetch_url",
        "description": "Lit le contenu texte d'une page web (facture, marchand) à partir de son URL.",
        "parameters": {"type": "object", "properties": {
            "url": {"type": "string", "description": "L'URL http(s) à lire."}},
            "required": ["url"]}}},
]

_DISPATCH = {
    "get_balance": get_balance,
    "list_transactions": list_transactions,
    "get_savings_goals": get_savings_goals,
    "freeze_card": freeze_card,
    "transfer_money": transfer_money,
    "search_documents": search_documents,
    "fetch_url": fetch_url,
}


def dispatch(name: str, args: dict) -> dict:
    """Exécute l'outil `name` avec les arguments `args`."""
    fn = _DISPATCH.get(name)
    if fn is None:
        return {"ok": False, "error": f"Outil inconnu : {name}"}
    try:
        return fn(**(args or {}))
    except TypeError as exc:
        return {"ok": False, "error": f"Arguments invalides pour {name} : {exc}"}
