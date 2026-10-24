"""RAG : indexation et recherche dans les documents du client (ChromaDB).

NOTE SÉCURITÉ (baseline Semaine 1, volontairement naïve) :
la recherche renvoie TOUT ce qui matche, y compris le document marqué
CONFIDENTIEL. C'est la cible de l'attaque de fuite de données (LLM02)
en Semaine 2 ; le filtrage sera ajouté en Semaine 3.
"""
import glob
import os

import chromadb

from app.config import CHROMA_DIR, DOCUMENTS_DIR

_COLLECTION_NAME = "finora_docs"
_client = None
_collection = None


def _get_collection():
    global _client, _collection
    if _collection is not None:
        return _collection
    os.makedirs(CHROMA_DIR, exist_ok=True)
    _client = chromadb.PersistentClient(path=CHROMA_DIR)
    _collection = _client.get_or_create_collection(name=_COLLECTION_NAME)
    return _collection


def seed_documents() -> int:
    """Charge les fichiers markdown du dossier documents dans ChromaDB.

    Idempotent : on repart d'une collection vide à chaque appel.
    Retourne le nombre de documents indexés.
    """
    col = _get_collection()
    existing = col.get()
    if existing and existing.get("ids"):
        col.delete(ids=existing["ids"])

    paths = sorted(glob.glob(os.path.join(DOCUMENTS_DIR, "*.md")))
    docs, ids, metas = [], [], []
    for path in paths:
        with open(path, "r", encoding="utf-8") as fh:
            content = fh.read()
        name = os.path.basename(path)
        docs.append(content)
        ids.append(name)
        metas.append({"source": name, "confidential": "CONFIDENTIEL" in content})

    if docs:
        col.add(documents=docs, ids=ids, metadatas=metas)
    return len(docs)


def search(query: str, k: int = 3):
    """Recherche sémantique. Renvoie une liste de dicts {source, content}."""
    col = _get_collection()
    if col.count() == 0:
        seed_documents()
    res = col.query(query_texts=[query], n_results=k)
    out = []
    docs = (res.get("documents") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    for content, meta in zip(docs, metas):
        out.append({"source": (meta or {}).get("source", "?"), "content": content})
    return out


if __name__ == "__main__":
    n = seed_documents()
    print(f"[rag] {n} documents indexés dans {CHROMA_DIR}")
