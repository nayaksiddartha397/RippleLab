import json
from copy import deepcopy
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from ripplelab_engine.contracts import SimulationRequest
from ripplelab_engine.main import app
from ripplelab_engine.repo_rate import MODEL_VERSION, simulate_repo_rate

ROOT = Path(__file__).resolve().parents[3]
GOLDEN_REQUEST = ROOT / "packages" / "contracts" / "examples" / "repo-rate-request.v1.json"
GOLDEN_RESULT = ROOT / "packages" / "contracts" / "examples" / "repo-rate-result.v1.json"
GENERATED_AT = datetime(2026, 8, 14, 8, 0, tzinfo=UTC)
client = TestClient(app)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def request_model(payload: dict | None = None) -> SimulationRequest:
    return SimulationRequest.model_validate(payload or load_json(GOLDEN_REQUEST))


def test_golden_repo_rate_result_is_generated_by_the_engine() -> None:
    actual = simulate_repo_rate(request_model(), generated_at=GENERATED_AT)

    assert actual.model_dump(mode="json", exclude_none=True) == load_json(GOLDEN_RESULT)
    assert actual.modelVersion == MODEL_VERSION


def test_same_inputs_produce_the_same_financial_outputs() -> None:
    request = request_model()

    first = simulate_repo_rate(request, generated_at=GENERATED_AT)
    second = simulate_repo_rate(request, generated_at=GENERATED_AT)

    assert first == second
    assert first.annualNetImpactPaise == 2_766_608
    assert first.impacts[0].annualImpactPaise == 3_166_608
    assert first.impacts[1].annualImpactPaise == -400_000


def test_editing_pass_through_changes_the_result_without_changing_the_profile() -> None:
    payload = load_json(GOLDEN_REQUEST)
    conservative_payload = deepcopy(payload)
    next(item for item in conservative_payload["assumptions"] if item["id"] == "loanPassThrough")[
        "value"
    ] = 0.5

    baseline = simulate_repo_rate(request_model(payload), generated_at=GENERATED_AT)
    conservative = simulate_repo_rate(
        request_model(conservative_payload),
        generated_at=GENERATED_AT,
    )

    assert conservative.annualNetImpactPaise < baseline.annualNetImpactPaise
    assert conservative.impacts[0].annualImpactPaise < baseline.impacts[0].annualImpactPaise


def test_missing_required_assumption_has_a_human_readable_error() -> None:
    payload = load_json(GOLDEN_REQUEST)
    payload["assumptions"] = [
        item for item in payload["assumptions"] if item["id"] != "remainingLoanTermMonths"
    ]

    with pytest.raises(ValueError, match="assumptions must include remainingLoanTermMonths"):
        simulate_repo_rate(request_model(payload), generated_at=GENERATED_AT)


def test_repo_rate_api_runs_the_vertical_slice() -> None:
    response = client.post("/v1/simulations/repo-rate", json=load_json(GOLDEN_REQUEST))

    assert response.status_code == 200
    result = response.json()
    assert result["modelVersion"] == MODEL_VERSION
    assert result["annualNetImpactPaise"] == 2_766_608
    assert [impact["annualImpactPaise"] for impact in result["impacts"]] == [
        3_166_608,
        -400_000,
    ]
    assert "no LLM calculates money" in result["warnings"][0]


def test_repo_rate_api_returns_assumption_errors_as_product_copy() -> None:
    payload = load_json(GOLDEN_REQUEST)
    payload["assumptions"] = [
        item for item in payload["assumptions"] if item["id"] != "currentDepositRateBps"
    ]

    response = client.post("/v1/simulations/repo-rate", json=payload)

    assert response.status_code == 422
    assert response.json()["detail"] == {
        "code": "INVALID_REPO_RATE_ASSUMPTION",
        "message": "assumptions must include currentDepositRateBps",
    }
