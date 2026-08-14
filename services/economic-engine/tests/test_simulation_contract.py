import json
from pathlib import Path

from fastapi.testclient import TestClient

from ripplelab_engine.main import app

ROOT = Path(__file__).resolve().parents[3]
GOLDEN_REQUEST = ROOT / "packages" / "contracts" / "examples" / "repo-rate-request.v1.json"
client = TestClient(app)


def load_golden_request() -> dict:
    return json.loads(GOLDEN_REQUEST.read_text(encoding="utf-8"))


def test_api_accepts_canonical_golden_request() -> None:
    payload = load_golden_request()
    response = client.post("/v1/contracts/simulation/validate", json=payload)

    assert response.status_code == 200
    assert response.json() == {
        "valid": True,
        "schemaVersion": "1.0.0",
        "scenarioType": "repo_rate_change",
        "requestId": payload["requestId"],
    }


def test_api_rejects_unsupported_scenario_type() -> None:
    payload = load_golden_request()
    payload["scenario"]["type"] = "gst_change"
    response = client.post("/v1/contracts/simulation/validate", json=payload)

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "INVALID_SIMULATION_REQUEST"
    assert "scenario" in error["issues"][0]["field"]
    assert error["issues"][0]["type"] == "union_tag_invalid"


def test_api_rejects_wrong_repo_rate_unit() -> None:
    payload = load_golden_request()
    payload["scenario"]["change"]["unit"] = "percentage_points"
    response = client.post("/v1/contracts/simulation/validate", json=payload)

    assert response.status_code == 422
    assert "basis_points" in response.json()["error"]["issues"][0]["message"]


def test_api_rejects_unknown_fields() -> None:
    payload = load_golden_request()
    payload["scenario"]["undocumented"] = True
    response = client.post("/v1/contracts/simulation/validate", json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["issues"][0]["type"] == "extra_forbidden"
