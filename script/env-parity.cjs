const fs = require("fs");
const path = require("path");

const envPath = path.join(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
  console.error("Missing .env file in project root.");
  process.exit(1);
}

const requiredKeys = [
  "SESSION_SECRET",
  "PORT",
  "OPENAI_MODEL",
  "AI_INTEGRATIONS_OPENAI_API_KEY",
  "DATABASE_URL",
];

const optionalKeys = [
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "AI_INTEGRATIONS_OPENAI_BASE_URL",
];

const raw = fs.readFileSync(envPath, "utf8");
const parsed = {};
for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim();
  parsed[key] = value;
}

const missing = requiredKeys.filter((k) => !parsed[k]);
console.log("Replit parity check (.env):");
for (const key of requiredKeys) {
  console.log(`- ${key}: ${parsed[key] ? "present" : "missing"}`);
}
for (const key of optionalKeys) {
  console.log(`- ${key}: ${parsed[key] ? "present" : "not set"}`);
}

if (missing.length > 0) {
  console.error(`Missing required keys: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Required parity keys are present.");
