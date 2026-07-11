const DEFAULT_CLIENT_ORIGIN = "http://localhost:5173";
const DEFAULT_API_URL = "http://localhost:3000";

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function getClientOrigins() {
  const configured = process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || process.env.ORIGIN;
  return splitCsv(configured || DEFAULT_CLIENT_ORIGIN);
}

function getPublicApiUrl() {
  return (process.env.PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
}

function getMongoUri() {
  return process.env.MONGO_URI || process.env.SECRET_KEY;
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET || process.env.KEY;
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }

  return "dev-session-secret";
}

module.exports = {
  getClientOrigins,
  getMongoUri,
  getPublicApiUrl,
  getSessionSecret,
};
