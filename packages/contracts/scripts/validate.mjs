import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const schemaUrl = new URL("../schemas/health-response.schema.json", import.meta.url);
const schema = JSON.parse(await readFile(fileURLToPath(schemaUrl), "utf8"));
const required = ["status", "service", "version"];
const expectedProperties = new Set(required);

if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
  throw new Error("Health schema must use JSON Schema draft 2020-12");
}
if (schema.type !== "object" || schema.additionalProperties !== false) {
  throw new Error("Health schema must be a closed object");
}
for (const key of required) {
  if (!schema.required?.includes(key) || !schema.properties?.[key]) {
    throw new Error(`Health schema is missing required property: ${key}`);
  }
}
for (const key of Object.keys(schema.properties)) {
  if (!expectedProperties.has(key)) {
    throw new Error(`Unexpected health schema property: ${key}`);
  }
}

console.log("contracts: health-response.schema.json is valid");
