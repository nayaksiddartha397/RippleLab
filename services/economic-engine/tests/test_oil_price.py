from copy import deepcopy
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from ripplelab_engine.contracts import SimulationRequest
from ripplelab_engine.main import app
from ripplelab_engine.oil_price import MODEL_VERSION, simulate_oil_price

GENERATED_AT = datetime(2026, 8, 15, 8, 0, tzinfo=UTC)
client = TestClient(app)


def _assumption(
    assumption_id: str,
    label: str,
    value: int | float,
    unit: str,
    citation_ids: list[str] | None = None,
) -> dict:
    return {
        "id": assumption_id,
        "label": label,
        "value": value,
        "unit": unit,
        "rationale": "Explicit deterministic test assumption.",
        "editable": True,
        "citationIds": citation_ids or [],
    }


def oil_price_payload() -> dict:
    return {
        "schemaVersion": "1.0.0",
        "requestId": "00000000-0000-4000-8000-000000000010",
        "country": "IN",
        "currency": "INR",
        "scenario": {
            "type": "oil_price_change",
            "currentPrice": 80,
            "targetPrice": 120,
            "unit": "usd_per_barrel",
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
            _assumption(
                "currentRetailFuelPricePaisePerLitre",
                "Current retail fuel price",
                10_000,
                "paise_per_litre",
                ["ppac-retail-price-build-up"],
            ),
            _assumption("monthlyFuelLitres", "Monthly fuel use", 40, "litres_per_month"),
            _assumption(
                "crudeToRetailPassThrough",
                "Crude-to-retail pass-through",
                0.3,
                "ratio",
                ["ppac-crude-price", "ppac-retail-price-build-up"],
            ),
            _assumption("transportSpendPaise", "Transport spend", 1_100_000, "paise"),
            _assumption(
                "transportPassThrough",
                "Transport pass-through",
                0.12,
                "ratio",
                ["mospi-cpi-groups"],
            ),
            _assumption("foodSpendPaise", "Food spend", 2_200_000, "paise"),
            _assumption(
                "foodPassThrough",
                "Food pass-through",
                0.04,
                "ratio",
                ["mospi-cpi-groups"],
            ),
            _assumption("utilitiesSpendPaise", "Utilities spend", 1_100_000, "paise"),
            _assumption(
                "utilitiesPassThrough",
                "Utilities pass-through",
                0.06,
                "ratio",
                ["mospi-cpi-groups"],
            ),
        ],
        "evidence": [
            {
                "id": "ppac-crude-price",
                "title": "International Prices of Crude Oil (Indian Basket)",
                "publisher": "Petroleum Planning and Analysis Cell",
                "sourceType": "official_statistic",
                "url": "https://ppac.gov.in/prices/international-prices-of-crude-oil",
                "accessedAt": "2026-08-15T08:00:00Z",
            },
            {
                "id": "ppac-retail-price-build-up",
                "title": "Price Build Up of Petrol and Diesel",
                "publisher": "Petroleum Planning and Analysis Cell",
                "sourceType": "methodology",
                "url": (
                    "https://ppac.gov.in/retail-selling-price-rsp-of-petrol-diesel-and-"
                    "domestic-lpg/price-build-up-of-petrol-and-diesel"
                ),
                "accessedAt": "2026-08-15T08:00:00Z",
            },
            {
                "id": "mospi-cpi-groups",
                "title": "Consumer Price Index frequently asked questions",
                "publisher": "Ministry of Statistics and Programme Implementation",
                "sourceType": "methodology",
                "url": "https://mospi.gov.in/faq",
                "accessedAt": "2026-08-15T08:00:00Z",
            },
        ],
    }


def request_model(payload: dict | None = None) -> SimulationRequest:
    return SimulationRequest.model_validate(payload or oil_price_payload())


def test_oil_price_model_separates_crude_retail_and_household_units() -> None:
    result = simulate_oil_price(request_model(), generated_at=GENERATED_AT)

    assert result.modelVersion == MODEL_VERSION
    assert result.annualNetImpactPaise == -2_436_000
    assert [impact.annualImpactPaise for impact in result.impacts] == [
        -720_000,
        -792_000,
        -528_000,
        -396_000,
    ]
    crude_node = next(node for node in result.causalGraph.nodes if node.id == "crude-oil-price")
    retail_node = next(node for node in result.causalGraph.nodes if node.id == "retail-fuel-price")
    assert (crude_node.value, crude_node.unit) == (120, "usd_per_barrel")
    assert (retail_node.value, retail_node.unit) == (11_500, "paise_per_litre")
    assert result.uncertainty.p10AnnualImpactPaise == -8_196_000
    assert result.uncertainty.p90AnnualImpactPaise == -240_000


def test_lower_crude_price_produces_a_household_benefit() -> None:
    payload = oil_price_payload()
    payload["scenario"]["targetPrice"] = 40

    result = simulate_oil_price(request_model(payload), generated_at=GENERATED_AT)

    assert result.annualNetImpactPaise == 2_436_000
    assert all(impact.direction in {"benefit", "neutral"} for impact in result.impacts)


def test_low_driving_profile_reduces_direct_exposure_without_hiding_indirect_costs() -> None:
    commuter = oil_price_payload()
    low_driving = deepcopy(commuter)
    next(item for item in low_driving["assumptions"] if item["id"] == "monthlyFuelLitres")[
        "value"
    ] = 5

    commuter_result = simulate_oil_price(request_model(commuter), generated_at=GENERATED_AT)
    low_driving_result = simulate_oil_price(request_model(low_driving), generated_at=GENERATED_AT)

    assert commuter_result.impacts[0].annualImpactPaise == -720_000
    assert low_driving_result.impacts[0].annualImpactPaise == -90_000
    assert low_driving_result.annualNetImpactPaise == -1_806_000


def test_zero_current_crude_price_has_a_human_readable_error() -> None:
    payload = oil_price_payload()
    payload["scenario"]["currentPrice"] = 0

    with pytest.raises(ValueError, match="currentPrice must be greater than 0"):
        simulate_oil_price(request_model(payload), generated_at=GENERATED_AT)


def test_oil_price_api_runs_direct_and_indirect_channels() -> None:
    response = client.post("/v1/simulations/oil-price", json=oil_price_payload())

    assert response.status_code == 200
    result = response.json()
    assert result["scenarioType"] == "oil_price_change"
    assert result["annualNetImpactPaise"] == -2_436_000
    assert len(result["causalGraph"]["nodes"]) == 7
    assert len(result["causalGraph"]["edges"]) == 9
    assert "no LLM calculates money" in result["warnings"][0]


def test_oil_price_api_returns_assumption_errors_as_product_copy() -> None:
    payload = oil_price_payload()
    next(item for item in payload["assumptions"] if item["id"] == "crudeToRetailPassThrough")[
        "value"
    ] = 2.5

    response = client.post("/v1/simulations/oil-price", json=payload)

    assert response.status_code == 422
    assert response.json()["detail"] == {
        "code": "INVALID_OIL_PRICE_ASSUMPTION",
        "message": "assumption crudeToRetailPassThrough must be between 0 and 2",
    }
