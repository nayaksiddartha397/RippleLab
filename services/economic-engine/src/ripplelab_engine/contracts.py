"""Pydantic mirrors of the canonical RippleLab simulation contract."""

from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

SchemaVersion = Literal["1.0.0"]
ScenarioType = Literal[
    "inflation_change",
    "repo_rate_change",
    "oil_price_change",
    "income_tax_change",
    "job_income_change",
]
ConfidenceLevel = Literal["low", "medium", "high"]


class ContractModel(BaseModel):
    """Reject unknown fields at every API boundary."""

    model_config = ConfigDict(extra="forbid")


class ConfidenceDimensions(ContractModel):
    evidenceQuality: int = Field(ge=0, le=4)
    causalDirectness: int = Field(ge=0, le=4)
    modelStability: int = Field(ge=0, le=4)
    personalizationCoverage: int = Field(ge=0, le=4)
    dataRecency: int = Field(ge=0, le=4)


class Confidence(ContractModel):
    score: int = Field(ge=0, le=100)
    level: ConfidenceLevel
    dimensions: ConfidenceDimensions
    rationale: str = Field(min_length=1, max_length=500)


class Citation(ContractModel):
    id: str = Field(pattern=r"^[a-z][a-z0-9-]{2,63}$")
    title: str = Field(min_length=1, max_length=240)
    publisher: str = Field(min_length=1, max_length=120)
    sourceType: Literal[
        "official_statistic", "regulation", "central_bank", "research", "methodology"
    ]
    url: HttpUrl
    publishedDate: date | None = None
    accessedAt: datetime
    locator: str | None = Field(default=None, max_length=160)


class Assumption(ContractModel):
    id: str = Field(pattern=r"^[a-z][a-zA-Z0-9]{2,63}$")
    label: str = Field(min_length=1, max_length=120)
    value: int | float | str | bool
    unit: Literal[
        "basis_points",
        "percentage_points",
        "percent",
        "paise",
        "paise_per_litre",
        "litres_per_month",
        "inr",
        "usd_per_barrel",
        "ratio",
        "days",
        "months",
        "years",
        "boolean",
        "text",
    ]
    rationale: str = Field(min_length=1, max_length=500)
    editable: bool
    citationIds: list[str]


class ProfileSnapshot(ContractModel):
    profileId: UUID
    capturedAt: datetime
    age: int = Field(ge=18, le=100)
    city: str = Field(min_length=2, max_length=80)
    employmentStatus: Literal[
        "student", "salaried", "self_employed", "business_owner", "retired", "not_employed"
    ]
    housingStatus: Literal["renter", "homeowner_with_mortgage", "homeowner_outright", "family_home"]
    monthlyTakeHomePaise: int = Field(ge=0)
    monthlyOtherIncomePaise: int = Field(ge=0)
    monthlyEssentialExpensesPaise: int = Field(ge=0)
    monthlyDiscretionaryExpensesPaise: int = Field(ge=0)
    cashSavingsPaise: int = Field(ge=0)
    fixedDepositsPaise: int = Field(ge=0)
    equityInvestmentsPaise: int = Field(ge=0)
    monthlyRentPaise: int = Field(ge=0)
    homeValuePaise: int = Field(ge=0)
    outstandingHomeLoanPaise: int = Field(ge=0)
    outstandingOtherLoansPaise: int = Field(ge=0)
    monthlyEmiPaise: int = Field(ge=0)
    weightedLoanRateBps: int = Field(ge=0, le=10000)


class RepoRateChange(ContractModel):
    value: int = Field(ge=-1000, le=1000)
    unit: Literal["basis_points"]


class RepoRateScenario(ContractModel):
    type: Literal["repo_rate_change"]
    currentRateBps: int = Field(ge=0, le=10000)
    change: RepoRateChange
    horizonMonths: int = Field(ge=1, le=120)


class PercentagePointChange(ContractModel):
    value: float = Field(ge=-100, le=100)
    unit: Literal["percentage_points"]


class InflationChange(ContractModel):
    value: float = Field(ge=-25, le=100)
    unit: Literal["percentage_points"]


class InflationScenario(ContractModel):
    type: Literal["inflation_change"]
    currentInflationPercent: float = Field(ge=-10, le=100)
    change: InflationChange
    horizonMonths: int = Field(ge=1, le=120)


class OilPriceScenario(ContractModel):
    type: Literal["oil_price_change"]
    currentPrice: float = Field(ge=0, le=500)
    targetPrice: float = Field(ge=0, le=500)
    unit: Literal["usd_per_barrel"]
    horizonMonths: int = Field(ge=1, le=120)


class IncomeTaxScenario(ContractModel):
    type: Literal["income_tax_change"]
    effectiveRateChange: PercentagePointChange
    horizonMonths: int = Field(ge=1, le=120)


class IncomePercentChange(ContractModel):
    value: float = Field(ge=-100, le=1000)
    unit: Literal["percent"]


class JobIncomeScenario(ContractModel):
    type: Literal["job_income_change"]
    incomeChange: IncomePercentChange
    horizonMonths: int = Field(ge=1, le=120)


Scenario = Annotated[
    InflationScenario | RepoRateScenario | OilPriceScenario | IncomeTaxScenario | JobIncomeScenario,
    Field(discriminator="type"),
]


class SimulationRequest(ContractModel):
    schemaVersion: SchemaVersion
    requestId: UUID
    country: Literal["IN"]
    currency: Literal["INR"]
    scenario: Scenario
    profile: ProfileSnapshot
    assumptions: list[Assumption]
    evidence: list[Citation]


class ContractValidationResponse(ContractModel):
    valid: Literal[True]
    schemaVersion: SchemaVersion
    scenarioType: ScenarioType
    requestId: UUID


class CausalNode(ContractModel):
    id: str = Field(pattern=r"^[a-z][a-z0-9-]{2,63}$")
    label: str = Field(min_length=1, max_length=120)
    kind: Literal["policy", "market", "financial_product", "household", "outcome"]
    value: int | float | None = None
    unit: str | None = None


class LagMonths(ContractModel):
    minimum: int = Field(ge=0, le=120)
    maximum: int = Field(ge=0, le=120)


class CausalEdge(ContractModel):
    id: str = Field(pattern=r"^[a-z][a-z0-9-]{2,63}$")
    source: str
    target: str
    direction: Literal["positive", "negative", "mixed"]
    mechanism: str = Field(min_length=1, max_length=500)
    lagMonths: LagMonths
    assumptionIds: list[str]
    citationIds: list[str]
    confidence: Confidence


class CausalGraph(ContractModel):
    nodes: list[CausalNode] = Field(min_length=1)
    edges: list[CausalEdge] = Field(min_length=1)


class Impact(ContractModel):
    id: str = Field(pattern=r"^[a-z][a-z0-9-]{2,63}$")
    label: str = Field(min_length=1, max_length=120)
    direction: Literal["benefit", "cost", "neutral", "uncertain"]
    annualImpactPaise: int
    mechanism: str = Field(min_length=1, max_length=500)
    confidence: Confidence
    causalNodeId: str


class UncertaintyRange(ContractModel):
    p10AnnualImpactPaise: int
    p50AnnualImpactPaise: int
    p90AnnualImpactPaise: int
    method: Literal["deterministic_bounds", "monte_carlo"]


class SimulationResult(ContractModel):
    schemaVersion: SchemaVersion
    requestId: UUID
    scenarioType: ScenarioType
    modelVersion: str = Field(pattern=r"^[0-9]+\.[0-9]+\.[0-9]+$")
    generatedAt: datetime
    currency: Literal["INR"]
    annualNetImpactPaise: int
    confidence: Confidence
    uncertainty: UncertaintyRange
    impacts: list[Impact] = Field(min_length=1)
    causalGraph: CausalGraph
    assumptions: list[Assumption]
    citations: list[Citation] = Field(min_length=1)
    warnings: list[str]
