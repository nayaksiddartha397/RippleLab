"""End-to-end deterministic RBI repo-rate simulation."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal

from ripplelab_engine.calculations import (
    DEPOSIT_INTEREST_FORMULA_VERSION,
    FLOATING_RATE_RESET_FORMULA_VERSION,
    calculate_deposit_interest,
    calculate_floating_rate_reset,
    calculate_rate_pass_through,
)
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
SENSITIVITY_WIDTH_BPS = 2_000

LOAN_PASS_THROUGH_ID = "loanPassThrough"
DEPOSIT_PASS_THROUGH_ID = "depositPassThrough"
REMAINING_TERM_ID = "remainingLoanTermMonths"
DEPOSIT_RATE_ID = "currentDepositRateBps"


def simulate_repo_rate(
    request: SimulationRequest,
    *,
    generated_at: datetime | None = None,
) -> SimulationResult:
    """Run one personalized repo-rate scenario using only deterministic formulas."""

    if request.scenario.type != "repo_rate_change":
        raise ValueError("scenario.type must be repo_rate_change for this endpoint")
    if not request.evidence:
        raise ValueError("evidence must include at least one source for a repo-rate simulation")

    loan_pass_through_bps = _ratio_assumption(request, LOAN_PASS_THROUGH_ID)
    deposit_pass_through_bps = _ratio_assumption(request, DEPOSIT_PASS_THROUGH_ID)
    remaining_term_months = _integer_assumption(
        request,
        REMAINING_TERM_ID,
        expected_unit="months",
        minimum=1,
        maximum=1_200,
    )
    current_deposit_rate_bps = _integer_assumption(
        request,
        DEPOSIT_RATE_ID,
        expected_unit="basis_points",
        minimum=0,
        maximum=10_000,
    )

    baseline = _calculate_outcome(
        request,
        loan_pass_through_bps=loan_pass_through_bps,
        deposit_pass_through_bps=deposit_pass_through_bps,
        remaining_term_months=remaining_term_months,
        current_deposit_rate_bps=current_deposit_rate_bps,
    )
    bounds = _deterministic_bounds(
        request,
        loan_pass_through_bps=loan_pass_through_bps,
        deposit_pass_through_bps=deposit_pass_through_bps,
        remaining_term_months=remaining_term_months,
        current_deposit_rate_bps=current_deposit_rate_bps,
    )

    citation_ids = [citation.id for citation in request.evidence]
    loan_confidence = _confidence(
        evidence=3,
        directness=4,
        stability=4,
        personalization=4,
        recency=1,
        rationale=(
            "The balance and loan rate are personalized; pass-through and reset timing "
            "remain user-selected assumptions."
        ),
    )
    deposit_confidence = _confidence(
        evidence=3,
        directness=3,
        stability=3,
        personalization=3,
        recency=1,
        rationale=(
            "The deposit balance is personalized; renewal timing and bank repricing are "
            "not present in the saved profile."
        ),
    )
    overall_confidence = _confidence(
        evidence=3,
        directness=4,
        stability=4,
        personalization=3,
        recency=1,
        rationale=(
            "Loan and deposit amounts are personal and the arithmetic is deterministic. "
            "Transmission ratios, loan term and deposit renewal timing remain assumptions."
        ),
    )

    return SimulationResult(
        schemaVersion=request.schemaVersion,
        requestId=request.requestId,
        scenarioType="repo_rate_change",
        modelVersion=MODEL_VERSION,
        generatedAt=generated_at or datetime.now(UTC),
        currency="INR",
        annualNetImpactPaise=baseline.annual_net_impact_paise,
        confidence=overall_confidence,
        uncertainty=UncertaintyRange(
            p10AnnualImpactPaise=bounds[0],
            p50AnnualImpactPaise=baseline.annual_net_impact_paise,
            p90AnnualImpactPaise=bounds[1],
            method="deterministic_bounds",
        ),
        impacts=[
            Impact(
                id="home-loan-emi",
                label="Home-loan payments",
                direction=_direction(baseline.loan_annual_impact_paise),
                annualImpactPaise=baseline.loan_annual_impact_paise,
                mechanism=(
                    "The selected share of the repo-rate change reprices the floating loan; "
                    "the remaining term stays fixed and the EMI is recalculated."
                ),
                confidence=loan_confidence,
                causalNodeId="monthly-emi",
            ),
            Impact(
                id="deposit-income",
                label="Fixed-deposit income",
                direction=_direction(baseline.deposit_annual_impact_paise),
                annualImpactPaise=baseline.deposit_annual_impact_paise,
                mechanism=(
                    "The selected share of the repo-rate change reprices the modeled annual "
                    "deposit rate on the saved fixed-deposit balance."
                ),
                confidence=deposit_confidence,
                causalNodeId="deposit-income",
            ),
        ],
        causalGraph=CausalGraph(
            nodes=[
                CausalNode(
                    id="repo-rate",
                    label="RBI repo rate",
                    kind="policy",
                    value=request.scenario.change.value,
                    unit="basis_points",
                ),
                CausalNode(
                    id="loan-rate",
                    label="Floating loan rate",
                    kind="financial_product",
                    value=float(baseline.resulting_loan_rate_bps),
                    unit="basis_points",
                ),
                CausalNode(
                    id="monthly-emi",
                    label="Monthly EMI",
                    kind="household",
                    value=baseline.reset_monthly_payment_paise,
                    unit="paise",
                ),
                CausalNode(
                    id="deposit-rate",
                    label="Deposit renewal rate",
                    kind="financial_product",
                    value=baseline.resulting_deposit_rate_bps,
                    unit="basis_points",
                ),
                CausalNode(
                    id="deposit-income",
                    label="Deposit income",
                    kind="household",
                    value=baseline.deposit_annual_impact_paise,
                    unit="paise_per_year",
                ),
            ],
            edges=[
                CausalEdge(
                    id="repo-to-loan-rate",
                    source="repo-rate",
                    target="loan-rate",
                    direction="positive",
                    mechanism="Policy-rate changes can transmit to floating lending benchmarks.",
                    lagMonths=LagMonths(minimum=1, maximum=6),
                    assumptionIds=[LOAN_PASS_THROUGH_ID],
                    citationIds=citation_ids,
                    confidence=loan_confidence,
                ),
                CausalEdge(
                    id="loan-rate-to-emi",
                    source="loan-rate",
                    target="monthly-emi",
                    direction="positive",
                    mechanism=(
                        "At a constant remaining term, the amortizing-loan formula maps the "
                        "reset rate to a new monthly payment."
                    ),
                    lagMonths=LagMonths(minimum=0, maximum=1),
                    assumptionIds=[LOAN_PASS_THROUGH_ID, REMAINING_TERM_ID],
                    citationIds=citation_ids,
                    confidence=loan_confidence,
                ),
                CausalEdge(
                    id="repo-to-deposit-rate",
                    source="repo-rate",
                    target="deposit-rate",
                    direction="positive",
                    mechanism="Banks may reprice new and renewing deposits after policy changes.",
                    lagMonths=LagMonths(minimum=1, maximum=12),
                    assumptionIds=[DEPOSIT_PASS_THROUGH_ID, DEPOSIT_RATE_ID],
                    citationIds=citation_ids,
                    confidence=deposit_confidence,
                ),
                CausalEdge(
                    id="deposit-rate-to-income",
                    source="deposit-rate",
                    target="deposit-income",
                    direction="positive",
                    mechanism=(
                        "The simple-interest formula maps the modeled renewal rate to gross "
                        "annual interest on the saved deposit balance."
                    ),
                    lagMonths=LagMonths(minimum=0, maximum=12),
                    assumptionIds=[DEPOSIT_PASS_THROUGH_ID, DEPOSIT_RATE_ID],
                    citationIds=citation_ids,
                    confidence=deposit_confidence,
                ),
            ],
        ),
        assumptions=request.assumptions,
        citations=request.evidence,
        warnings=[
            (
                "Deterministic outputs use "
                f"{FLOATING_RATE_RESET_FORMULA_VERSION} and "
                f"{DEPOSIT_INTEREST_FORMULA_VERSION}; no LLM calculates money."
            ),
            (
                "The uncertainty band is a deterministic sensitivity check using plus or "
                "minus 20 percentage points around both pass-through assumptions; it is not "
                "a probability forecast."
            ),
            (
                "Loan reset dates, benchmark spreads, deposit maturity timing, tax, fees and "
                "future policy changes are not modeled."
            ),
            "Educational simulation only; this result is not financial advice.",
        ],
    )


class _Outcome:
    def __init__(
        self,
        *,
        annual_net_impact_paise: int,
        deposit_annual_impact_paise: int,
        loan_annual_impact_paise: int,
        original_monthly_payment_paise: int,
        reset_monthly_payment_paise: int,
        resulting_deposit_rate_bps: int,
        resulting_loan_rate_bps: Decimal,
    ) -> None:
        self.annual_net_impact_paise = annual_net_impact_paise
        self.deposit_annual_impact_paise = deposit_annual_impact_paise
        self.loan_annual_impact_paise = loan_annual_impact_paise
        self.original_monthly_payment_paise = original_monthly_payment_paise
        self.reset_monthly_payment_paise = reset_monthly_payment_paise
        self.resulting_deposit_rate_bps = resulting_deposit_rate_bps
        self.resulting_loan_rate_bps = resulting_loan_rate_bps


def _calculate_outcome(
    request: SimulationRequest,
    *,
    loan_pass_through_bps: int,
    deposit_pass_through_bps: int,
    remaining_term_months: int,
    current_deposit_rate_bps: int,
) -> _Outcome:
    loan = calculate_floating_rate_reset(
        outstanding_principal_paise=request.profile.outstandingHomeLoanPaise,
        current_annual_rate_bps=request.profile.weightedLoanRateBps,
        remaining_term_months=remaining_term_months,
        reference_rate_change_bps=request.scenario.change.value,
        pass_through_ratio_bps=loan_pass_through_bps,
    )
    deposit_change = calculate_rate_pass_through(
        request.scenario.change.value,
        deposit_pass_through_bps,
    )
    resulting_deposit_rate = _nearest_basis_point(
        Decimal(current_deposit_rate_bps) + deposit_change.applied_change_bps
    )
    if resulting_deposit_rate < 0 or resulting_deposit_rate > 10_000:
        raise ValueError("resulting deposit rate must be between 0 and 10000 basis points")

    current_deposit = calculate_deposit_interest(
        request.profile.fixedDepositsPaise,
        current_deposit_rate_bps,
    )
    reset_deposit = calculate_deposit_interest(
        request.profile.fixedDepositsPaise,
        resulting_deposit_rate,
    )
    loan_annual_impact = -loan.monthly_payment_change_paise * 12
    deposit_annual_impact = (
        reset_deposit.gross_interest_paise - current_deposit.gross_interest_paise
    )
    return _Outcome(
        annual_net_impact_paise=loan_annual_impact + deposit_annual_impact,
        deposit_annual_impact_paise=deposit_annual_impact,
        loan_annual_impact_paise=loan_annual_impact,
        original_monthly_payment_paise=loan.original_monthly_payment_paise,
        reset_monthly_payment_paise=loan.reset_monthly_payment_paise,
        resulting_deposit_rate_bps=resulting_deposit_rate,
        resulting_loan_rate_bps=loan.resulting_annual_rate_bps,
    )


def _deterministic_bounds(
    request: SimulationRequest,
    *,
    loan_pass_through_bps: int,
    deposit_pass_through_bps: int,
    remaining_term_months: int,
    current_deposit_rate_bps: int,
) -> tuple[int, int]:
    loan_ratios = {
        max(0, loan_pass_through_bps - SENSITIVITY_WIDTH_BPS),
        min(10_000, loan_pass_through_bps + SENSITIVITY_WIDTH_BPS),
    }
    deposit_ratios = {
        max(0, deposit_pass_through_bps - SENSITIVITY_WIDTH_BPS),
        min(10_000, deposit_pass_through_bps + SENSITIVITY_WIDTH_BPS),
    }
    outcomes = [
        _calculate_outcome(
            request,
            loan_pass_through_bps=loan_ratio,
            deposit_pass_through_bps=deposit_ratio,
            remaining_term_months=remaining_term_months,
            current_deposit_rate_bps=current_deposit_rate_bps,
        ).annual_net_impact_paise
        for loan_ratio in loan_ratios
        for deposit_ratio in deposit_ratios
    ]
    return min(outcomes), max(outcomes)


def _assumption(request: SimulationRequest, assumption_id: str) -> Assumption:
    for assumption in request.assumptions:
        if assumption.id == assumption_id:
            return assumption
    raise ValueError(f"assumptions must include {assumption_id}")


def _decimal_value(assumption: Assumption) -> Decimal:
    if isinstance(assumption.value, bool) or not isinstance(assumption.value, (int, float)):
        raise ValueError(f"assumption {assumption.id} must have a numeric value")
    return Decimal(str(assumption.value))


def _ratio_assumption(request: SimulationRequest, assumption_id: str) -> int:
    assumption = _assumption(request, assumption_id)
    if assumption.unit != "ratio":
        raise ValueError(f"assumption {assumption_id} must use unit ratio")
    value = _decimal_value(assumption)
    if value < 0 or value > 1:
        raise ValueError(f"assumption {assumption_id} must be between 0 and 1")
    return int((value * Decimal(10_000)).quantize(Decimal(1), rounding=ROUND_HALF_UP))


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
    value = _decimal_value(assumption)
    if value != value.to_integral_value():
        raise ValueError(f"assumption {assumption_id} must be a whole number")
    integer_value = int(value)
    if integer_value < minimum or integer_value > maximum:
        raise ValueError(f"assumption {assumption_id} must be between {minimum} and {maximum}")
    return integer_value


def _nearest_basis_point(value: Decimal) -> int:
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
    score = (
        sum(
            [evidence, directness, stability, personalization, recency],
        )
        * 5
    )
    level = "high" if score >= 80 else "medium" if score >= 40 else "low"
    return Confidence(score=score, level=level, dimensions=dimensions, rationale=rationale)


__all__ = ["MODEL_VERSION", "simulate_repo_rate"]
