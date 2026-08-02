import json, sys, os
p = os.path.join(os.path.dirname(__file__), "ngrok_resp.json")
try:
    d = json.load(open(p))
    print(d["tunnels"][0]["public_url"])
except Exception:
    pass
