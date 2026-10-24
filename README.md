# Finora — LLM Security Lab

Lab de sécurité pour **applications IA** : une app bancaire (« Finora ») avec un
**assistant IA** qui a accès aux données du compte (RAG), peut **lire des pages web**
et **agir** (virements, gel de carte). On l'attaque comme un red-teamer, puis on le
durcit — du code jusqu'à son infrastructure.

> Projet pédagogique, aligné **OWASP Top 10 for LLM Applications**.
> ⚠️ Tout tourne en **local**, sur des composants dont tu es propriétaire. Ne teste
> jamais ces techniques sur des systèmes tiers sans autorisation écrite.

---

## Architecture

```
Navigateur ──> Dashboard Finora (frontend)
                     │
                     ▼
            FastAPI /api/chat ──> Agent LLM (Ollama, llama3.2:3b)
                     │                 │
                     │                 ├─ outils bancaires (solde, virement, carte…)
                     │                 ├─ RAG (ChromaDB : documents du client)
                     │                 └─ fetch_url ──> sites du lab (légitime / piégé)
```

## Prérequis

- Python 3.12, et [Ollama](https://ollama.com) avec le modèle :
  ```bash
  ollama pull llama3.2:3b
  ```

## Lancer en local (sans Docker)

```bash
# 1) environnement
python -m venv .venv
# Windows : .venv\Scripts\Activate.ps1   |   macOS/Linux : source .venv/bin/activate
pip install -r requirements.txt

# 2) config
cp .env.example .env            # Windows : copy .env.example .env

# 3) indexer les documents du RAG
python -m app.rag

# 4) lancer l'API + le dashboard
uvicorn app.main:app --reload --port 8000
#   -> http://localhost:8000  (clique sur le bouton ✦ en bas à droite)

# 5) (optionnel) lancer les sites du lab dans deux autres terminaux
python lab_sites/legit_site/app.py      # http://localhost:8081
python lab_sites/trap_site/app.py       # http://localhost:8082
```

## Lancer avec Docker

```bash
docker compose up --build
# -> http://localhost:8000   (Ollama doit tourner sur la machine hôte)
```

## Tests

```bash
pytest -q
```

---

## Feuille de route (4 semaines)

| Semaine | Thème | État |
|--------|-------|------|
| **1** | Construire la cible (app + RAG + agent + sites + Docker) | ✅ baseline |
| **2** | Attaquer (OWASP LLM01/02/05/06/08) | à venir |
| **3** | Défendre (garde-fous, réseau, secrets, moindre privilège) | à venir |
| **4** | Mesurer, CI sécurité, déploiement cloud, rapport | à venir |

## Faiblesses volontaires de la baseline (cibles de la Semaine 2)

Elles sont marquées `VULN` dans le code :

- **`transfer_money` sans confirmation** → *Excessive Agency* (LLM06)
- **`fetch_url` renvoie du contenu non fiable traité comme du contexte** → *Prompt Injection indirecte* (LLM01)
- **`search_documents` ne filtre pas le document confidentiel** → *Sensitive Info Disclosure* (LLM02)
- **System prompt minimal et permissif** → base de durcissement (Semaine 3)

## Structure

```
app/            application cible (agent, RAG, outils, API, frontend)
lab_sites/      site légitime + site piégé (lus par l'agent)
tests/          tests de sécurité (fumée pour l'instant)
reports/        rapports & benchmarks (Semaine 4)
docker-compose.yml, Dockerfile, .github/workflows/ci.yml
```
