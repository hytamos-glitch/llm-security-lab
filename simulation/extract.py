"""Réduit reports/traces/finale.json à ce que la simulation affiche : pour chaque attaque
et chaque mode, une exécution réelle et le taux mesuré."""
import json
from collections import Counter

d = json.load(open("reports/traces/finale.json", encoding="utf-8"))
ATTACKS = ["llm06", "llm01b", "llm02", "llm08", "llm01a"]
out = {"model": d["model"], "clips": []}
for case in ATTACKS:
    meta = next(c for c in d["cases"] if c["id"] == case)
    for secure in (False, True):
        runs = [r for r in d["runs"] if r["case"] == case and r["secure"] == secure]
        top = Counter(r["verdict"] for r in runs).most_common(1)[0][0]
        # Sans défense, on montre une exécution où l'attaque réussit ; le taux réel reste affiché.
        hit = [r for r in runs if r["verdict"] == "compromised"]
        run = hit[0] if hit and not secure else next(r for r in runs if r["verdict"] == top)
        steps = []
        for s in run["steps"]:
            if s["type"] == "llm":
                steps.append({"type": "llm", "text": s["content"][:220]})
            elif s["type"] == "tool":
                steps.append({k: s.get(k) for k in ("type", "name", "args", "ok", "pending", "refused", "guardrail", "confidential_filtered", "sources")})
            elif s["type"] == "guard":
                steps.append({"type": "guard", "stage": s["stage"], "tool": s.get("tool"), "reason": s["reason"][:80]})
            else:
                steps.append({"type": s["type"]})
        out["clips"].append({
            "id": f"{case}-{'apres' if secure else 'avant'}", "case": case, "ref": meta["ref"], "secure": secure,
            "message": run["message"], "reply": run["reply"][:420], "verdict": run["verdict"], "steps": steps,
            "balance": run["state"]["balance"],
            "rate": {"compromised": sum(r["verdict"] == "compromised" for r in runs),
                     "contained": sum(r["verdict"] == "contained" for r in runs), "n": len(runs)},
        })
json.dump(out, open("simulation/llm-shared/traces.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for c in out["clips"]:
    print(c["id"], c["verdict"], c["rate"], [s.get("name") or s.get("stage") or s["type"] for s in c["steps"]])

# Le plan terminal : toutes les lignes réelles, dans l'ordre.
attacks = [r for r in d["runs"] if r["case"] not in ("ctl-balance", "ctl-transfer")]
controls = [r for r in d["runs"] if r["case"] in ("ctl-balance", "ctl-transfer")]
terminal = {
    "model": d["model"],
    "minutes": round(sum(r["ms"] for r in d["runs"]) / 60000),
    "lines": [{"secure": int(r["secure"]), "id": r["case"], "repeat": r["repeat"] + 1, "verdict": r["verdict"]} for r in d["runs"]],
    "before": sum(r["verdict"] == "compromised" for r in attacks if not r["secure"]),
    "after": sum(r["verdict"] == "compromised" for r in attacks if r["secure"]),
    "n": sum(1 for r in attacks if r["secure"]),
    "controls": f"{sum(r['verdict'] == 'works' for r in controls)}/{len(controls)} fonctionnent",
}
json.dump(terminal, open("simulation/llm-shared/terminal.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(terminal["before"], terminal["after"], terminal["n"], terminal["controls"], terminal["minutes"], "min")
