"""Personal household inflation simulation with explicit basket assumptions."""

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
CATEGORY_PROJECTION_FORMULA_VERSION = "inflation.category_projection.v1"
PERSONAL_BASKET_FORMULA_VERSION = "inflation.personal_basket.v1"
REAL_GROWTH_FORMULA_VERSION = "inflation.real_growth.v1"
SENSITIVITY_WIDTH_BPS = 2_000
MAX_PASS_THROUGH_BPS = 20_000

SALARY_GROWTH_ID = "salaryGrowthBps"
PORTFOLIO_RETURN_ID = "portfolioReturnBps"


@dataclass(frozen=True, slots=True)
class CategoryDefinition:
    id: str
    label: str
    spend_assumption_id: str
    pass_through_assumption_id: str


@dataclass(frozen=True, slots=True)
class CategoryOutcome:
    definition: CategoryDefinition
    monthly_spend_paise: int
    pass_through_bps: int
    baseline_rate_bps: Decimal
    target_rate_bps: Decimal
    baseline_projected_monthly_paise: int
    target_projected_monthly_paise: int
    annual_impact_paise: int


@dataclass(frozen=True, slots=True)
class InflationOutcome:
    categories: tuple[CategoryOutcome, ...]
    annual_expense_impact_paise: int
    baseline_monthly_expenses_paise: int
    target_monthly_expenses_paise: int
    personal_target_inflation_bps: Decimal
    salary_real_growth_bps: Decimal
    salary_real_annual_impact_paise: int
    portfolio_real_return_bps: Decimal
    portfolio_real_annual_impact_paise: int


CATEGORIES = (
    CategoryDefinition("food", "Food and groceries", "foodSpendPaise", "foodPassThrough"),
    CategoryDefinition("housing", "Housing", "housingSpendPaise", "housingPassThrough"),
    CategoryDefinition("transport", "Transport", "transportSpendPaise", "transportPassThrough"),
    CategoryDefinition("utilities", "Utilities", "utilitiesSpendPaise", "utilitiesPassThrough"),
    CategoryDefinition("other", "Other spending", "otherSpendPaise", "otherPassThrough"),
)


def simulate_inflation(
    request: SimulationRequest,
    *,
    generated_at: datetime | None = None,
) -> SimulationResult:
    """Compare current and target inflation paths for one personal expense basket."""

    if request.scenario.type != "inflation_change":
        raise ValueError("scenario.type must be inflation_change for this endpoint")
    if not request.evidence:
        raise ValueError("evidence must include at least one source for an inflation simulation")

    category_inputs = tuple(
        (
            definition,
            _integer_assumption(
                request,
                definition.spend_assumption_id,
                expected_unit="paise",
                minimum=0,
                maximum=100_000_000_000,
            ),
            _ratio_assumption(request, definition.pass_through_assumption_id),
        )
        for definition in CATEGORIES
    )
    if sum(spend for _, spend, _ in category_inputs) <= 0:
        raise ValueError("the personal expense basket must contain at least one positive category")

    salary_growth_bps = _integer_assumption(
        request,
        SALARY_GROWTH_ID,
        expected_unit="basis_points",
        minimum=-10_000,
        maximum=100_000,
    )
    portfolio_return_bps = _integer_assumption(
        request,
        PORTFOLIO_RETURN_ID,
        expected_unit="basis_points",
        minimum=-10_000,
        maximum=100_000,
    )
    baseline = _calculate_outcome(
        request,
        category_inputs=category_inputs,
        salary_growth_bps=salary_growth_bps,
        portfolio_return_bps=portfolio_return_bps,
    )
    lower, upper = _deterministic_bounds(
        request,
        category_inputs=category_inputs,
        salary_growth_bps=salary_growth_bps,
        portfolio_return_bps=portfolio_return_bps,
    )

    citation_ids = [citation.id for citation in request.evidence]
    expense_confidence = _confidence(
        evidence=3,
        directness=3,
        stability=2,
        personalization=4,
        recency=3,
        rationale=(
            "Monthly category spending is personalized and arithmetic is deterministic; "
            "category price transmission remains an editable assumption."
        ),
    )
    diagnostic_confidence = _confidence(
        evidence=3,
        directness=2,
        stability=2,
        personalization=3,
        recency=3,
        rationale=(
            "Income and asset balances are personalized, while future salary growth, nominal "
            "return and the inflation path remain scenario assumptions."
        ),
    )

    impacts = [
        Impact(
            id=f"{category.definition.id}-expense-impact",
            label=category.definition.label,
            direction=_direction(category.annual_impact_paise),
            annualImpactPaise=category.annual_impact_paise,
            mechanism=(
                "The current monthly category spend is projected under both the current and "
                "target inflation paths using the selected category pass-through."
            ),
            confidence=expense_confidence,
            causalNodeId=f"{category.definition.id}-inflation",
        )
        for category in baseline.categories
    ]
    impacts.extend(
        [
            Impact(
                id="salary-purchasing-power",
                label="Salary purchasing power",
                direction=_direction(baseline.salary_real_annual_impact_paise),
                annualImpactPaise=baseline.salary_real_annual_impact_paise,
                mechanism=(
                    "Expected nominal salary growth is deflated by the modeled personal-basket "
                    "inflation rate to estimate real annual income change."
                ),
                confidence=diagnostic_confidence,
                causalNodeId="real-salary-growth",
            ),
            Impact(
                id="portfolio-real-return",
                label="Portfolio purchasing power",
                direction=_direction(baseline.portfolio_real_annual_impact_paise),
                annualImpactPaise=baseline.portfolio_real_annual_impact_paise,
                mechanism=(
                    "The selected nominal portfolio return is deflated by personal-basket "
                    "inflation and applied to saved financial assets."
                ),
                confidence=diagnostic_confidence,
                causalNodeId="real-portfolio-return",
            ),
        ]
    )

    category_nodes = [
        CausalNode(
            id=f"{category.definition.id}-inflation",
            label=f"{category.definition.label} prices",
            kind="market",
            value=_nearest_basis_point(category.target_rate_bps),
            unit="basis_points",
        )
        for category in baseline.categories
    ]
    category_edges = [
        CausalEdge(
            id=f"headline-to-{category.definition.id}",
            source="headline-inflation",
            target=f"{category.definition.id}-inflation",
            direction="positive",
            mechanism=(
                "The selected pass-through maps the target headline rate to this household "
                "spending category; it is a scenario choice, not a price forecast."
            ),
            lagMonths=LagMonths(minimum=0, maximum=12),
            assumptionIds=[category.definition.pass_through_assumption_id],
            citationIds=citation_ids,
            confidence=expense_confidence,
        )
        for category in baseline.categories
    ]
    basket_edges = [
        CausalEdge(
            id=f"{category.definition.id}-to-basket",
            source=f"{category.definition.id}-inflation",
            target="personal-basket-inflation",
            direction="positive",
            mechanism=(
                "The category rate is weighted by the household's entered monthly spend when "
                "constructing its personal inflation rate."
            ),
            lagMonths=LagMonths(minimum=0, maximum=0),
            assumptionIds=[category.definition.spend_assumption_id],
            citationIds=citation_ids,
            confidence=expense_confidence,
        )
        for category in baseline.categories
    ]

    return SimulationResult(
        schemaVersion=request.schemaVersion,
        requestId=request.requestId,
        scenarioType="inflation_change",
        modelVersion=MODEL_VERSION,
        generatedAt=generated_at or datetime.now(UTC),
        currency="INR",
        annualNetImpactPaise=baseline.annual_expense_impact_paise,
        confidence=expense_confidence,
        uncertainty=UncertaintyRange(
            p10AnnualImpactPaise=lower,
            p50AnnualImpactPaise=baseline.annual_expense_impact_paise,
            p90AnnualImpactPaise=upper,
            method="deterministic_bounds",
        ),
        impacts=impacts,
        causalGraph=CausalGraph(
            nodes=[
                CausalNode(
                    id="headline-inflation",
                    label="Target headline CPI inflation",
                    kind="market",
                    value=_nearest_basis_point(_target_inflation_bps(request)),
                    unit="basis_points",
                ),
                *category_nodes,
                CausalNode(
                    id="personal-basket-inflation",
                    label="Personal basket inflation",
                    kind="household",
                    value=_nearest_basis_point(baseline.personal_target_inflation_bps),
                    unit="basis_points",
                ),
                CausalNode(
                    id="projected-expenses",
                    label="Projected monthly expenses",
                    kind="household",
                    value=baseline.target_monthly_expenses_paise,
                    unit="paise",
                ),
                CausalNode(
                    id="real-salary-growth",
                    label="Real salary growth",
                    kind="outcome",
                    value=_nearest_basis_point(baseline.salary_real_growth_bps),
                    unit="basis_points",
                ),
                CausalNode(
                    id="real-portfolio-return",
                    label="Real portfolio return",
                    kind="outcome",
                    value=_nearest_basis_point(baseline.portfolio_real_return_bps),
                    unit="basis_points",
                ),
            ],
            edges=[
                *category_edges,
                *basket_edges,
                CausalEdge(
                    id="basket-to-expenses",
                    source="personal-basket-inflation",
                    target="projected-expenses",
                    direction="positive",
                    mechanism=(
                        "The personal weighted rate reprices the entered monthly basket over the "
                        "selected horizon."
                    ),
                    lagMonths=LagMonths(minimum=0, maximum=request.scenario.horizonMonths),
                    assumptionIds=[definition.spend_assumption_id for definition in CATEGORIES],
                    citationIds=citation_ids,
                    confidence=expense_confidence,
                ),
                CausalEdge(
                    id="basket-to-real-salary",
                    source="personal-basket-inflation",
                    target="real-salary-growth",
                    direction="negative",
                    mechanism=(
                        "Inflation reduces the purchasing power of a nominal salary adjustment; "
                        "real growth compares the two rates."
                    ),
                    lagMonths=LagMonths(minimum=0, maximum=request.scenario.horizonMonths),
                    assumptionIds=[SALARY_GROWTH_ID],
                    citationIds=citation_ids,
                    confidence=diagnostic_confidence,
                ),
                CausalEdge(
                    id="basket-to-real-portfolio",
                    source="personal-basket-inflation",
                    target="real-portfolio-return",
                    direction="negative",
                    mechanism=(
                        "Inflation reduces the purchasing power of the selected nominal portfolio "
                        "return."
                    ),
                    lagMonths=LagMonths(minimum=0, maximum=request.scenario.horizonMonths),
                    assumptionIds=[PORTFOLIO_RETURN_ID],
                    citationIds=citation_ids,
                    confidence=diagnostic_confidence,
                ),
            ],
        ),
        assumptions=request.assumptions,
        citations=request.evidence,
        warnings=[
            (
                "Deterministic outputs use "
                f"{CATEGORY_PROJECTION_FORMULA_VERSION}, "
                f"{PERSONAL_BASKET_FORMULA_VERSION} and {REAL_GROWTH_FORMULA_VERSION}; "
                "no LLM calculates money."
            ),
            (
                "The headline result is the annualized expense difference between the current "
                "and target inflation paths. Salary and portfolio figures are diagnostics and "
                "are not added to it."
            ),
            (
                "The sensitivity band changes every category pass-through by plus or minus 20 "
                "percentage points; it is not a probability forecast."
            ),
            (
                "Substitution, taxes, interest-rate responses, city-specific price data and "
                "changes in spending behavior are not modeled."
            ),
            "Educational simulation only; this result is not financial advice.",
        ],
    )


def _calculate_outcome(
    request: SimulationRequest,
    *,
    category_inputs: tuple[tuple[CategoryDefinition, int, int], ...],
    salary_growth_bps: int,
    portfolio_return_bps: int,
) -> InflationOutcome:
    current_bps = Decimal(str(request.scenario.currentInflationPercent)) * Decimal(100)
    target_bps = _target_inflation_bps(request)
    horizon_months = request.scenario.horizonMonths
    outcomes: list[CategoryOutcome] = []

    for definition, spend, pass_through in category_inputs:
        baseline_rate = current_bps * Decimal(pass_through) / Decimal(10_000)
        target_rate = target_bps * Decimal(pass_through) / Decimal(10_000)
        baseline_monthly = _project_money(spend, baseline_rate, horizon_months)
        target_monthly = _project_money(spend, target_rate, horizon_months)
        outcomes.append(
            CategoryOutcome(
                definition=definition,
                monthly_spend_paise=spend,
                pass_through_bps=pass_through,
                baseline_rate_bps=baseline_rate,
                target_rate_bps=target_rate,
                baseline_projected_monthly_paise=baseline_monthly,
                target_projected_monthly_paise=target_monthly,
                annual_impact_paise=-(target_monthly - baseline_monthly) * 12,
            )
        )

    total_spend = sum(item.monthly_spend_paise for item in outcomes)
    personal_target_bps = sum(
        Decimal(item.monthly_spend_paise) * item.target_rate_bps for item in outcomes
    ) / Decimal(total_spend)
    salary_real_bps = _real_growth_bps(salary_growth_bps, personal_target_bps, horizon_months)
    portfolio_real_bps = _real_growth_bps(portfolio_return_bps, personal_target_bps, horizon_months)
    annual_income = (
        request.profile.monthlyTakeHomePaise + request.profile.monthlyOtherIncomePaise
    ) * 12
    portfolio_balance = (
        request.profile.cashSavingsPaise
        + request.profile.fixedDepositsPaise
        + request.profile.equityInvestmentsPaise
    )

    return InflationOutcome(
        categories=tuple(outcomes),
        annual_expense_impact_paise=sum(item.annual_impact_paise for item in outcomes),
        baseline_monthly_expenses_paise=sum(
            item.baseline_projected_monthly_paise for item in outcomes
        ),
        target_monthly_expenses_paise=sum(item.target_projected_monthly_paise for item in outcomes),
        personal_target_inflation_bps=personal_target_bps,
        salary_real_growth_bps=salary_real_bps,
        salary_real_annual_impact_paise=_round_money(
            Decimal(annual_income) * salary_real_bps / Decimal(10_000)
        ),
        portfolio_real_return_bps=portfolio_real_bps,
        portfolio_real_annual_impact_paise=_round_money(
            Decimal(portfolio_balance) * portfolio_real_bps / Decimal(10_000)
        ),
    )


def _deterministic_bounds(
    request: SimulationRequest,
    *,
    category_inputs: tuple[tuple[CategoryDefinition, int, int], ...],
    salary_growth_bps: int,
    portfolio_return_bps: int,
) -> tuple[int, int]:
    variants = []
    for adjustment in (-SENSITIVITY_WIDTH_BPS, SENSITIVITY_WIDTH_BPS):
        adjusted = tuple(
            (definition, spend, max(0, min(MAX_PASS_THROUGH_BPS, ratio + adjustment)))
            for definition, spend, ratio in category_inputs
        )
        variants.append(
            _calculate_outcome(
                request,
                category_inputs=adjusted,
                salary_growth_bps=salary_growth_bps,
                portfolio_return_bps=portfolio_return_bps,
            ).annual_expense_impact_paise
        )
    return min(variants), max(variants)


def _project_money(monthly_spend_paise: int, annual_rate_bps: Decimal, months: int) -> int:
    multiplier = Decimal(1) + annual_rate_bps / Decimal(10_000) * Decimal(months) / Decimal(12)
    if multiplier < 0:
        raise ValueError("the inflation path makes a projected category price negative")
    return _round_money(Decimal(monthly_spend_paise) * multiplier)


def _real_growth_bps(
    nominal_growth_bps: int,
    inflation_bps: Decimal,
    horizon_months: int,
) -> Decimal:
    horizon = Decimal(horizon_months) / Decimal(12)
    nominal_multiplier = Decimal(1) + Decimal(nominal_growth_bps) / Decimal(10_000) * horizon
    inflation_multiplier = Decimal(1) + inflation_bps / Decimal(10_000) * horizon
    if nominal_multiplier < 0 or inflation_multiplier <= 0:
        raise ValueError("the selected horizon and rates do not produce valid growth multipliers")
    return ((nominal_multiplier / inflation_multiplier) - Decimal(1)) * Decimal(10_000)


def _target_inflation_bps(request: SimulationRequest) -> Decimal:
    return (
        Decimal(str(request.scenario.currentInflationPercent))
        + Decimal(str(request.scenario.change.value))
    ) * Decimal(100)


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
    if value != value.to_integral_value():
        raise ValueError(f"assumption {assumption_id} must be a whole number")
    integer_value = int(value)
    if integer_value < minimum or integer_value > maximum:
        raise ValueError(f"assumption {assumption_id} must be between {minimum} and {maximum}")
    return integer_value


def _ratio_assumption(request: SimulationRequest, assumption_id: str) -> int:
    assumption = _assumption(request, assumption_id)
    if assumption.unit != "ratio":
        raise ValueError(f"assumption {assumption_id} must use unit ratio")
    value = _numeric_value(assumption)
    if value < 0 or value > 2:
        raise ValueError(f"assumption {assumption_id} must be between 0 and 2")
    return int((value * Decimal(10_000)).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def _round_money(value: Decimal) -> int:
    return int(value.quantize(Decimal(1), rounding=ROUND_HALF_UP))


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
    score = sum([evidence, directness, stability, personalization, recency]) * 5
    level = "high" if score >= 80 else "medium" if score >= 40 else "low"
    return Confidence(score=score, level=level, dimensions=dimensions, rationale=rationale)


__all__ = ["MODEL_VERSION", "simulate_inflation"]
