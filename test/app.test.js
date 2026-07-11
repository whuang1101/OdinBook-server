const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "test-session-secret";
process.env.CLIENT_ORIGINS = "https://client.example.com,http://localhost:5173";

const { createApp } = require("../app");

let server;
let baseUrl;

test.before(async () => {
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("health endpoint reports readiness", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.headers.get("x-powered-by"), null);
});

test("allowed browser origins receive credentialed CORS headers", async () => {
  const response = await fetch(`${baseUrl}/health`, {
    headers: { Origin: "https://client.example.com" },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://client.example.com");
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
});

test("unknown browser origins are rejected", async () => {
  const response = await fetch(`${baseUrl}/health`, {
    headers: { Origin: "https://untrusted.example.com" },
  });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { message: "Origin is not allowed" });
});

test("authentication boundaries return JSON instead of redirects", async () => {
  const [meResponse, protectedResponse] = await Promise.all([
    fetch(`${baseUrl}/auth/me`),
    fetch(`${baseUrl}/friends/suggestions/507f1f77bcf86cd799439011`),
  ]);
  assert.equal(meResponse.status, 401);
  assert.equal(await meResponse.json(), false);
  assert.equal(protectedResponse.status, 401);
  assert.deepEqual(await protectedResponse.json(), { message: "Authentication required" });
});

test("invalid JSON and unknown routes have consistent errors", async () => {
  const invalidJson = await fetch(`${baseUrl}/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{invalid",
  });
  assert.equal(invalidJson.status, 400);
  assert.deepEqual(await invalidJson.json(), { message: "Invalid JSON body" });

  const missing = await fetch(`${baseUrl}/does-not-exist`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { message: "Route not found" });
});

test("Facebook routes report when the provider is disabled", async () => {
  const response = await fetch(`${baseUrl}/auth/facebook`, { redirect: "manual" });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { message: "Facebook login is not configured" });
});
