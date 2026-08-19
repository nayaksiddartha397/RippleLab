from copy import deepcopy
from datetime import UTC, datetime

from fastapi.testclient import TestClient

from ripplelab_engine.contracts import SimulationRequest
from ripplelab_engine.income_tax import MODEL_VERSION, simulate_income_tax
from ripplelab_engine.main import app

GENERATED_AT = datetime(2026, 8, 19, 8, 0, tzinfo=UTC)
client = TestClient(app)


def _assumption(
    assumption_id: str,
    label: str,
    value: int | float | bool,
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


def income_tax_payload() -> dict:
    rates = "income-tax-ay2026-27-rates"
    relief = "income-tax-section87a"
    validation = "income-tax-itr-validation"
    return {
        "schemaVersion": "1.0.0",
        "requestId": "00000000-0000-4000-8000-000000000011",
        "country": "IN",
        "currency": "INR",
        "scenario": {
            "type": "income_tax_change",
            "effectiveRateChange": {"value": -2, "unit": "percentage_points"},
            "horizonMonths": 12,
        },
        "profile": {
            "profileId": "00000000-0000-4000-8000-000000000007",
            "capturedAt": "2026-08-19T08:00:00Z",
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
            _assumption("annualSalaryPaise", "Annual salary", 216_000_000, "paise"),
            _assumption("otherTaxableIncomePaise", "Other taxable income", 0, "paise"),
            _assumption(
                "standardDeductionPaise",
                "Standard deduction",
                7_500_000,
                "paise",
                [validation],
            ),
            _assumption("cessRateBps", "Health and Education Cess", 400, "basis_points", [rates]),
            _assumption(
                "rebateThresholdPaise",
                "Section 87A income threshold",
                120_000_000,
                "paise",
                [relief],
            ),
            _assumption(
                "rebateMaximumPaise",
                "Maximum Section 87A rebate",
                6_000_000,
                "paise",
                [relief],
            ),
            _assumption(
                "residentEligibleForRebate",
                "Resident individual eligible for Section 87A",
                True,
                "boolean",
                [relief],
            ),
        ],
        "evidence": [
            {
                "id": rates,
                "title": "Salaried Individuals for AY 2026-27",
                "publisher": "Income Tax Department",
                "sourceType": "regulation",
                "url": "https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1",
                "accessedAt": "2026-08-19T08:00:00Z",
            },
            {
                "id": relief,
                "title": "Special Regimes for Taxation of Individuals",
                "publisher": "Income Tax Department",
                "sourceType": "regulation",
                "url": "https://www.incometaxindia.gov.in/w/special-regimes-for-taxation-of-individuals-huf-aop-boi-ajp-companies-and-co-operative-societies",
                "accessedAt": "2026-08-19T08:00:00Z",
            },
            {
                "id": validation,
                "title": "ITR-1 Validation Rules AY 2026-27",
                "publisher": "Income Tax Department",
                "sourceType": "methodology",
                "url": "https://www.incometax.gov.in/iec/foportal/sites/default/files/2026-05/CBDT_e-Filing_ITR%201_Validation%20Rules_AY%202026-27.pdf",
                "accessedAt": "2026-08-19T08:00:00Z",
            },
        ],
    }


def request_model(payload: dict | None = None) -> SimulationRequest:
    return SimulationRequest.model_validate(payload or income_tax_payload())


def test_two_point_cut_calculates_tax_and_take_home_deterministically() -> None:
    result = simulate_income_tax(request_model(), generated_at=GENERATED_AT)

    assert result.modelVersion == MODEL_VERSION
    assert result.annualNetImpactPaise == 3_504_800
    assert result.uncertainty.p10AnnualImpactPaise == 1_752_400
    assert result.uncertainty.p90AnnualImpactPaise == 5_257_200
    current = next(node for node in result.causalGraph.nodes if node.id == "current-tax")
    proposed = next(node for node in result.causalGraph.nodes if node.id == "proposed-tax")
    monthly = next(
        node for node in result.causalGraph.nodes if node.id == "monthly-take-home-impact"
    )
    assert current.value == 23_010_000
    assert proposed.value == 19_505_200
    assert monthly.value == 292_067
    assert sum(impact.annualImpactPaise for impact in result.impacts) == 3_504_800


def test_zero_rate_change_has_zero_household_effect() -> None:
    payload = income_tax_payload()
    payload["scenario"]["effectiveRateChange"]["value"] = 0

    result = simulate_income_tax(request_model(payload), generated_at=GENERATED_AT)

    assert result.annualNetImpactPaise == 0
    assert all(impact.direction == "neutral" for impact in result.impacts)


def test_rebate_and_marginal_relief_are_applied_on_both_paths() -> None:
    payload = income_tax_payload()
    salary = next(item for item in payload["assumptions"] if item["id"] == "annualSalaryPaise")
    salary["value"] = 127_500_000

    result = simulate_income_tax(request_model(payload), generated_at=GENERATED_AT)

    current = next(node for node in result.causalGraph.nodes if node.id == "current-tax")
    proposed = next(node for node in result.causalGraph.nodes if node.id == "proposed-tax")
    assert current.value == 0
    assert proposed.value == 0
    assert result.annualNetImpactPaise == 0

    above_threshold = deepcopy(payload)
    next(item for item in above_threshold["assumptions"] if item["id"] == "annualSalaryPaise")[
        "value"
    ] = 128_500_000
    result = simulate_income_tax(request_model(above_threshold), generated_at=GENERATED_AT)
    current = next(node for node in result.causalGraph.nodes if node.id == "current-tax")
    assert current.value == 1_040_000


def test_income_tax_api_returns_contract_graph_and_warnings() -> None:
    response = client.post("/v1/simulations/income-tax", json=income_tax_payload())

    assert response.status_code == 200
    result = response.json()
    assert result["scenarioType"] == "income_tax_change"
    assert result["annualNetImpactPaise"] == 3_504_800
    assert len(result["causalGraph"]["nodes"]) == 7
    assert len(result["causalGraph"]["edges"]) == 7
    assert "no LLM calculates money" in result["warnings"][0]


def test_income_tax_api_rejects_invalid_standard_deduction() -> None:
    payload = income_tax_payload()
    next(item for item in payload["assumptions"] if item["id"] == "standardDeductionPaise")[
        "value"
    ] = 300_000_000

    response = client.post("/v1/simulations/income-tax", json=payload)

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "INVALID_INCOME_TAX_ASSUMPTION"
    assert "standardDeductionPaise" in response.json()["detail"]["message"]
