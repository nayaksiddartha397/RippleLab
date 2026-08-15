"""Personal oil-price simulation with direct and indirect household channels."""

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
CRUDE_RETAIL_FORMULA_VERSION = "oil.crude_to_retail.v1"
DIRECT_FUEL_FORMULA_VERSION = "oil.direct_fuel_cost.v1"
INDIRECT_EXPENSE_FORMULA_VERSION = "oil.indirect_expense.v1"
SENSITIVITY_WIDTH_BPS = 2_000
MAX_PASS_THROUGH_BPS = 20_000

RETAIL_PRICE_ID = "currentRetailFuelPricePaisePerLitre"
FUEL_LITRES_ID = "monthlyFuelLitres"
RETAIL_PASS_THROUGH_ID = "crudeToRetailPassThrough"


@dataclass(frozen=True, slots=True)
class IndirectChannel:
    id: str
    label: str
    spend_assumption_id: str
    pass_through_assumption_id: str


@dataclass(frozen=True, slots=True)
class ChannelOutcome:
    channel: IndirectChannel
    monthly_spend_paise: int
    pass_through_bps: int
    annual_impact_paise: int


@dataclass(frozen=True, slots=True)
class OilPriceOutcome:
    crude_change_ratio: Decimal
    target_retail_price_paise_per_litre: int
    direct_fuel_annual_impact_paise: int
    indirect_channels: tuple[ChannelOutcome, ...]
    annual_net_impact_paise: int


INDIRECT_CHANNELS = (
    IndirectChannel(
        "transport",
        "Transport services",
        "transportSpendPaise",
        "transportPassThrough",
    ),
    IndirectChannel("food", "Food and groceries", "foodSpendPaise", "foodPassThrough"),
    IndirectChannel("utilities", "Utilities", "utilitiesSpendPaise", "utilitiesPassThrough"),
)


def simulate_oil_price(
    request: SimulationRequest,
    *,
    generated_at: datetime | None = None,
) -> SimulationResult:
    """Translate a crude-price scenario into editable household expense channels."""

    if request.scenario.type != "oil_price_change":
        raise ValueError("scenario.type must be oil_price_change for this endpoint")
    if request.scenario.currentPrice <= 0:
        raise ValueError(
            "scenario.currentPrice must be greater than 0 to calculate a percentage change"
        )
    if not request.evidence:
        raise ValueError("evidence must include at least one source for an oil-price simulation")

    retail_price = _integer_assumption(
        request,
        RETAIL_PRICE_ID,
        expected_unit="paise_per_litre",
        minimum=0,
        maximum=10_000_000,
    )
    monthly_litres = _decimal_assumption(
        request,
        FUEL_LITRES_ID,
        expected_unit="litres_per_month",
        minimum=Decimal(0),
        maximum=Decimal(1_000_000),
    )
    retail_pass_through = _ratio_assumption(request, RETAIL_PASS_THROUGH_ID)
    indirect_inputs = tuple(
        (
            channel,
            _integer_assumption(
                request,
                channel.spend_assumption_id,
                expected_unit="paise",
                minimum=0,
                maximum=100_000_000_000,
            ),
            _ratio_assumption(request, channel.pass_through_assumption_id),
        )
        for channel in INDIRECT_CHANNELS
    )

    baseline = _calculate_outcome(
        request,
        retail_price_paise_per_litre=retail_price,
        monthly_fuel_litres=monthly_litres,
        retail_pass_through_bps=retail_pass_through,
        indirect_inputs=indirect_inputs,
    )
    lower, upper = _deterministic_bounds(
        request,
        retail_price_paise_per_litre=retail_price,
        monthly_fuel_litres=monthly_litres,
        retail_pass_through_bps=retail_pass_through,
        indirect_inputs=indirect_inputs,
    )

    direct_confidence = _confidence(
        evidence=3,
        directness=3,
        stability=2,
        personalization=4,
        recency=3,
        rationale=(
            "Fuel use and the retail-price starting point are personal inputs and arithmetic is "
            "deterministic; crude-to-retail transmission remains an editable assumption."
        ),
    )
    indirect_confidence = _confidence(
        evidence=3,
        directness=2,
        stability=2,
        personalization=3,
        recency=3,
        rationale=(
            "Monthly spending is personalized, while each indirect response to crude prices is "
            "an explicit sensitivity assumption rather than a forecast."
        ),
    )
    overall_confidence = _confidence(
        evidence=3,
        directness=2,
        stability=2,
        personalization=4,
        recency=3,
        rationale=(
            "The household exposures and calculations are explicit; retail and indirect price "
            "transmission are uncertain and user-adjustable."
        ),
    )

    impacts = [
        Impact(
            id="direct-fuel-impact",
            label="Direct vehicle fuel",
            direction=_direction(baseline.direct_fuel_annual_impact_paise),
            annualImpactPaise=baseline.direct_fuel_annual_impact_paise,
            mechanism=(
                "The modeled retail price change is multiplied by entered monthly fuel use and "
                "annualized."
            ),
            confidence=direct_confidence,
            causalNodeId="direct-fuel-impact",
        ),
        *[
            Impact(
                id=f"{item.channel.id}-expense-impact",
                label=item.channel.label,
                direction=_direction(item.annual_impact_paise),
                annualImpactPaise=item.annual_impact_paise,
                mechanism=(
                    "The crude-price percentage change is multiplied by monthly spending and the "
                    "selected indirect pass-through, then annualized."
                ),
                confidence=indirect_confidence,
                causalNodeId=f"{item.channel.id}-impact",
            )
            for item in baseline.indirect_channels
        ],
    ]

    ppac_crude_ids = _present_citation_ids(request, ["ppac-crude-price"])
    retail_citation_ids = _present_citation_ids(
        request,
        ["ppac-crude-price", "ppac-retail-price-build-up"],
    )
    indirect_citation_ids = _present_citation_ids(
        request,
        ["ppac-crude-price", "mospi-cpi-groups"],
    )
    component_edges = [
        CausalEdge(
            id="direct-fuel-to-total",
            source="direct-fuel-impact",
            target="annual-household-impact",
            direction="positive",
            mechanism=(
                "The annual direct fuel effect is one component of total household cash flow."
            ),
            lagMonths=LagMonths(minimum=0, maximum=request.scenario.horizonMonths),
            assumptionIds=[RETAIL_PRICE_ID, FUEL_LITRES_ID, RETAIL_PASS_THROUGH_ID],
            citationIds=retail_citation_ids,
            confidence=direct_confidence,
        ),
        *[
            CausalEdge(
                id=f"{item.channel.id}-to-total",
                source=f"{item.channel.id}-impact",
                target="annual-household-impact",
                direction="positive",
                mechanism=(
                    f"The annual {item.channel.label.lower()} effect is added to the other modeled "
                    "household channels."
                ),
                lagMonths=LagMonths(minimum=0, maximum=request.scenario.horizonMonths),
                assumptionIds=[
                    item.channel.spend_assumption_id,
                    item.channel.pass_through_assumption_id,
                ],
                citationIds=indirect_citation_ids,
                confidence=indirect_confidence,
            )
            for item in baseline.indirect_channels
        ],
    ]

    return SimulationResult(
        schemaVersion=request.schemaVersion,
        requestId=request.requestId,
        scenarioType="oil_price_change",
        modelVersion=MODEL_VERSION,
        generatedAt=generated_at or datetime.now(UTC),
        currency="INR",
        annualNetImpactPaise=baseline.annual_net_impact_paise,
        confidence=overall_confidence,
        uncertainty=UncertaintyRange(
            p10AnnualImpactPaise=lower,
            p50AnnualImpactPaise=baseline.annual_net_impact_paise,
            p90AnnualImpactPaise=upper,
            method="deterministic_bounds",
        ),
        impacts=impacts,
        causalGraph=CausalGraph(
            nodes=[
                CausalNode(
                    id="crude-oil-price",
                    label="Indian Basket crude scenario",
                    kind="market",
                    value=request.scenario.targetPrice,
                    unit="usd_per_barrel",
                ),
                CausalNode(
                    id="retail-fuel-price",
                    label="Modeled retail fuel price",
                    kind="market",
                    value=baseline.target_retail_price_paise_per_litre,
                    unit="paise_per_litre",
                ),
                CausalNode(
                    id="direct-fuel-impact",
                    label="Direct vehicle fuel effect",
                    kind="household",
                    value=baseline.direct_fuel_annual_impact_paise,
                    unit="paise_per_year",
                ),
                *[
                    CausalNode(
                        id=f"{item.channel.id}-impact",
                        label=f"{item.channel.label} effect",
                        kind="household",
                        value=item.annual_impact_paise,
                        unit="paise_per_year",
                    )
                    for item in baseline.indirect_channels
                ],
                CausalNode(
                    id="annual-household-impact",
                    label="Annual household impact",
                    kind="outcome",
                    value=baseline.annual_net_impact_paise,
                    unit="paise_per_year",
                ),
            ],
            edges=[
                CausalEdge(
                    id="crude-to-retail",
                    source="crude-oil-price",
                    target="retail-fuel-price",
                    direction="positive",
                    mechanism=(
                        "The selected pass-through applies part of the crude-price percentage "
                        "change to the entered retail fuel price."
                    ),
                    lagMonths=LagMonths(minimum=0, maximum=3),
                    assumptionIds=[RETAIL_PASS_THROUGH_ID, RETAIL_PRICE_ID],
                    citationIds=retail_citation_ids,
                    confidence=direct_confidence,
                ),
                CausalEdge(
                    id="retail-to-direct-fuel",
                    source="retail-fuel-price",
                    target="direct-fuel-impact",
                    direction="negative",
                    mechanism=(
                        "A higher modeled retail price raises fuel spending for the entered "
                        "monthly litres and reduces household cash flow."
                    ),
                    lagMonths=LagMonths(minimum=0, maximum=1),
                    assumptionIds=[FUEL_LITRES_ID],
                    citationIds=retail_citation_ids,
                    confidence=direct_confidence,
                ),
                *[
                    CausalEdge(
                        id=f"crude-to-{item.channel.id}",
                        source="crude-oil-price",
                        target=f"{item.channel.id}-impact",
                        direction="negative",
                        mechanism=(
                            f"The selected {item.channel.label.lower()} pass-through maps part of "
                            "the crude-price change into this monthly expense."
                        ),
                        lagMonths=LagMonths(minimum=0, maximum=12),
                        assumptionIds=[
                            item.channel.spend_assumption_id,
                            item.channel.pass_through_assumption_id,
                        ],
                        citationIds=indirect_citation_ids or ppac_crude_ids,
                        confidence=indirect_confidence,
                    )
                    for item in baseline.indirect_channels
                ],
                *component_edges,
            ],
        ),
        assumptions=request.assumptions,
        citations=request.evidence,
        warnings=[
            (
                "Deterministic outputs use "
                f"{CRUDE_RETAIL_FORMULA_VERSION}, {DIRECT_FUEL_FORMULA_VERSION} and "
                f"{INDIRECT_EXPENSE_FORMULA_VERSION}; no LLM calculates money."
            ),
            (
                "Crude oil is entered in USD per barrel. Retail fuel is a separate editable "
                "INR-per-litre starting point; exchange rates, taxes and dealer margins are not "
                "inferred."
            ),
            (
                "The sensitivity band moves all four pass-through rates by plus or minus 20 "
                "percentage points; it is not a probability forecast."
            ),
            (
                "Indirect transport, food and utility effects are simplified household "
                "sensitivities, not forecasts of consumer-price inflation."
            ),
            (
                "Behavior changes, fuel substitution, tax changes and city-specific prices are "
                "not modeled."
            ),
            "Educational simulation only; this result is not financial advice.",
        ],
    )


def _calculate_outcome(
    request: SimulationRequest,
    *,
    retail_price_paise_per_litre: int,
    monthly_fuel_litres: Decimal,
    retail_pass_through_bps: int,
    indirect_inputs: tuple[tuple[IndirectChannel, int, int], ...],
) -> OilPriceOutcome:
    current_crude = Decimal(str(request.scenario.currentPrice))
    target_crude = Decimal(str(request.scenario.targetPrice))
    crude_change_ratio = (target_crude - current_crude) / current_crude
    retail_change_ratio = crude_change_ratio * Decimal(retail_pass_through_bps) / Decimal(10_000)
    target_retail = Decimal(retail_price_paise_per_litre) * (Decimal(1) + retail_change_ratio)
    if target_retail < 0:
        raise ValueError("the crude-to-retail pass-through makes the modeled retail price negative")

    direct_impact = _round_money(
        -monthly_fuel_litres * (target_retail - Decimal(retail_price_paise_per_litre)) * Decimal(12)
    )
    indirect_outcomes = tuple(
        ChannelOutcome(
            channel=channel,
            monthly_spend_paise=spend,
            pass_through_bps=pass_through,
            annual_impact_paise=_round_money(
                -Decimal(spend)
                * crude_change_ratio
                * Decimal(pass_through)
                / Decimal(10_000)
                * Decimal(12)
            ),
        )
        for channel, spend, pass_through in indirect_inputs
    )
    annual_net = direct_impact + sum(item.annual_impact_paise for item in indirect_outcomes)
    return OilPriceOutcome(
        crude_change_ratio=crude_change_ratio,
        target_retail_price_paise_per_litre=_round_money(target_retail),
        direct_fuel_annual_impact_paise=direct_impact,
        indirect_channels=indirect_outcomes,
        annual_net_impact_paise=annual_net,
    )


def _deterministic_bounds(
    request: SimulationRequest,
    *,
    retail_price_paise_per_litre: int,
    monthly_fuel_litres: Decimal,
    retail_pass_through_bps: int,
    indirect_inputs: tuple[tuple[IndirectChannel, int, int], ...],
) -> tuple[int, int]:
    variants = []
    for adjustment in (-SENSITIVITY_WIDTH_BPS, SENSITIVITY_WIDTH_BPS):
        adjusted_retail = max(
            0,
            min(MAX_PASS_THROUGH_BPS, retail_pass_through_bps + adjustment),
        )
        adjusted_indirect = tuple(
            (
                channel,
                spend,
                max(0, min(MAX_PASS_THROUGH_BPS, pass_through + adjustment)),
            )
            for channel, spend, pass_through in indirect_inputs
        )
        variants.append(
            _calculate_outcome(
                request,
                retail_price_paise_per_litre=retail_price_paise_per_litre,
                monthly_fuel_litres=monthly_fuel_litres,
                retail_pass_through_bps=adjusted_retail,
                indirect_inputs=adjusted_indirect,
            ).annual_net_impact_paise
        )
    return min(variants), max(variants)


def _assumption(request: SimulationRequest, assumption_id: str) -> Assumption:
    for assumption in request.assumptions:
        if assumption.id == assumption_id:
            return assumption
    raise ValueError(f"assumptions must include {assumption_id}")


def _numeric_value(assumption: Assumption) -> Decimal:
    if isinstance(assumption.value, bool) or not isinstance(assumption.value, (int, float)):
        raise ValueError(f"assumption {assumption.id} must have a numeric value")
    return Decimal(str(assumption.value))


def _decimal_assumption(
    request: SimulationRequest,
    assumption_id: str,
    *,
    expected_unit: str,
    minimum: Decimal,
    maximum: Decimal,
) -> Decimal:
    assumption = _assumption(request, assumption_id)
    if assumption.unit != expected_unit:
        raise ValueError(f"assumption {assumption_id} must use unit {expected_unit}")
    value = _numeric_value(assumption)
    if value < minimum or value > maximum:
        raise ValueError(f"assumption {assumption_id} must be between {minimum} and {maximum}")
    return value


def _integer_assumption(
    request: SimulationRequest,
    assumption_id: str,
    *,
    expected_unit: str,
    minimum: int,
    maximum: int,
) -> int:
    value = _decimal_assumption(
        request,
        assumption_id,
        expected_unit=expected_unit,
        minimum=Decimal(minimum),
        maximum=Decimal(maximum),
    )
    if value != value.to_integral_value():
        raise ValueError(f"assumption {assumption_id} must be a whole number")
    return int(value)


def _ratio_assumption(request: SimulationRequest, assumption_id: str) -> int:
    assumption = _assumption(request, assumption_id)
    if assumption.unit != "ratio":
        raise ValueError(f"assumption {assumption_id} must use unit ratio")
    value = _numeric_value(assumption)
    if value < 0 or value > 2:
        raise ValueError(f"assumption {assumption_id} must be between 0 and 2")
    return int((value * Decimal(10_000)).quantize(Decimal(1), rounding=ROUND_HALF_UP))


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


__all__ = ["MODEL_VERSION", "simulate_oil_price"]
