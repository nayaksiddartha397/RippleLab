// Generated from schemas/simulation-contract.schema.json. Do not edit by hand.

export const simulationSchemaVersion = "1.0.0" as const;
export const scenarioTypes = ["inflation_change","repo_rate_change","oil_price_change","income_tax_change","job_income_change"] as const;
export const confidenceLevels = ["low","medium","high"] as const;
export const citationSourceTypes = ["official_statistic","regulation","central_bank","research","methodology"] as const;

export type SchemaVersion = "1.0.0";

export type ScenarioType = "inflation_change" | "repo_rate_change" | "oil_price_change" | "income_tax_change" | "job_income_change";

export type ConfidenceLevel = "low" | "medium" | "high";

export type ConfidenceDimensions = {
  readonly evidenceQuality: number;
  readonly causalDirectness: number;
  readonly modelStability: number;
  readonly personalizationCoverage: number;
  readonly dataRecency: number;
};

export type Confidence = {
  readonly score: number;
  readonly level: ConfidenceLevel;
  readonly dimensions: ConfidenceDimensions;
  readonly rationale: string;
};

export type Citation = {
  readonly id: string;
  readonly title: string;
  readonly publisher: string;
  readonly sourceType: "official_statistic" | "regulation" | "central_bank" | "research" | "methodology";
  readonly url: string;
  readonly publishedDate?: string;
  readonly accessedAt: string;
  readonly locator?: string;
};

export type AssumptionValue = number | string | boolean;

export type Assumption = {
  readonly id: string;
  readonly label: string;
  readonly value: AssumptionValue;
  readonly unit: "basis_points" | "percentage_points" | "percent" | "paise" | "paise_per_litre" | "litres_per_month" | "inr" | "usd_per_barrel" | "ratio" | "days" | "months" | "years" | "boolean" | "text";
  readonly rationale: string;
  readonly editable: boolean;
  readonly citationIds: ReadonlyArray<string>;
};

export type ProfileSnapshot = {
  readonly profileId: string;
  readonly capturedAt: string;
  readonly age: number;
  readonly city: string;
  readonly employmentStatus: "student" | "salaried" | "self_employed" | "business_owner" | "retired" | "not_employed";
  readonly housingStatus: "renter" | "homeowner_with_mortgage" | "homeowner_outright" | "family_home";
  readonly monthlyTakeHomePaise: number;
  readonly monthlyOtherIncomePaise: number;
  readonly monthlyEssentialExpensesPaise: number;
  readonly monthlyDiscretionaryExpensesPaise: number;
  readonly cashSavingsPaise: number;
  readonly fixedDepositsPaise: number;
  readonly equityInvestmentsPaise: number;
  readonly monthlyRentPaise: number;
  readonly homeValuePaise: number;
  readonly outstandingHomeLoanPaise: number;
  readonly outstandingOtherLoansPaise: number;
  readonly monthlyEmiPaise: number;
  readonly weightedLoanRateBps: number;
};

export type RepoRateScenario = {
  readonly type: "repo_rate_change";
  readonly currentRateBps: number;
  readonly change: {
    readonly value: number;
    readonly unit: "basis_points";
  };
  readonly horizonMonths: number;
};

export type InflationScenario = {
  readonly type: "inflation_change";
  readonly currentInflationPercent: number;
  readonly change: {
    readonly value: number;
    readonly unit: "percentage_points";
  };
  readonly horizonMonths: number;
};

export type OilPriceScenario = {
  readonly type: "oil_price_change";
  readonly currentPrice: number;
  readonly targetPrice: number;
  readonly unit: "usd_per_barrel";
  readonly horizonMonths: number;
};

export type IncomeTaxScenario = {
  readonly type: "income_tax_change";
  readonly effectiveRateChange: {
    readonly value: number;
    readonly unit: "percentage_points";
  };
  readonly horizonMonths: number;
};

export type JobIncomeScenario = {
  readonly type: "job_income_change";
  readonly incomeChange: {
    readonly value: number;
    readonly unit: "percent";
  };
  readonly horizonMonths: number;
};

export type Scenario = InflationScenario | RepoRateScenario | OilPriceScenario | IncomeTaxScenario | JobIncomeScenario;

export type SimulationRequest = {
  readonly schemaVersion: SchemaVersion;
  readonly requestId: string;
  readonly country: "IN";
  readonly currency: "INR";
  readonly scenario: Scenario;
  readonly profile: ProfileSnapshot;
  readonly assumptions: ReadonlyArray<Assumption>;
  readonly evidence: ReadonlyArray<Citation>;
};

export type CausalNode = {
  readonly id: string;
  readonly label: string;
  readonly kind: "policy" | "market" | "financial_product" | "household" | "outcome";
  readonly value?: number;
  readonly unit?: string;
};

export type CausalEdge = {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly direction: "positive" | "negative" | "mixed";
  readonly mechanism: string;
  readonly lagMonths: {
    readonly minimum: number;
    readonly maximum: number;
  };
  readonly assumptionIds: ReadonlyArray<string>;
  readonly citationIds: ReadonlyArray<string>;
  readonly confidence: Confidence;
};

export type CausalGraph = {
  readonly nodes: ReadonlyArray<CausalNode>;
  readonly edges: ReadonlyArray<CausalEdge>;
};

export type Impact = {
  readonly id: string;
  readonly label: string;
  readonly direction: "benefit" | "cost" | "neutral" | "uncertain";
  readonly annualImpactPaise: number;
  readonly mechanism: string;
  readonly confidence: Confidence;
  readonly causalNodeId: string;
};

export type UncertaintyRange = {
  readonly p10AnnualImpactPaise: number;
  readonly p50AnnualImpactPaise: number;
  readonly p90AnnualImpactPaise: number;
  readonly method: "deterministic_bounds" | "monte_carlo";
};

export type SimulationResult = {
  readonly schemaVersion: SchemaVersion;
  readonly requestId: string;
  readonly scenarioType: ScenarioType;
  readonly modelVersion: string;
  readonly generatedAt: string;
  readonly currency: "INR";
  readonly annualNetImpactPaise: number;
  readonly confidence: Confidence;
  readonly uncertainty: UncertaintyRange;
  readonly impacts: ReadonlyArray<Impact>;
  readonly causalGraph: CausalGraph;
  readonly assumptions: ReadonlyArray<Assumption>;
  readonly citations: ReadonlyArray<Citation>;
  readonly warnings: ReadonlyArray<string>;
};
