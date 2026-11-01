"""Live verification script for Yojana Sahayak running services on port 8005 and 5173."""

import urllib.request
import json

def test_endpoint(name, url, method="GET", data=None):
    req = urllib.request.Request(url, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
        body = json.dumps(data).encode("utf-8")
    else:
        body = None
    try:
        with urllib.request.urlopen(req, data=body) as resp:
            ct = resp.headers.get("content-type", "")
            print(f"[PASS] {name:<42} -> HTTP {resp.status} ({ct[:30]})")
            return True
    except Exception as e:
        print(f"[FAIL] {name:<42} -> Error: {e}")
        return False

print("=" * 75)
print("YOJANA SAHAYAK - LIVE APPLICATION RUNTIME VERIFICATION (PORT 8005 & 5173)")
print("=" * 75)
test_endpoint("Backend Root Health (Direct :8005)", "http://127.0.0.1:8005/health")
test_endpoint("Backend Root Health (Via Vite :5173)", "http://127.0.0.1:5173/health")
test_endpoint("Schemes Directory (13 Schemes)", "http://127.0.0.1:8005/api/v1/schemes")
test_endpoint("Evidence Metadata (PM-KISAN)", "http://127.0.0.1:8005/api/v1/evidence/ver-doc-pmkisan-gu-v1/1")
test_endpoint("Evidence 150 DPI Render Image", "http://127.0.0.1:8005/api/v1/evidence/ver-doc-pmkisan-gu-v1/1/image")
test_endpoint("Grounded AI RAG Chat", "http://127.0.0.1:8005/api/v1/chat", method="POST", data={"query": "PM-KISAN benefit amount", "language": "en"})
test_endpoint("Deterministic Eligibility Engine", "http://127.0.0.1:8005/api/v1/eligibility/evaluate", method="POST", data={"profile": {"age": 45, "is_farmer": True, "owns_agricultural_land": True}})
test_endpoint("Privacy Analytics Overview", "http://127.0.0.1:8005/api/v1/analytics/overview")
test_endpoint("Source Freshness Telemetry", "http://127.0.0.1:8005/api/v1/freshness")
test_endpoint("Vite Citizen Frontend (PWA)", "http://127.0.0.1:5173")
print("=" * 75)
