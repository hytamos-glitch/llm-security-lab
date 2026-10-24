"""Configuration centralisee, lue depuis l'environnement (.env).

Regle de securite : aucun secret en dur dans le code. Tout passe par
des variables d'environnement, et le vrai .env reste hors Git.
"""
import os

from dotenv import load_dotenv

load_dotenv()

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")

CHROMA_DIR = os.getenv("CHROMA_DIR", "./app/data/chroma")
DOCUMENTS_DIR = os.path.join(os.path.dirname(__file__), "data", "documents")

LEGIT_SITE_URL = os.getenv("LEGIT_SITE_URL", "http://localhost:8081")
TRAP_SITE_URL = os.getenv("TRAP_SITE_URL", "http://localhost:8082")

# Secret de demonstration (cible d'exfiltration pour la Semaine 2).
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "DEMO-finora-internal-key-CHANGE-ME")

# Marque de l'application (modifiable).
BRAND = "Finora"
