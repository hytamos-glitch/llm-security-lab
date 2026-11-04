# Findings — journal des vulnérabilités

Une fiche par faille testée, au format pentest. Chaque fiche relie la vulnérabilité
à l'**OWASP Top 10 for LLM Applications**, décrit comment la reproduire, montre une
preuve, évalue l'impact, et donne l'état mesuré après renforcement.

| Réf. | Vulnérabilité | Sévérité | Statut |
|------|---------------|----------|--------|
| [LLM01-A](LLM01-prompt-injection-directe.md) | Prompt injection directe | Moyenne→Élevée | 🟢 Atténué : 6/6 → 0/6 |
| [LLM01-B](LLM01-prompt-injection-indirecte.md) | Prompt injection indirecte | Moyenne→Élevée | ⚠️ Réduit : 6/9 → 1/9 |
| [LLM02](LLM02-fuite-donnees.md) | Fuite de données (RAG confidentiel) | Élevée | 🟢 Atténué : 3/6 → 0/6 |
| [LLM06](LLM06-excessive-agency.md) | Excessive agency (virement) | Élevée | 🟢 Atténué : 3/3 → 0/3 |
| LLM05 | Mauvais traitement de la sortie (XSS) | — | ⚠️ bulle de réponse échappée, bénéficiaire corrigé ensuite (rapport, section 8) |
| [LLM08](LLM08-empoisonnement-rag.md) | Empoisonnement du RAG | Élevée | 🟢 Atténué : 5/6 → 0/6 |

> Statut : attaques réussies sans défense → avec défense, 3 essais par cas. Détail dans le [rapport, section 8](../reports/RAPPORT-PENTEST.md).

> ⚠️ Toutes les attaques sont menées **uniquement** contre cette application de lab,
> dont je suis propriétaire, dans un environnement local et isolé.
