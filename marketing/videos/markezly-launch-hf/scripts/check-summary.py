# Summarise the latest `hyperframes check` report: one line per finding.
import glob, json, os, sys
d = sys.argv[1] if len(sys.argv) > 1 else "film"
r = max(glob.glob(f"{d}/.hyperframes/artifacts/checks/*.json"), key=os.path.getmtime)
rep = json.load(open(r))
seen = 0
def walk(o):
    global seen
    if isinstance(o, dict):
        if "severity" in o and ("code" in o or "rule" in o):
            seen += 1
            print(f"{o['severity']:8} {o.get('code', o.get('rule'))}: {(o.get('message') or '')[:230]}" + (f"  @{o.get('time')}" if o.get('time') is not None else "") + (f"  [{o.get('selector')}]" if o.get('selector') else ""))
        else:
            for v in o.values(): walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)
walk(rep)
print(f"ok={rep.get('ok')} findings={seen}")
