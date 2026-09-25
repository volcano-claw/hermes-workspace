#!/usr/bin/env python3
"""Build a dynamic, read-only audit of the Workspace GitHub portfolio."""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

HOME = Path(os.environ.get("HERMES_HOME", "/opt/data"))
CATALOG = HOME / "hermes-workspace/src/lib/catalog/repo-catalog.json"
OUTPUT = HOME / "hermes-context/runtime/GITHUB-FLEET-AUDIT.json"
DECISIONS = HOME / "hermes-context/governance/GITHUB-FLEET-QUALITATIVE-DECISIONS.json"
TOKEN_HELPER = HOME / "scripts/github-app-token-volcano-claw.py"
USER_AGENT = "Hermes-GitHub-Fleet-Audit/1.0"


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_token() -> str | None:
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        return token
    if not TOKEN_HELPER.exists():
        return None
    proc = subprocess.run(
        [sys.executable, str(TOKEN_HELPER), "--print-token"],
        text=True,
        capture_output=True,
        timeout=30,
        check=False,
    )
    if proc.returncode != 0:
        return None
    token = proc.stdout.strip()
    return token or None


@dataclass
class GitHubClient:
    token: str | None

    def get(self, path: str) -> Any:
        url = path if path.startswith("https://") else f"https://api.github.com{path}"
        headers = {"Accept": "application/vnd.github+json", "User-Agent": USER_AGENT, "X-GitHub-Api-Version": "2022-11-28"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            body = exc.read(500).decode("utf-8", errors="replace")
            raise RuntimeError(f"HTTP {exc.code}: {body}") from exc


def age_days(iso_value: str | None, now: datetime) -> int | None:
    if not iso_value:
        return None
    try:
        value = datetime.fromisoformat(iso_value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return max(0, (now - value).days)


def classify(repo: dict[str, Any], live: dict[str, Any], compare: dict[str, Any] | None, error: str | None) -> dict[str, Any]:
    if error:
        return {"state": "needs_evidence", "priority": 70, "reason": "Métadonnées GitHub incomplètes", "recommendedAction": "Rétablir la preuve GitHub avant décision."}
    if live.get("archived"):
        return {"state": "archive_review", "priority": 55, "reason": "Dépôt archivé", "recommendedAction": "Décider conservation documentaire ou retrait du portefeuille actif."}
    if compare and int(compare.get("behind_by") or 0) > 0:
        behind = int(compare.get("behind_by") or 0)
        priority = min(100, 60 + min(behind, 40))
        return {"state": "upstream_review", "priority": priority, "reason": f"{behind} commit(s) amont à examiner", "recommendedAction": "Auditer les changements amont par valeur, sécurité et compatibilité; ne pas fusionner automatiquement."}
    days = age_days(live.get("pushed_at"), datetime.now(timezone.utc))
    if days is not None and days > 180:
        return {"state": "stale_review", "priority": 45, "reason": f"Aucun push depuis {days} jours", "recommendedAction": "Confirmer le rôle, extraire la valeur restante ou préparer une décision d’archivage."}
    if repo.get("decision") in {"À justifier ou supprimer", "À remettre à niveau"}:
        return {"state": "decision_due", "priority": 65, "reason": repo.get("decision"), "recommendedAction": repo.get("nextAction")}
    return {"state": "current", "priority": 20, "reason": "Aucune dérive prioritaire détectée", "recommendedAction": repo.get("nextAction")}


def audit(catalog_path: Path, decisions_path: Path = DECISIONS) -> dict[str, Any]:
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    qualitative_payload = json.loads(decisions_path.read_text(encoding="utf-8")) if decisions_path.exists() else {"decisions": {}}
    qualitative = qualitative_payload.get("decisions", {})
    expected = int(catalog.get("coverage", {}).get("repositories", 0))
    repositories = catalog.get("repositories", [])
    if expected != len(repositories):
        raise RuntimeError(f"catalog count mismatch: declared={expected} actual={len(repositories)}")
    client = GitHubClient(load_token())
    results: list[dict[str, Any]] = []
    now = datetime.now(timezone.utc)
    for source in repositories:
        full_name = source["fullName"]
        error = None
        live: dict[str, Any] = {}
        compare: dict[str, Any] | None = None
        try:
            live = client.get(f"/repos/{full_name}")
            parent = live.get("parent") or {}
            if live.get("fork") and parent.get("full_name"):
                parent_branch = parent.get("default_branch") or "main"
                fork_branch = live.get("default_branch") or "main"
                owner = full_name.split("/", 1)[0]
                compare = client.get(
                    f"/repos/{parent['full_name']}/compare/{urllib.parse.quote(parent_branch, safe='')}...{urllib.parse.quote(owner + ':' + fork_branch, safe=':')}"
                )
        except Exception as exc:  # bounded per-repo failure, never expose credentials
            error = str(exc).replace(client.token or "__NO_TOKEN__", "[REDACTED]")[:500]
        decision = classify(source, live, compare, error)
        review = qualitative.get(full_name)
        results.append({
            "name": source["name"],
            "fullName": full_name,
            "url": source["url"],
            "category": source["category"],
            "purpose": source["purpose"],
            "enables": source["enables"],
            "portfolioDecision": source["decision"],
            "portfolioNextAction": source["nextAction"],
            "visibility": "private" if live.get("private") else source.get("visibility", "unknown"),
            "fork": bool(live.get("fork", source.get("fork"))),
            "parent": (live.get("parent") or {}).get("full_name") or source.get("parent"),
            "language": live.get("language") or source.get("language"),
            "license": (live.get("license") or {}).get("spdx_id"),
            "archived": bool(live.get("archived", source.get("archived"))),
            "defaultBranch": live.get("default_branch"),
            "updatedAt": live.get("updated_at"),
            "pushedAt": live.get("pushed_at") or source.get("pushedAt"),
            "ageDays": age_days(live.get("pushed_at") or source.get("pushedAt"), now),
            "stars": live.get("stargazers_count"),
            "openIssues": live.get("open_issues_count"),
            "aheadBy": (compare or {}).get("ahead_by"),
            "behindBy": (compare or {}).get("behind_by"),
            "compareStatus": (compare or {}).get("status"),
            "audit": decision,
            "qualitativeReview": review,
            "error": error,
        })
        time.sleep(0.04)
    states: dict[str, int] = {}
    for item in results:
        state = item["audit"]["state"]
        states[state] = states.get(state, 0) + 1
    return {
        "schemaVersion": 2,
        "generatedAt": utc_now(),
        "source": "GitHub API + governed Workspace portfolio catalog",
        "authenticated": bool(client.token),
        "coverage": {"expected": expected, "audited": len(results), "errors": sum(bool(item["error"]) for item in results), "complete": len(results) == expected},
        "summary": {"states": states, "forks": sum(item["fork"] for item in results), "behindUpstream": sum(bool(item.get("behindBy")) for item in results), "private": sum(item["visibility"] == "private" for item in results), "qualitativelyReviewed": sum(bool(item.get("qualitativeReview")) for item in results)},
        "repositories": sorted(results, key=lambda item: (-int(item["audit"]["priority"]), item["fullName"].lower())),
    }


def atomic_write(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        handle.write(data)
        temp = Path(handle.name)
    temp.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", type=Path, default=CATALOG)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--decisions", type=Path, default=DECISIONS)
    parser.add_argument("--report", action="store_true")
    args = parser.parse_args()
    try:
        payload = audit(args.catalog, args.decisions)
        atomic_write(args.output, payload)
    except Exception as exc:
        print(json.dumps({"status": "STOP", "error": str(exc)[:500]}, ensure_ascii=False))
        return 2
    status = "PASS" if payload["coverage"]["errors"] == 0 else "ATTENTION"
    report = {"status": status, "generatedAt": payload["generatedAt"], "coverage": payload["coverage"], "summary": payload["summary"], "output": str(args.output)}
    if args.report or status != "PASS":
        print(json.dumps(report, ensure_ascii=False))
    return 0 if payload["coverage"]["complete"] and status == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
