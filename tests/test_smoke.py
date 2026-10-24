"""Tests de fumée — vérifient le socle sans dépendre d'Ollama.

(Les tests d'attaque/défense arriveront en Semaine 2/3.)
"""
from app import tools


def test_get_balance():
    r = tools.dispatch("get_balance", {})
    assert r["ok"] is True
    assert r["total_balance"] > 0


def test_freeze_card():
    r = tools.dispatch("freeze_card", {"last4": "6782"})
    assert r["ok"] is True
    assert any(c["last4"] == "6782" and c["status"] == "frozen" for c in tools.ACCOUNT["cards"])


def test_freeze_unknown_card():
    r = tools.dispatch("freeze_card", {"last4": "0000"})
    assert r["ok"] is False


def test_transfer_is_simulated():
    r = tools.dispatch("transfer_money", {"to": "Rafiq", "amount": 10})
    assert r["ok"] is True
    assert r.get("simulated") is True


def test_fetch_url_rejects_bad_scheme():
    r = tools.dispatch("fetch_url", {"url": "ftp://example.com"})
    assert r["ok"] is False


def test_tool_schemas_shape():
    names = {t["function"]["name"] for t in tools.TOOL_SCHEMAS}
    assert {"get_balance", "transfer_money", "fetch_url", "search_documents"} <= names


def test_unknown_tool():
    r = tools.dispatch("does_not_exist", {})
    assert r["ok"] is False
