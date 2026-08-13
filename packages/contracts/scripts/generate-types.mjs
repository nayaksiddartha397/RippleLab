import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const schemaUrl = new URL("../schemas/simulation-contract.schema.json", import.meta.url);
const outputUrl = new URL("../src/generated/simulation.ts", import.meta.url);
const schema = JSON.parse(await readFile(fileURLToPath(schemaUrl), "utf8"));

function refName(reference) {
  return reference.split("/").at(-1);
}

function toType(node, indent = 0) {
  if (node.$ref) return refName(node.$ref);
  if (Object.hasOwn(node, "const")) return JSON.stringify(node.const);
  if (node.enum) return node.enum.map((value) => JSON.stringify(value)).join(" | ");
  if (node.oneOf) return node.oneOf.map((item) => toType(item, indent)).join(" | ");
  if (node.type === "array") return `ReadonlyArray<${toType(node.items, indent)}>`;
  if (node.type === "object") {
    const required = new Set(node.required ?? []);
    const padding = "  ".repeat(indent + 1);
    const closing = "  ".repeat(indent);
    const fields = Object.entries(node.properties ?? {}).map(
      ([name, value]) => `${padding}readonly ${name}${required.has(name) ? "" : "?"}: ${toType(value, indent + 1)};`,
    );
    return `{\n${fields.join("\n")}\n${closing}}`;
  }
  if (node.type === "integer" || node.type === "number") return "number";
  if (node.type === "boolean") return "boolean";
  if (node.type === "null") return "null";
  return "string";
}

const definitions = Object.entries(schema.$defs).map(
  ([name, definition]) => `export type ${name} = ${toType(definition)};`,
);
const scenarioTypes = schema.$defs.ScenarioType.enum;
const confidenceLevels = schema.$defs.ConfidenceLevel.enum;
const sourceTypes = schema.$defs.Citation.properties.sourceType.enum;
const output = `// Generated from schemas/simulation-contract.schema.json. Do not edit by hand.\n\nexport const simulationSchemaVersion = ${JSON.stringify(schema.$defs.SchemaVersion.const)} as const;\nexport const scenarioTypes = ${JSON.stringify(scenarioTypes)} as const;\nexport const confidenceLevels = ${JSON.stringify(confidenceLevels)} as const;\nexport const citationSourceTypes = ${JSON.stringify(sourceTypes)} as const;\n\n${definitions.join("\n\n")}\n`;

if (process.argv.includes("--check")) {
  const current = await readFile(fileURLToPath(outputUrl), "utf8").catch(() => "");
  if (current !== output) throw new Error("Generated simulation types are stale. Run pnpm generate:contracts.");
  console.log("contracts: generated TypeScript is current");
} else {
  await mkdir(dirname(fileURLToPath(outputUrl)), { recursive: true });
  await writeFile(fileURLToPath(outputUrl), output);
  console.log(fileURLToPath(outputUrl));
}
