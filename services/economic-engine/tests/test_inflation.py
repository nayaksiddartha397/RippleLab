from copy import deepcopy
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from ripplelab_engine.contracts import SimulationRequest
from ripplelab_engine.inflation import MODEL_VERSION, simulate_inflation
from ripplelab_engine.main import app

GENERATED_AT = datetime(2026, 8, 15, 8, 0, tzinfo=UTC)
client = TestClient(app)


def inflation_payload() -> dict:
    return {
        "schemaVersion": "1.0.0",
        "requestId": "00000000-0000-4000-8000-000000000009",
        "country": "IN",
        "currency": "INR",
        "scenario": {
            "type": "inflation_change",
            "currentInflationPercent": 4,
            "change": {"value": 2, "unit": "percentage_points"},
            "horizonMonths": 12,
        },
        "profile": {
            "profileId": "00000000-0000-4000-8000-000000000007",
            "capturedAt": "2026-08-15T08:00:00Z",
            "age": 34,
            "city": "Bengaluru",
            "employmentStatus": "salaried",
            "housingStatus": "homeowner_with_mortgage",
            "monthlyTakeHomePaise": 18_000_000,
            "monthlyOtherIncomePaise": 0,
            "monthlyEssentialExpensesPaise": 5_500_000,
            "monthlyDiscretionaryExpensesPaise": 2_500_000,
            "cashSavingsPaise": 60_000_000,
            "fixedDepositsPaise": 80_000_000,
            "equityInvestmentsPaise": 150_000_000,
            "monthlyRentPaise": 0,
            "homeValuePaise": 1_200_000_000,
            "outstandingHomeLoanPaise": 650_000_000,
            "outstandingOtherLoansPaise": 0,
            "monthlyEmiPaise": 5_200_000,
            "weightedLoanRateBps": 850,
        },
        "assumptions": [
            _assumption("foodSpendPaise", "Food spend", 2_200_000, "paise"),
            _assumption("foodPassThrough", "Food pass-through", 1, "ratio"),
            _assumption("housingSpendPaise", "Housing spend", 0, "paise"),
            _assumption("housingPassThrough", "Housing pass-through", 1, "ratio"),
            _assumption("transportSpendPaise", "Transport spend", 1_100_000, "paise"),
            _assumption("transportPassThrough", "Transport pass-through", 1.2, "ratio"),
            _assumption("utilitiesSpendPaise", "Utilities spend", 1_100_000, "paise"),
            _assumption("utilitiesPassThrough", "Utilities pass-through", 0.8, "ratio"),
            _assumption("otherSpendPaise", "Other spend", 3_600_000, "paise"),
            _assumption("otherPassThrough", "Other pass-through", 0.7, "ratio"),
            _assumption("salaryGrowthBps", "Salary growth", 500, "basis_points"),
            _assumption("portfolioReturnBps", "Portfolio return", 700, "basis_points"),
        ],
        "evidence": [
            {
                "id": "mospi-cpi-methodology",
                "title": "National Metadata Structure for Consumer Price Index",
                "publisher": "Ministry of Statistics and Programme Implementation",
                "sourceType": "methodology",
                "url": "https://www.mospi.gov.in/sites/default/files/CPI/National_Metadata_Structure_for_CPI.pdf",
                "accessedAt": "2026-08-15T08:00:00Z",
                "locator": "CPI basket and expenditure-weight methodology",
            }
        ],
    }


def _assumption(assumption_id: str, label: str, value: int | float, unit: str) -> dict:
    return {
        "id": assumption_id,
        "label": label,
        "value": value,
        "unit": unit,
        "rationale": "Explicit deterministic test assumption.",
        "editable": True,
        "citationIds": ["mospi-cpi-methodology"] if "PassThrough" in assumption_id else [],
    }


def request_model(payload: dict | None = None) -> SimulationRequest:
    return SimulationRequest.model_validate(payload or inflation_payload())


def test_personal_basket_produces_reproducible_category_impacts() -> None:
    result = simulate_inflation(request_model(), generated_at=GENERATED_AT)

    assert result.modelVersion == MODEL_VERSION
    assert result.annualNetImpactPaise == -1_660_800
    assert result.uncertainty.p10AnnualImpactPaise <= result.annualNetImpactPaise
    assert result.annualNetImpactPaise <= result.uncertainty.p90AnnualImpactPaise
    assert [impact.annualImpactPaise for impact in result.impacts[:5]] == [
        -528_000,
        0,
        -316_800,
        -211_200,
        -604_800,
    ]
    personal_node = next(
        node for node in result.causalGraph.nodes if node.id == "personal-basket-inflation"
    )
    assert personal_node.value == 519
    assert result.warnings[1].startswith("The headline result is the annualized expense")


def test_higher_inflation_increases_expense_pressure() -> None:
    baseline_payload = inflation_payload()
    high_payload = deepcopy(baseline_payload)
    high_payload["scenario"]["change"]["value"] = 4

    baseline = simulate_inflation(request_model(baseline_payload), generated_at=GENERATED_AT)
    high = simulate_inflation(request_model(high_payload), generated_at=GENERATED_AT)

    assert high.annualNetImpactPaise < baseline.annualNetImpactPaise
    assert abs(high.annualNetImpactPaise) == 2 * abs(baseline.annualNetImpactPaise)


def test_salary_growth_changes_real_income_without_changing_expense_result() -> None:
    payload = inflation_payload()
    stronger_salary_payload = deepcopy(payload)
    next(
        item for item in stronger_salary_payload["assumptions"] if item["id"] == "salaryGrowthBps"
    )["value"] = 800

    baseline = simulate_inflation(request_model(payload), generated_at=GENERATED_AT)
    stronger = simulate_inflation(request_model(stronger_salary_payload), generated_at=GENERATED_AT)
    baseline_salary = next(
        impact for impact in baseline.impacts if impact.id == "salary-purchasing-power"
    )
    stronger_salary = next(
        impact for impact in stronger.impacts if impact.id == "salary-purchasing-power"
    )

    assert baseline.annualNetImpactPaise == stronger.annualNetImpactPaise
    assert stronger_salary.annualImpactPaise > baseline_salary.annualImpactPaise


def test_missing_category_assumption_has_a_human_readable_error() -> None:
    payload = inflation_payload()
    payload["assumptions"] = [
        item for item in payload["assumptions"] if item["id"] != "foodSpendPaise"
    ]

    with pytest.raises(ValueError, match="assumptions must include foodSpendPaise"):
        simulate_inflation(request_model(payload), generated_at=GENERATED_AT)


def test_inflation_api_runs_the_personal_household_model() -> None:
    response = client.post("/v1/simulations/inflation", json=inflation_payload())

    assert response.status_code == 200
    result = response.json()
    assert result["scenarioType"] == "inflation_change"
    assert result["annualNetImpactPaise"] == -1_660_800
    assert len(result["causalGraph"]["nodes"]) == 10
    assert len(result["causalGraph"]["edges"]) == 13
    assert "no LLM calculates money" in result["warnings"][0]


def test_inflation_api_returns_assumption_errors_as_product_copy() -> None:
    payload = inflation_payload()
    next(item for item in payload["assumptions"] if item["id"] == "foodPassThrough")["value"] = 2.5

    response = client.post("/v1/simulations/inflation", json=payload)

    assert response.status_code == 422
    assert response.json()["detail"] == {
        "code": "INVALID_INFLATION_ASSUMPTION",
        "message": "assumption foodPassThrough must be between 0 and 2",
    }
