"""API FastAPI : sert le dashboard Finora (site complet) et l'assistant.

Routes :
  GET  /                 -> le site (frontend statique)
  GET  /api/state        -> tout l'état du dashboard (comptes, cartes, transactions, objectifs, contacts)
  POST /api/card/freeze  -> gèle / dégèle une carte
  POST /api/card/control -> active / désactive un contrôle de carte
  POST /api/transfer     -> virement (simulé)
  POST /api/chat         -> message à l'assistant -> réponse + outils appelés
"""
import os

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app import rag, tools
from app.agent import run_agent
from app.config import BRAND

app = FastAPI(title=f"{BRAND} — site + assistant (lab)")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")


@app.middleware("http")
async def no_cache_static(request, call_next):
    # En dev : empêche le navigateur de garder d'anciens CSS/JS en cache.
    resp = await call_next(request)
    if request.url.path.startswith("/static") or request.url.path == "/":
        resp.headers["Cache-Control"] = "no-store"
    return resp


@app.on_event("startup")
def _startup():
    try:
        n = rag.seed_documents()
        print(f"[startup] RAG prêt — {n} documents indexés.")
    except Exception as exc:  # noqa: BLE001
        print(f"[startup] RAG non initialisé : {exc}")


# ---------- modèles d'entrée ----------
class ChatIn(BaseModel):
    message: str
    history: list | None = None


class FreezeIn(BaseModel):
    last4: str
    frozen: bool


class ControlIn(BaseModel):
    last4: str
    control: str
    enabled: bool


class TransferIn(BaseModel):
    to: str
    amount: float


# ---------- état du dashboard ----------
@app.get("/api/state")
def state():
    income = sum(t["amount"] for t in tools.TRANSACTIONS if t["amount"] > 0)
    spending = -sum(t["amount"] for t in tools.TRANSACTIONS if t["amount"] < 0)
    return {
        "brand": BRAND,
        "holder": tools.ACCOUNT["holder"],
        "total_balance": tools.ACCOUNT["total_balance"],
        "currency": tools.ACCOUNT["currency"],
        "accounts": tools.ACCOUNT["accounts"],
        "cards": tools.ACCOUNT["cards"],
        "transactions": tools.TRANSACTIONS,
        "goals": tools.GOALS,
        "contacts": tools.CONTACTS,
        "balance_history": tools.BALANCE_HISTORY,
        "spending_categories": tools.SPENDING_CATEGORIES,
        "contributions": tools.CONTRIBUTIONS,
        "income": round(income, 2),
        "spending": round(spending, 2),
    }


@app.post("/api/card/freeze")
def card_freeze(p: FreezeIn):
    for card in tools.ACCOUNT["cards"]:
        if card["last4"] == p.last4:
            card["status"] = "frozen" if p.frozen else "active"
            return {"ok": True, "status": card["status"]}
    return {"ok": False}


@app.post("/api/card/control")
def card_control(p: ControlIn):
    return tools.set_card_control(p.last4, p.control, p.enabled)


@app.post("/api/transfer")
def transfer(p: TransferIn):
    return tools.transfer_money(p.to, p.amount)


@app.post("/api/chat")
def chat(payload: ChatIn):
    return run_agent(payload.message, payload.history)


# ---------- frontend ----------
@app.get("/")
def index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
