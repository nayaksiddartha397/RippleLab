function resolveReference(root, reference) {
  if (!reference.startsWith("#/")) throw new Error(`Only local references are supported: ${reference}`);
  return reference
    .slice(2)
    .split("/")
    .reduce((value, part) => value[part.replaceAll("~1", "/").replaceAll("~0", "~")], root);
}

function typeMatches(type, value) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return typeof value === "object" && value !== null && !Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

function isFormat(format, value) {
  if (format === "uuid") return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  if (format === "date") return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  if (format === "date-time") return !Number.isNaN(Date.parse(value)) && /T/.test(value);
  if (format === "uri") {
    try { return Boolean(new URL(value)); } catch { return false; }
  }
  return true;
}

export function validateJsonSchema(schema, value, root = schema, path = "$", errors = []) {
  if (schema.$ref) return validateJsonSchema(resolveReference(root, schema.$ref), value, root, path, errors);

  if (schema.oneOf) {
    const attempts = schema.oneOf.map((candidate) => {
      const candidateErrors = [];
      validateJsonSchema(candidate, value, root, path, candidateErrors);
      return candidateErrors;
    });
    const matches = attempts.filter((attempt) => attempt.length === 0);
    if (matches.length !== 1) {
      const receivedType = value && typeof value === "object" ? value.type : undefined;
      const matchingTypeAttempt = receivedType
        ? attempts.find((attempt) => !attempt.some((error) => error.startsWith(`${path}.type must equal`)))
        : undefined;
      const detail = matchingTypeAttempt?.[0] ?? (receivedType ? `${path}.type is unsupported; received ${JSON.stringify(receivedType)}` : undefined);
      const fallback = attempts.flat().find((error) => /\.unit/.test(error)) ?? attempts.flat().find((error) => /\.type/.test(error)) ?? attempts.flat()[0];
      errors.push(`${path} must match exactly one allowed shape${detail ?? fallback ? ` (${detail ?? fallback})` : ""}`);
    }
    return errors;
  }

  if (Object.hasOwn(schema, "const") && value !== schema.const) {
    errors.push(`${path} must equal ${JSON.stringify(schema.const)}; received ${JSON.stringify(value)}`);
    return errors;
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path} must be one of ${schema.enum.join(", ")}; received ${JSON.stringify(value)}`);
    return errors;
  }
  if (schema.type && !typeMatches(schema.type, value)) {
    errors.push(`${path} must be ${schema.type}; received ${Array.isArray(value) ? "array" : typeof value}`);
    return errors;
  }

  if (schema.type === "object") {
    for (const required of schema.required ?? []) {
      if (!Object.hasOwn(value, required)) errors.push(`${path}.${required} is required`);
    }
    for (const [key, child] of Object.entries(value)) {
      if (schema.properties?.[key]) validateJsonSchema(schema.properties[key], child, root, `${path}.${key}`, errors);
      else if (schema.additionalProperties === false) errors.push(`${path}.${key} is not allowed`);
    }
  }

  if (schema.type === "array") {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path} needs at least ${schema.minItems} items`);
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) errors.push(`${path} items must be unique`);
    value.forEach((item, index) => validateJsonSchema(schema.items, item, root, `${path}[${index}]`, errors));
  }

  if (schema.type === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path} is too short`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${path} is too long`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path} does not match ${schema.pattern}`);
    if (schema.format && !isFormat(schema.format, value)) errors.push(`${path} must use ${schema.format} format`);
  }

  if (["integer", "number"].includes(schema.type)) {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path} must be at least ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path} must be at most ${schema.maximum}`);
  }
  return errors;
}

export function assertValidJson(schema, value, label, root = schema) {
  const errors = validateJsonSchema(schema, value, root);
  if (errors.length) throw new Error(`${label} is invalid:\n- ${errors.join("\n- ")}`);
}
