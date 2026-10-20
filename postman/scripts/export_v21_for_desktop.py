#!/usr/bin/env python3
"""Export git-native v3 Backend collection + environments to Postman Collection v2.1 JSON.

Desktop cloud sidebar does not auto-show git-native YAML. Import the generated
files via Postman Desktop → Import, or open the repo folder in Local View.
Does not talk to Postman Cloud.
"""

from __future__ import annotations

import json
import re
import uuid
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    raise SystemExit("PyYAML required: python -m pip install pyyaml") from None

ROOT = Path(__file__).resolve().parents[2]
COLLECTION_DIR = ROOT / "postman" / "collections" / "Backend"
ENV_DIR = ROOT / "postman" / "environments"
OUT_DIR = ROOT / "postman" / "exports"


def uid() -> str:
    return str(uuid.uuid4())


def load_yaml(path: Path) -> dict:
    with path.open(encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    if not isinstance(data, dict):
        raise ValueError(f"Expected mapping in {path}")
    return data


def script_list(scripts: list | None, event: str) -> list[str]:
    if not scripts:
        return []
    lines: list[str] = []
    for item in scripts:
        if not isinstance(item, dict):
            continue
        stype = item.get("type")
        code = item.get("code") or ""
        if event == "test" and stype == "afterResponse":
            lines.extend(str(code).splitlines())
        if event == "prerequest" and stype == "beforeRequest":
            lines.extend(str(code).splitlines())
    return lines


def url_object(raw: str) -> dict:
    # Keep raw for Postman variable resolution; also provide a simple host/path split.
    path = []
    host = ["{{baseUrl}}"]
    m = re.match(r"^\{\{baseUrl\}\}/?(.*)$", raw)
    if m:
        remainder = m.group(1)
        path = [p for p in remainder.split("/") if p]
    return {
        "raw": raw,
        "host": host,
        "path": path,
    }


def convert_auth(auth: dict | None, inherit: bool = True) -> dict | None:
    if auth is None:
        return None if inherit else {"type": "noauth"}
    atype = auth.get("type")
    if atype in ("noauth", "none"):
        return {"type": "noauth"}
    if atype == "bearer":
        token = ""
        for cred in auth.get("credentials") or []:
            if isinstance(cred, dict) and cred.get("key") == "token":
                token = str(cred.get("value") or "")
        return {
            "type": "bearer",
            "bearer": [{"key": "token", "value": token, "type": "string"}],
        }
    return None


def convert_body(body: dict | None) -> dict | None:
    if not body:
        return None
    btype = body.get("type")
    content = body.get("content")
    if btype == "json":
        return {"mode": "raw", "raw": content or "", "options": {"raw": {"language": "json"}}}
    if btype == "text":
        return {"mode": "raw", "raw": content or ""}
    if btype == "none":
        return None
    return {"mode": "raw", "raw": content or ""}


def convert_headers(headers: list | None) -> list[dict]:
    out = []
    for h in headers or []:
        if not isinstance(h, dict):
            continue
        out.append(
            {
                "key": h.get("key", ""),
                "value": h.get("value", ""),
                "disabled": bool(h.get("disabled", False)),
                "description": h.get("description") or "",
            }
        )
    return out


def convert_examples(request_dir: Path, request_name: str, examples_rel: str | None) -> list[dict]:
    if not examples_rel:
        return []
    # examples: './.resources/<name>.resources/examples'
    examples_dir = (request_dir / examples_rel).resolve()
    if not examples_dir.is_dir():
        return []
    responses = []
    for path in sorted(examples_dir.glob("*.example.yaml")):
        data = load_yaml(path)
        resp = data.get("response") or {}
        body = resp.get("body") or {}
        req_snap = data.get("request") or {}
        original = {
            "method": req_snap.get("method") or "GET",
            "header": [],
            "url": url_object(str(req_snap.get("url") or "")),
        }
        if req_snap.get("body"):
            converted = convert_body(req_snap["body"])
            if converted:
                original["body"] = converted
        responses.append(
            {
                "name": data.get("name") or path.stem.replace(".example", ""),
                "originalRequest": original,
                "status": resp.get("statusText") or "OK",
                "code": int(resp.get("statusCode") or 200),
                "_postman_previewlanguage": "json",
                "header": convert_headers(resp.get("headers")),
                "body": body.get("content") or "",
            }
        )
    return responses


def convert_request(path: Path) -> dict:
    data = load_yaml(path)
    name = data.get("name") or path.name.replace(".request.yaml", "")
    item: dict = {
        "name": name,
        "id": uid(),
        "request": {
            "method": data.get("method") or "GET",
            "header": convert_headers(data.get("headers")),
            "url": url_object(str(data.get("url") or "")),
            "description": data.get("description") or "",
        },
        "response": convert_examples(path.parent, name, data.get("examples")),
    }
    auth = convert_auth(data.get("auth"), inherit=True)
    if auth is not None:
        item["request"]["auth"] = auth
    body = convert_body(data.get("body"))
    if body:
        item["request"]["body"] = body

    events = []
    pre = script_list(data.get("scripts"), "prerequest")
    if pre:
        events.append({"listen": "prerequest", "script": {"type": "text/javascript", "exec": pre}})
    test = script_list(data.get("scripts"), "test")
    if test:
        events.append({"listen": "test", "script": {"type": "text/javascript", "exec": test}})
    if events:
        item["event"] = events
    return item


def folder_order(folder: Path) -> int:
    definition = folder / ".resources" / "definition.yaml"
    if definition.is_file():
        data = load_yaml(definition)
        order = data.get("order")
        if isinstance(order, int):
            return order
    return 0


def build_collection() -> dict:
    definition = load_yaml(COLLECTION_DIR / ".resources" / "definition.yaml")
    folders = []
    for child in sorted(
        [p for p in COLLECTION_DIR.iterdir() if p.is_dir() and p.name != ".resources"],
        key=folder_order,
    ):
        folder_def_path = child / ".resources" / "definition.yaml"
        folder_def = load_yaml(folder_def_path) if folder_def_path.is_file() else {}
        requests = []
        for req_path in sorted(child.glob("*.request.yaml")):
            # Sort by order field inside file when present
            req_data = load_yaml(req_path)
            requests.append((req_data.get("order") or 0, convert_request(req_path)))
        requests.sort(key=lambda pair: pair[0])
        folders.append(
            {
                "name": folder_def.get("name") or child.name,
                "id": folder_def.get("id") or uid(),
                "description": folder_def.get("description") or "",
                "item": [item for _, item in requests],
            }
        )

    collection = {
        "info": {
            "_postman_id": uid(),
            "name": definition.get("name") or "JavaScript Fluency System API - Local",
            "description": definition.get("description") or "",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "item": folders,
        "variable": [
            {
                "key": v.get("key"),
                "value": v.get("value", ""),
                "description": v.get("description") or "",
            }
            for v in definition.get("variables") or []
            if isinstance(v, dict) and v.get("key")
        ],
    }
    auth = convert_auth(definition.get("auth"), inherit=False)
    if auth:
        collection["auth"] = auth
    return collection


def build_environment(path: Path) -> dict:
    data = load_yaml(path)
    values = []
    for item in data.get("values") or []:
        if not isinstance(item, dict):
            continue
        values.append(
            {
                "key": item.get("key"),
                "value": item.get("value", ""),
                "type": item.get("type") or "default",
                "enabled": bool(item.get("enabled", True)),
                "description": item.get("description") or "",
            }
        )
    return {
        "id": uid(),
        "name": data.get("name") or path.stem.replace(".environment", ""),
        "values": values,
        "_postman_variable_scope": "environment",
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    collection = build_collection()
    collection_path = OUT_DIR / "JavaScript Fluency System API - Local.postman_collection.json"
    collection_path.write_text(json.dumps(collection, indent=2) + "\n", encoding="utf-8")

    env_paths = []
    for env_file in sorted(ENV_DIR.glob("*.environment.yaml")):
        env = build_environment(env_file)
        out = OUT_DIR / f"{env['name']}.postman_environment.json"
        out.write_text(json.dumps(env, indent=2) + "\n", encoding="utf-8")
        env_paths.append(out.name)

    print(f"Wrote {collection_path.relative_to(ROOT)}")
    for name in env_paths:
        print(f"Wrote postman/exports/{name}")


if __name__ == "__main__":
    main()
