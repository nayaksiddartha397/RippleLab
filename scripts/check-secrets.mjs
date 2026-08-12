import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const excludedDirectories = new Set([
  ".git",
  ".next",
  ".pnpm-store",
  ".venv",
  "node_modules",
  "output",
  "tmp",
]);
const textExtensions = new Set([
  "",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".py",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const allowedFiles = new Set([".env.example"]);
const suspiciousPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/,
  /(?:SUPABASE_SERVICE_ROLE_KEY|LLM_API_KEY)\s*=\s*[^\s#][^\n]*/,
];

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    if (excludedDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await collect(path)));
    else if (entry.isFile() && textExtensions.has(extname(entry.name))) paths.push(path);
  }
  return paths;
}

const findings = [];
for (const path of await collect(root)) {
  const localPath = relative(root, path);
  if (allowedFiles.has(localPath)) continue;
  const content = await readFile(path, "utf8");
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) findings.push(`${localPath}: ${pattern}`);
  }
}

if (findings.length > 0) {
  console.error("Potential committed secrets detected:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("secrets: no common committed-secret patterns detected");
