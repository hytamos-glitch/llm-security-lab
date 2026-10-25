# Findings — journal des vulnérabilités

Une fiche par faille testée, au format pentest. Chaque fiche relie la vulnérabilité
à l'**OWASP Top 10 for LLM Applications**, décrit comment la reproduire, montre une
preuve, évalue l'impact, et pointe la remédiation (implémentée en Semaine 3).

| Réf. | Vulnérabilité | Sévérité | Statut |
|------|---------------|----------|--------|
| [LLM01-A](LLM01-prompt-injection-directe.md) | Prompt injection directe | Moyenne→Élevée | ❌ Vulnérable |
| [LLM01-B](LLM01-prompt-injection-indirecte.md) | Prompt injection indirecte | Moyenne→Élevée | ❌ Vulnérable |
| [LLM02](LLM02-fuite-donnees.md) | Fuite de données (RAG confidentiel) | Élevée | ❌ Vulnérable |
| [LLM06](LLM06-excessive-agency.md) | Excessive agency (virement) | Élevée | ❌ Vulnérable |
| LLM05 | Mauvais traitement de la sortie (XSS) | — | ✅ non exploitable (sortie échappée) |
| [LLM08](LLM08-empoisonnement-rag.md) | Empoisonnement du RAG | Élevée | ❌ Vulnérable |

> ⚠️ Toutes les attaques sont menées **uniquement** contre cette application de lab,
> dont je suis propriétaire, dans un environnement local et isolé.
