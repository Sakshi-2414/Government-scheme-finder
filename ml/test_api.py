"""
Test the /api/predict endpoint once Flask is running.
Run: python ml/test_api.py
(Flask server must be running on port 5001)
"""

import json
try:
    import urllib.request as req
except ImportError:
    import urllib2 as req

BASE = "http://localhost:5001"

def post(path, body):
    data    = json.dumps(body).encode()
    request = req.Request(f"{BASE}{path}", data=data,
                          headers={"Content-Type": "application/json"})
    try:
        with req.urlopen(request, timeout=5) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        return {"error": str(e)}

print("\n" + "="*55)
print("  SchemeBot ML API — Endpoint Tests")
print("="*55)

test_cases = [
    {
        "label":    "SC girl, low income (should be ELIGIBLE)",
        "payload":  {"age": 22, "income": 80000, "gender": "female", "category": "sc", "state": "bihar"},
        "expected": 1,
    },
    {
        "label":    "General male, high income (should be NOT ELIGIBLE)",
        "payload":  {"age": 35, "income": 500000, "gender": "male", "category": "general", "state": "maharashtra"},
        "expected": 0,
    },
    {
        "label":    "OBC senior, very low income (should be ELIGIBLE)",
        "payload":  {"age": 65, "income": 48000, "gender": "male", "category": "obc", "state": "rajasthan"},
        "expected": 1,
    },
    {
        "label":    "ST youth, low income (should be ELIGIBLE)",
        "payload":  {"age": 19, "income": 75000, "gender": "female", "category": "st", "state": "jharkhand"},
        "expected": 1,
    },
]

passed = 0
for tc in test_cases:
    res    = post("/api/predict", tc["payload"])
    err    = res.get("error")
    if err:
        print(f"\n  ❌ ERROR: {err}")
        continue

    pred   = res.get("prediction")
    score  = res.get("score", 0)
    conf   = res.get("confidence", "?")
    ok     = pred == tc["expected"]
    icon   = "✅" if ok else "❌"
    if ok: passed += 1

    print(f"\n  {icon} {tc['label']}")
    print(f"     Prediction: {pred}  |  Score: {score:.4f}  |  Confidence: {conf}")

print(f"\n{'='*55}")
print(f"  Result: {passed}/{len(test_cases)} tests passed")
print(f"{'='*55}\n")
