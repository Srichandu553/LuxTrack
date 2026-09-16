import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/app.js";

const withServer = async (callback) => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    return await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

test("GET /health returns service status", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.status, "ok");
  });
});

test("GET /health/ready reports database readiness", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health/ready`);
    const body = await response.json();

    assert.ok([200, 503].includes(response.status));
    assert.equal(body.success, response.status === 200);
    assert.ok(["ready", "not_ready"].includes(body.status));
    assert.ok(["ok", "unavailable"].includes(body.database));
  });
});

test("protected profile endpoint rejects unauthenticated requests", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/profile`);
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.success, false);
  });
});

test("unknown API routes return a consistent JSON error", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/not-a-route`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.deepEqual(body, { success: false, message: "Route not found" });
  });
});

test("JSON payloads above the configured limit are rejected", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "x".repeat(1_100_000) })
    });

    assert.equal(response.status, 413);
  });
});
