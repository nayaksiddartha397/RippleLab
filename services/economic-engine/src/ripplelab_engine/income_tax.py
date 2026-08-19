"""Personal income-tax simulation for India's AY 2026-27 new tax regime."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal

from ripplelab_engine.contracts import (
    Assumption,
    CausalEdge,
    CausalGraph,
    CausalNode,
    Confidence,
    ConfidenceDimensions,
    Impact,
    LagMonths,
    SimulationRequest,
    SimulationResult,
    UncertaintyRange,
)

MODEL_VERSION = "1.0.0"
TAXABLE_INCOME_FORMULA_VERSION = "tax.taxable_income.v1"
SLAB_TAX_FORMULA_VERSION = "tax.ay2026_27_new_regime.v1"
RELIEF_FORMULA_VERSION = "tax.section87a_relief.v1"
CESS_FORMULA_VERSION = "tax.health_education_cess.v1"
SENSITIVITY_WIDTH_BPS = 100

ANNUAL_SALARY_ID = "annualSalaryPaise"
OTHER_INCOME_ID = "otherTaxableIncomePaise"
STANDARD_DEDUCTION_ID = "standardDeductionPaise"
CESS_RATE_ID = "cessRateBps"
REBATE_THRESHOLD_ID = "rebateThresholdPaise"
REBATE_MAX_ID = "rebateMaximumPaise"
REBATE_ELIGIBILITY_ID = "residentEligibleForRebate"


@dataclass(frozen=True, slots=True)
class TaxSlab:
    id: str
    label: str
    lower_paise: int
    upper_paise: int | None
    rate_bps: int


@dataclass(frozen=True, slots=True)
class SlabOutcome:
    slab: TaxSlab
    taxable_slice_paise: int
    current_rate_bps: int
    proposed_rate_bps: int
    current_tax_paise: int
    proposed_tax_paise: int


@dataclass(frozen=True, slots=True)
class TaxCalculation:
    base_tax_paise: int
    relief_paise: int
    cess_paise: int
    total_tax_paise: int


@dataclass(frozen=True, slots=True)
class IncomeTaxOutcome:
    gross_income_paise: int
    taxable_income_paise: int
    slabs: tuple[SlabOutcome, ...]
    current: TaxCalculation
    proposed: TaxCalculation
    annual_net_impact_paise: int
    monthly_take_home_impact_paise: int


TAX_SLABS = (
    TaxSlab("zero", "Up to ₹4 lakh", 0, 40_000_000, 0),
    TaxSlab("five", "₹4-8 lakh", 40_000_000, 80_000_000, 500),
    TaxSlab("ten", "₹8-12 lakh", 80_000_000, 120_000_000, 1_000),
    TaxSlab("fifteen", "₹12-16 lakh", 120_000_000, 160_000_000, 1_500),
    TaxSlab("twenty", "₹16-20 lakh", 160_000_000, 200_000_000, 2_000),
    TaxSlab("twenty-five", "₹20-24 lakh", 200_000_000, 240_000_000, 2_500),
    TaxSlab("thirty", "Above ₹24 lakh", 240_000_000, None, 3_000),
)


def simulate_income_tax(
    request: SimulationRequest,
    *,
    generated_at: datetime | None = None,
) -> SimulationResult:
    """Compare current and shifted new-regime marginal rates for one salaried profile."""

    if request.scenario.type != "income_tax_change":
        raise ValueError("scenario.type must be income_tax_change for this endpoint")
    if not request.evidence:
        raise ValueError("evidence must include at least one source for an income-tax simulation")

    annual_salary = _integer_assumption(
        request, ANNUAL_SALARY_ID, expected_unit="paise", minimum=0, maximum=1_000_000_000_000
    )
    other_income = _integer_assumption(
        request, OTHER_INCOME_ID, expected_unit="paise", minimum=0, maximum=1_000_000_000_000
    )
    standard_deduction = _integer_assumption(
        request,
        STANDARD_DEDUCTION_ID,
        expected_unit="paise",
        minimum=0,
        maximum=annual_salary,
    )
    cess_rate_bps = _integer_assumption(
        request, CESS_RATE_ID, expected_unit="basis_points", minimum=0, maximum=10_000
    )
    rebate_threshold = _integer_assumption(
        request,
        REBATE_THRESHOLD_ID,
        expected_unit="paise",
        minimum=0,
        maximum=1_000_000_000_000,
    )
    rebate_maximum = _integer_assumption(
        request,
        REBATE_MAX_ID,
        expected_unit="paise",
        minimum=0,
        maximum=1_000_000_000_000,
    )
    rebate_eligible = _boolean_assumption(request, REBATE_ELIGIBILITY_ID)
    selected_shift_bps = _rate_shift_bps(request.scenario.effectiveRateChange.value)

    baseline = _calculate_outcome(
        annual_salary_paise=annual_salary,
        other_income_paise=other_income,
        standard_deduction_paise=standard_deduction,
        rate_shift_bps=selected_shift_bps,
        cess_rate_bps=cess_rate_bps,
        rebate_threshold_paise=rebate_threshold,
        rebate_maximum_paise=rebate_maximum,
        rebate_eligible=rebate_eligible,
    )
    lower, upper = _deterministic_bounds(
        annual_salary_paise=annual_salary,
        other_income_paise=other_income,
        standard_deduction_paise=standard_deduction,
        rate_shift_bps=selected_shift_bps,
        cess_rate_bps=cess_rate_bps,
        rebate_threshold_paise=rebate_threshold,
        rebate_maximum_paise=rebate_maximum,
        rebate_eligible=rebate_eligible,
    )

    confidence = _confidence(
        evidence=4,
        directness=4,
        stability=4,
        personalization=3,
        recency=4,
        rationale=(
            "Official AY 2026-27 slabs, rebate rules and cess feed deterministic arithmetic; "
            "the entered salary and simplified taxable-income boundary remain user assumptions."
        ),
    )
    tax_citation_ids = _present_citation_ids(
        request,
        ["income-tax-ay2026-27-rates", "income-tax-section87a", "income-tax-itr-validation"],
    )
    assumption_ids = [
        ANNUAL_SALARY_ID,
        OTHER_INCOME_ID,
        STANDARD_DEDUCTION_ID,
        CESS_RATE_ID,
        REBATE_THRESHOLD_ID,
        REBATE_MAX_ID,
        REBATE_ELIGIBILITY_ID,
    ]

    slab_impacts = [
        Impact(
            id=f"tax-slab-{item.slab.id}-impact",
            label=item.slab.label,
            direction=_direction(item.current_tax_paise - item.proposed_tax_paise),
            annualImpactPaise=item.current_tax_paise - item.proposed_tax_paise,
            mechanism=(
                "The taxable slice inside this band is multiplied by the current and shifted "
                "marginal rates; the difference is household cash flow."
            ),
            confidence=confidence,
            causalNodeId="proposed-tax",
        )
        for item in baseline.slabs
        if item.slab.rate_bps > 0
    ]
    relief_impact = baseline.proposed.relief_paise - baseline.current.relief_paise
    cess_impact = baseline.current.cess_paise - baseline.proposed.cess_paise

    return SimulationResult(
        schemaVersion=request.schemaVersion,
        requestId=request.requestId,
        scenarioType="income_tax_change",
        modelVersion=MODEL_VERSION,
        generatedAt=generated_at or datetime.now(UTC),
        currency="INR",
        annualNetImpactPaise=baseline.annual_net_impact_paise,
        confidence=confidence,
        uncertainty=UncertaintyRange(
            p10AnnualImpactPaise=lower,
            p50AnnualImpactPaise=baseline.annual_net_impact_paise,
            p90AnnualImpactPaise=upper,
            method="deterministic_bounds",
        ),
        impacts=[
            *slab_impacts,
            Impact(
                id="rebate-relief-impact",
                label="Section 87A rebate and marginal relief",
                direction=_direction(relief_impact),
                annualImpactPaise=relief_impact,
                mechanism=(
                    "Current and proposed liabilities apply the same entered rebate threshold, "
                    "maximum rebate and marginal-relief rule."
                ),
                confidence=confidence,
                causalNodeId="annual-tax-impact",
            ),
            Impact(
                id="cess-impact",
                label="Health and Education Cess",
                direction=_direction(cess_impact),
                annualImpactPaise=cess_impact,
                mechanism=(
                    "The entered cess rate is applied after rebate or marginal relief, so the "
                    "cess amount changes with the proposed tax liability."
                ),
                confidence=confidence,
                causalNodeId="annual-tax-impact",
            ),
        ],
        causalGraph=CausalGraph(
            nodes=[
                CausalNode(
                    id="annual-gross-income",
                    label="Annual salary and other income",
                    kind="household",
                    value=baseline.gross_income_paise,
                    unit="paise_per_year",
                ),
                CausalNode(
                    id="taxable-income",
                    label="Modeled taxable income",
                    kind="household",
                    value=baseline.taxable_income_paise,
                    unit="paise_per_year",
                ),
                CausalNode(
                    id="policy-rate-shift",
                    label="Non-zero marginal-rate change",
                    kind="policy",
                    value=request.scenario.effectiveRateChange.value,
                    unit="percentage_points",
                ),
                CausalNode(
                    id="current-tax",
                    label="Current total income tax",
                    kind="financial_product",
                    value=baseline.current.total_tax_paise,
                    unit="paise_per_year",
                ),
                CausalNode(
                    id="proposed-tax",
                    label="Proposed total income tax",
                    kind="financial_product",
                    value=baseline.proposed.total_tax_paise,
                    unit="paise_per_year",
                ),
                CausalNode(
                    id="annual-tax-impact",
                    label="Annual take-home impact",
                    kind="outcome",
                    value=baseline.annual_net_impact_paise,
                    unit="paise_per_year",
                ),
                CausalNode(
                    id="monthly-take-home-impact",
                    label="Monthly take-home impact",
                    kind="outcome",
                    value=baseline.monthly_take_home_impact_paise,
                    unit="paise_per_month",
                ),
            ],
            edges=[
                CausalEdge(
                    id="gross-to-taxable",
                    source="annual-gross-income",
                    target="taxable-income",
                    direction="positive",
                    mechanism=(
                        "The entered standard deduction is subtracted from salary, then other "
                        "taxable income is added, with taxable income floored at zero."
                    ),
                    lagMonths=LagMonths(minimum=0, maximum=0),
                    assumptionIds=[ANNUAL_SALARY_ID, OTHER_INCOME_ID, STANDARD_DEDUCTION_ID],
                    citationIds=tax_citation_ids,
                    confidence=confidence,
                ),
                CausalEdge(
                    id="taxable-to-current-tax",
                    source="taxable-income",
                    target="current-tax",
                    direction="positive",
                    mechanism=(
                        "AY 2026-27 new-regime marginal slabs are applied before Section 87A "
                        "relief and Health and Education Cess."
                    ),
                    lagMonths=LagMonths(minimum=0, maximum=request.scenario.horizonMonths),
                    assumptionIds=[
                        CESS_RATE_ID,
                        REBATE_THRESHOLD_ID,
                        REBATE_MAX_ID,
                        REBATE_ELIGIBILITY_ID,
                    ],
                    citationIds=tax_citation_ids,
                    confidence=confidence,
                ),
                CausalEdge(
                    id="taxable-to-proposed-tax",
                    source="taxable-income",
                    target="proposed-tax",
                    direction="positive",
                    mechanism=(
                        "The same taxable income is evaluated under shifted non-zero marginal "
                        "rates so only the selected policy variable changes."
                    ),
                    lagMonths=LagMonths(minimum=0, maximum=request.scenario.horizonMonths),
                    assumptionIds=[
                        CESS_RATE_ID,
                        REBATE_THRESHOLD_ID,
                        REBATE_MAX_ID,
                        REBATE_ELIGIBILITY_ID,
                    ],
                    citationIds=tax_citation_ids,
                    confidence=confidence,
                ),
                CausalEdge(
                    id="policy-to-proposed-tax",
                    source="policy-rate-shift",
                    target="proposed-tax",
                    direction="negative" if selected_shift_bps < 0 else "positive",
                    mechanism=(
                        "The selected percentage-point change is added to every non-zero marginal "
                        "rate and each resulting rate is bounded between 0% and 100%."
                    ),
                    lagMonths=LagMonths(minimum=0, maximum=request.scenario.horizonMonths),
                    assumptionIds=[],
                    citationIds=tax_citation_ids,
                    confidence=confidence,
                ),
                CausalEdge(
                    id="current-tax-to-impact",
                    source="current-tax",
                    target="annual-tax-impact",
                    direction="positive",
                    mechanism=(
                        "Current total tax is the baseline side of current tax minus proposed tax."
                    ),
                    lagMonths=LagMonths(minimum=0, maximum=request.scenario.horizonMonths),
                    assumptionIds=assumption_ids,
                    citationIds=tax_citation_ids,
                    confidence=confidence,
                ),
                CausalEdge(
                    id="proposed-tax-to-impact",
                    source="proposed-tax",
                    target="annual-tax-impact",
                    direction="negative",
                    mechanism="Proposed total tax is subtracted from current total tax.",
                    lagMonths=LagMonths(minimum=0, maximum=request.scenario.horizonMonths),
                    assumptionIds=assumption_ids,
                    citationIds=tax_citation_ids,
                    confidence=confidence,
                ),
                CausalEdge(
                    id="annual-to-monthly-tax-impact",
                    source="annual-tax-impact",
                    target="monthly-take-home-impact",
                    direction="positive",
                    mechanism=(
                        "The annual take-home effect is divided by 12 for a monthly equivalent."
                    ),
                    lagMonths=LagMonths(minimum=0, maximum=request.scenario.horizonMonths),
                    assumptionIds=[],
                    citationIds=tax_citation_ids,
                    confidence=confidence,
                ),
            ],
        ),
        assumptions=request.assumptions,
        citations=request.evidence,
        warnings=[
            (
                "Deterministic outputs use "
                f"{TAXABLE_INCOME_FORMULA_VERSION}, {SLAB_TAX_FORMULA_VERSION}, "
                f"{RELIEF_FORMULA_VERSION} and {CESS_FORMULA_VERSION}; no LLM calculates money."
            ),
            (
                "The baseline is the AY 2026-27 new tax regime for an eligible resident salaried "
                "individual, using the entered ₹75,000 standard deduction by default."
            ),
            (
                "The sensitivity band moves the selected marginal-rate change by plus or minus "
                "1 percentage point; it is not a probability forecast."
            ),
            (
                "Surcharge, special-rate income, exemptions, losses, employer benefits, rounding "
                "rules and deductions beyond the entered standard deduction are outside this model."
            ),
            (
                "Educational estimate only; confirm filing decisions with the Income Tax "
                "Department or a tax professional."
            ),
        ],
    )


def _calculate_outcome(
    *,
    annual_salary_paise: int,
    other_income_paise: int,
    standard_deduction_paise: int,
    rate_shift_bps: int,
    cess_rate_bps: int,
    rebate_threshold_paise: int,
    rebate_maximum_paise: int,
    rebate_eligible: bool,
) -> IncomeTaxOutcome:
    gross_income = annual_salary_paise + other_income_paise
    taxable_income = max(0, annual_salary_paise - standard_deduction_paise + other_income_paise)
    slab_outcomes = tuple(
        _slab_outcome(slab, taxable_income=taxable_income, rate_shift_bps=rate_shift_bps)
        for slab in TAX_SLABS
    )
    current_base = sum(item.current_tax_paise for item in slab_outcomes)
    proposed_base = sum(item.proposed_tax_paise for item in slab_outcomes)
    current = _finish_tax(
        current_base,
        taxable_income_paise=taxable_income,
        cess_rate_bps=cess_rate_bps,
        rebate_threshold_paise=rebate_threshold_paise,
        rebate_maximum_paise=rebate_maximum_paise,
        rebate_eligible=rebate_eligible,
    )
    proposed = _finish_tax(
        proposed_base,
        taxable_income_paise=taxable_income,
        cess_rate_bps=cess_rate_bps,
        rebate_threshold_paise=rebate_threshold_paise,
        rebate_maximum_paise=rebate_maximum_paise,
        rebate_eligible=rebate_eligible,
    )
    annual_impact = current.total_tax_paise - proposed.total_tax_paise
    return IncomeTaxOutcome(
        gross_income_paise=gross_income,
        taxable_income_paise=taxable_income,
        slabs=slab_outcomes,
        current=current,
        proposed=proposed,
        annual_net_impact_paise=annual_impact,
        monthly_take_home_impact_paise=_round_money(Decimal(annual_impact) / Decimal(12)),
    )


def _slab_outcome(slab: TaxSlab, *, taxable_income: int, rate_shift_bps: int) -> SlabOutcome:
    upper = taxable_income if slab.upper_paise is None else min(taxable_income, slab.upper_paise)
    taxable_slice = max(0, upper - slab.lower_paise)
    proposed_rate = 0 if slab.rate_bps == 0 else min(10_000, max(0, slab.rate_bps + rate_shift_bps))
    return SlabOutcome(
        slab=slab,
        taxable_slice_paise=taxable_slice,
        current_rate_bps=slab.rate_bps,
        proposed_rate_bps=proposed_rate,
        current_tax_paise=_round_money(
            Decimal(taxable_slice) * Decimal(slab.rate_bps) / Decimal(10_000)
        ),
        proposed_tax_paise=_round_money(
            Decimal(taxable_slice) * Decimal(proposed_rate) / Decimal(10_000)
        ),
    )


def _finish_tax(
    base_tax_paise: int,
    *,
    taxable_income_paise: int,
    cess_rate_bps: int,
    rebate_threshold_paise: int,
    rebate_maximum_paise: int,
    rebate_eligible: bool,
) -> TaxCalculation:
    relief = 0
    if rebate_eligible:
        if taxable_income_paise <= rebate_threshold_paise:
            relief = min(base_tax_paise, rebate_maximum_paise)
        else:
            excess_income = taxable_income_paise - rebate_threshold_paise
            relief = max(0, base_tax_paise - excess_income)
    tax_after_relief = max(0, base_tax_paise - relief)
    cess = _round_money(Decimal(tax_after_relief) * Decimal(cess_rate_bps) / Decimal(10_000))
    return TaxCalculation(
        base_tax_paise=base_tax_paise,
        relief_paise=relief,
        cess_paise=cess,
        total_tax_paise=tax_after_relief + cess,
    )


def _deterministic_bounds(**inputs: int | bool) -> tuple[int, int]:
    rate_shift_bps = int(inputs.pop("rate_shift_bps"))
    variants = [
        _calculate_outcome(
            **inputs,
            rate_shift_bps=rate_shift_bps + adjustment,
        ).annual_net_impact_paise
        for adjustment in (-SENSITIVITY_WIDTH_BPS, SENSITIVITY_WIDTH_BPS)
    ]
    return min(variants), max(variants)


def _rate_shift_bps(value: int | float) -> int:
    return int((Decimal(str(value)) * Decimal(100)).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def _assumption(request: SimulationRequest, assumption_id: str) -> Assumption:
    for assumption in request.assumptions:
        if assumption.id == assumption_id:
            return assumption
    raise ValueError(f"assumptions must include {assumption_id}")


def _numeric_value(assumption: Assumption) -> Decimal:
    if isinstance(assumption.value, bool) or not isinstance(assumption.value, (int, float)):
        raise ValueError(f"assumption {assumption.id} must have a numeric value")
    return Decimal(str(assumption.value))


def _integer_assumption(
    request: SimulationRequest,
    assumption_id: str,
    *,
    expected_unit: str,
    minimum: int,
    maximum: int,
) -> int:
    assumption = _assumption(request, assumption_id)
    if assumption.unit != expected_unit:
        raise ValueError(f"assumption {assumption_id} must use unit {expected_unit}")
    value = _numeric_value(assumption)
    if value < minimum or value > maximum:
        raise ValueError(f"assumption {assumption_id} must be between {minimum} and {maximum}")
    if value != value.to_integral_value():
        raise ValueError(f"assumption {assumption_id} must be a whole number")
    return int(value)


def _boolean_assumption(request: SimulationRequest, assumption_id: str) -> bool:
    assumption = _assumption(request, assumption_id)
    if assumption.unit != "boolean":
        raise ValueError(f"assumption {assumption_id} must use unit boolean")
    if not isinstance(assumption.value, bool):
        raise ValueError(f"assumption {assumption_id} must have a boolean value")
    return assumption.value


def _present_citation_ids(request: SimulationRequest, wanted: list[str]) -> list[str]:
    available = {citation.id for citation in request.evidence}
    selected = [citation_id for citation_id in wanted if citation_id in available]
    return selected or [citation.id for citation in request.evidence]


def _round_money(value: Decimal) -> int:
    return int(value.quantize(Decimal(1), rounding=ROUND_HALF_UP))


def _direction(value: int) -> str:
    if value > 0:
        return "benefit"
    if value < 0:
        return "cost"
    return "neutral"


def _confidence(
    *,
    evidence: int,
    directness: int,
    stability: int,
    personalization: int,
    recency: int,
    rationale: str,
) -> Confidence:
    dimensions = ConfidenceDimensions(
        evidenceQuality=evidence,
        causalDirectness=directness,
        modelStability=stability,
        personalizationCoverage=personalization,
        dataRecency=recency,
    )
    score = sum([evidence, directness, stability, personalization, recency]) * 5
    level = "high" if score >= 80 else "medium" if score >= 40 else "low"
    return Confidence(score=score, level=level, dimensions=dimensions, rationale=rationale)


__all__ = ["MODEL_VERSION", "simulate_income_tax"]
