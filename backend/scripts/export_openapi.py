"""Write docs/openapi.json and the Postman collection derived from it, without touching any service.

Run from backend/ inside the backend venv:  python scripts/export_openapi.py
"""
import json
import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
DOCS = BACKEND.parent / "docs"
SPEC_OUT = DOCS / "openapi.json"
POSTMAN_OUT = DOCS / "postman" / "face-recognition-pro.postman_collection.json"

# Unreachable dummies: importing the app builds clients but must never reach a real DB or Qdrant.
os.environ.update(
    DATABASE_URL="postgresql://none:none@invalid.invalid:1/none",
    QDRANT_HOST="invalid.invalid",
    QDRANT_PORT="1",
    WARMUP_MODELS="false",
)
sys.path.insert(0, str(BACKEND))

from app.main import app  # noqa: E402


def example(prop: dict):
    if "default" in prop:
        return prop["default"]
    if "anyOf" in prop:
        prop = next(p for p in prop["anyOf"] if p.get("type") != "null")
    kind = prop.get("type")
    if kind == "boolean":
        return True
    if kind in ("integer", "number"):
        return 1
    if prop.get("format") == "email":
        return "pessoa@example.com"
    return f"<{prop.get('title', 'valor')}>"


def body(op: dict, schemas: dict) -> dict | None:
    content = op.get("requestBody", {}).get("content", {})
    for mime, media in content.items():
        props = schemas[media["schema"]["$ref"].rsplit("/", 1)[-1]]["properties"]
        if mime == "application/json":
            raw = {name: example(p) for name, p in props.items()}
            return {"mode": "raw", "raw": json.dumps(raw, indent=2, ensure_ascii=False),
                    "options": {"raw": {"language": "json"}}}
        fields = []
        for name, p in props.items():
            if p.get("format") == "binary" or p.get("items", {}).get("format") == "binary":
                fields.append({"key": name, "type": "file", "src": []})
            else:
                fields.append({"key": name, "type": "text", "value": str(example(p)).lower()})
        return {"mode": "formdata", "formdata": fields}
    return None


def postman(spec: dict) -> dict:
    schemas = spec["components"]["schemas"]
    folders: dict[str, list] = {}
    for path, ops in spec["paths"].items():
        segments = [f":{s[1:-1]}" if s.startswith("{") else s for s in path.strip("/").split("/")]
        for method, op in ops.items():
            params = op.get("parameters", [])
            # Optional filters without a default ship disabled and empty.
            query = [{"key": p["name"], "value": str(p["schema"].get("default", "")),
                      "disabled": "default" not in p["schema"] and not p.get("required")}
                     for p in params if p["in"] == "query"]
            enabled = [q for q in query if not q["disabled"]]
            request = {
                "method": method.upper(),
                "header": [],
                "url": {
                    "raw": "{{baseUrl}}/" + "/".join(segments)
                    + ("?" + "&".join(f"{q['key']}={q['value']}" for q in enabled) if enabled else ""),
                    "host": ["{{baseUrl}}"],
                    "path": segments,
                    "query": query,
                    "variable": [{"key": p["name"], "value": ""} for p in params if p["in"] == "path"],
                },
                "description": op.get("description", ""),
            }
            if "security" not in op:
                request["auth"] = {"type": "noauth"}
            if b := body(op, schemas):
                request["body"] = b
            item = {"name": op.get("summary", f"{method.upper()} {path}"), "request": request}
            if path == "/api/auth/login":
                item["event"] = [{"listen": "test", "script": {"type": "text/javascript", "exec": [
                    "if (pm.response.code === 200) pm.collectionVariables.set('token', pm.response.json().access_token);",
                ]}}]
            folders.setdefault((op.get("tags") or ["health"])[0], []).append(item)

    return {
        "info": {
            "name": spec["info"]["title"],
            "description": "Gerado de docs/openapi.json por backend/scripts/export_openapi.py. "
                           "Rode 'Login' primeiro: ele grava o JWT na variável token.",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
        "variable": [
            {"key": "baseUrl", "value": "http://localhost:8000"},
            {"key": "token", "value": ""},
        ],
        "item": [{"name": name, "item": items} for name, items in folders.items()],
    }


def write(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {path.relative_to(BACKEND.parent)}")


spec = app.openapi()
write(SPEC_OUT, spec)
write(POSTMAN_OUT, postman(spec))
