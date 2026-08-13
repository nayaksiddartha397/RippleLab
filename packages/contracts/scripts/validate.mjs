import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { assertValidJson, validateJsonSchema } from "./json-schema-validator.mjs";

async function readJson(relativePath) {
  const url = new URL(relativePath, import.meta.url);
  return JSON.parse(await readFile(fileURLToPath(url), "utf8"));
}

const healthSchema = await readJson("../schemas/health-response.schema.json");
const simulationSchema = await readJson("../schemas/simulation-contract.schema.json");
const goldenRequest = await readJson("../examples/repo-rate-request.v1.json");
const goldenResult = await readJson("../examples/repo-rate-result.v1.json");

const healthRequired = ["status", "service", "version"];
assert.equal(healthSchema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(healthSchema.type, "object");
assert.equal(healthSchema.additionalProperties, false);
assert.deepEqual(new Set(Object.keys(healthSchema.properties)), new Set(healthRequired));
for (const key of healthRequired) {
  assert.ok(healthSchema.required?.includes(key), `Health schema is missing required property: ${key}`);
}

assert.equal(simulationSchema.$schema, "https://json-schema.org/draft/2020-12/schema");
for (const definition of [
  "SimulationRequest",
  "SimulationResult",
  "Scenario",
  "CausalGraph",
  "Assumption",
  "Citation",
  "Confidence",
]) {
  assert.ok(simulationSchema.$defs[definition], `Simulation schema is missing ${definition}`);
}

assertValidJson(simulationSchema.$defs.SimulationRequest, goldenRequest, "golden request", simulationSchema);
assertValidJson(simulationSchema.$defs.SimulationResult, goldenResult, "golden result", simulationSchema);

function expectedConfidenceLevel(score) {
  if (score >= 80) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function validateConfidence(confidence, path) {
  const dimensionScore = Object.values(confidence.dimensions).reduce((sum, value) => sum + value, 0) * 5;
  assert.equal(confidence.score, dimensionScore, `${path}.score must equal five weighted rubric dimensions`);
  assert.equal(confidence.level, expectedConfidenceLevel(confidence.score), `${path}.level does not match its score`);
}

function assertReferences(values, available, label) {
  for (const value of values) assert.ok(available.has(value), `${label} references missing id: ${value}`);
}

const requestCitationIds = new Set(goldenRequest.evidence.map(({ id }) => id));
for (const assumption of goldenRequest.assumptions) {
  assertReferences(assumption.citationIds, requestCitationIds, `request assumption ${assumption.id}`);
}

const resultNodeIds = new Set(goldenResult.causalGraph.nodes.map(({ id }) => id));
const resultAssumptionIds = new Set(goldenResult.assumptions.map(({ id }) => id));
const resultCitationIds = new Set(goldenResult.citations.map(({ id }) => id));

validateConfidence(goldenResult.confidence, "result.confidence");
assert.ok(
  goldenResult.uncertainty.p10AnnualImpactPaise <= goldenResult.uncertainty.p50AnnualImpactPaise &&
    goldenResult.uncertainty.p50AnnualImpactPaise <= goldenResult.uncertainty.p90AnnualImpactPaise,
  "uncertainty percentiles must be ordered p10 <= p50 <= p90",
);

for (const edge of goldenResult.causalGraph.edges) {
  assertReferences([edge.source, edge.target], resultNodeIds, `edge ${edge.id}`);
  assertReferences(edge.assumptionIds, resultAssumptionIds, `edge ${edge.id}`);
  assertReferences(edge.citationIds, resultCitationIds, `edge ${edge.id}`);
  assert.ok(edge.lagMonths.minimum <= edge.lagMonths.maximum, `edge ${edge.id} has an invalid lag range`);
  validateConfidence(edge.confidence, `edge ${edge.id}.confidence`);
}
for (const impact of goldenResult.impacts) {
  assertReferences([impact.causalNodeId], resultNodeIds, `impact ${impact.id}`);
  validateConfidence(impact.confidence, `impact ${impact.id}.confidence`);
}
for (const assumption of goldenResult.assumptions) {
  assertReferences(assumption.citationIds, resultCitationIds, `result assumption ${assumption.id}`);
}

const unsupportedScenario = structuredClone(goldenRequest);
unsupportedScenario.scenario = { type: "gst_change", change: { value: 1, unit: "percentage_points" }, horizonMonths: 12 };
const unsupportedErrors = validateJsonSchema(simulationSchema.$defs.SimulationRequest, unsupportedScenario, simulationSchema);
assert.ok(unsupportedErrors.some((error) => error.includes("type")), `Unsupported scenario should fail clearly: ${unsupportedErrors}`);

const invalidUnit = structuredClone(goldenRequest);
invalidUnit.scenario.change.unit = "percentage_points";
const unitErrors = validateJsonSchema(simulationSchema.$defs.SimulationRequest, invalidUnit, simulationSchema);
assert.ok(unitErrors.some((error) => error.includes("unit")), `Invalid scenario unit should fail clearly: ${unitErrors}`);

const staleVersion = structuredClone(goldenRequest);
staleVersion.schemaVersion = "2.0.0";
const versionErrors = validateJsonSchema(simulationSchema.$defs.SimulationRequest, staleVersion, simulationSchema);
assert.ok(versionErrors.some((error) => error.includes("schemaVersion")), `Unsupported schema version should fail clearly: ${versionErrors}`);

console.log("contracts: health and simulation schemas are valid");
console.log("contracts: golden request/result, units, scenario enums, references and confidence rubric agree");
