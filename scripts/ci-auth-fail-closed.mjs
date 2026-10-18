import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const temp = mkdtempSync(join(tmpdir(), "receipt-auth-test-"));
const dbPath = join(temp, "local-only.sqlite");
const user = "ci-fake-username";
const password = "CI_FAKE_PASSWORD_NOT_FOR_PRODUCTION";
const hash = createHash("sha256").update(password).digest("hex");
const baseEnv = { ...process.env };
delete baseEnv.APP_BASIC_AUTH_USERNAME;
delete baseEnv.APP_BASIC_AUTH_PASSWORD_SHA256;
baseEnv.CI = "true";
baseEnv.NODE_ENV = "production";
baseEnv.NEXT_TELEMETRY_DISABLED = "1";
baseEnv.TURSO_DATABASE_URL = "file:" + dbPath;
baseEnv.TURSO_AUTH_TOKEN = "CI_NON_SECRET_LOCAL_ONLY";
baseEnv.OPENAI_API_KEY = "";
baseEnv.BLOB_READ_WRITE_TOKEN = "";
baseEnv.GITHUB_TOKEN = "";
baseEnv.GH_TOKEN = "";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let checked = 0;

async function portForTest() {
  return await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : null;
      probe.close(() => port ? resolve(port) : reject(new Error("No local test port")));
    });
  });
}

async function runScenario(label, credentials, expectedAccess) {
  const port = await portForTest();
  const env = { ...baseEnv, ...credentials };
  const server = spawn(process.execPath, [
    "node_modules/next/dist/bin/next", "start",
    "--hostname", "127.0.0.1", "--port", String(port),
  ], { env, stdio: ["ignore", "pipe", "pipe"] });

  // Never print process output: environment details may be included in error reports.
  const discard = () => {};
  server.stdout.on("data", discard);
  server.stderr.on("data", discard);

  const target = "http://127.0.0.1:" + port;
  const validAuth = "Basic " + Buffer.from(user + ":" + password).toString("base64");
  const wrongAuth = "Basic " + Buffer.from(user + ":wrong-password").toString("base64");
  const wrongUserAuth = "Basic " + Buffer.from("wrong-user:" + password).toString("base64");
  const req = (path, authorization) => fetch(target + path, {
    redirect: "manual", signal: AbortSignal.timeout(10000),
    headers: authorization ? { authorization } : {},
  });
  const verify = (message, expression) => {
    assert.ok(expression, label + ": " + message);
    checked += 1;
    console.log("PASS: " + label + ": " + message);
  };

  try {
    let ready = false;
    for (let i = 0; i < 80; i += 1) {
      if (server.exitCode !== null) throw new Error(label + ": server exited");
      try {
        const result = await req("/api/health");
        if (result.status === 401) { ready = true; break; }
      } catch { /* startup not complete */ }
      await sleep(350);
    }
    if (!ready) throw new Error(label + ": local server did not become ready");

    let response = await req("/api/health", validAuth);
    verify("correct-looking credentials are handled correctly",
      response.status === (expectedAccess ? 200 : 401));

    if (!expectedAccess) {
      verify("fail-closed response has private no-store policy",
        (response.headers.get("cache-control") || "").includes("no-store"));
      response = await req("/api/receipts", validAuth);
      verify("receipt API inaccessible", response.status === 401);
      return;
    }

    const health = await response.json();
    verify("only local database connected",
      health.ok === true && health.database === "connected" &&
      health.receipts === 0);
    verify("external AI and storage disabled",
      health.openaiConfigured === false && health.blobConfigured === false);

    response = await req("/api/health");
    verify("anonymous access denied", response.status === 401);
    response = await req("/api/health", wrongAuth);
    verify("wrong password denied", response.status === 401);
    response = await req("/api/health", wrongUserAuth);
    verify("wrong username denied", response.status === 401);
    response = await req("/api/receipts", validAuth);
    verify("authorized receipt listing succeeds", response.status === 200);
  } finally {
    server.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      sleep(3000),
    ]);
    if (server.exitCode === null) server.kill("SIGKILL");
  }
}

try {
  await runScenario("both vars absent", {}, false);
  await runScenario("username only", { APP_BASIC_AUTH_USERNAME: user }, false);
  await runScenario("hash only", { APP_BASIC_AUTH_PASSWORD_SHA256: hash }, false);
  await runScenario("malformed hash", {
    APP_BASIC_AUTH_USERNAME: user,
    APP_BASIC_AUTH_PASSWORD_SHA256: "not-a-sha256",
  }, false);
  await runScenario("blank username", {
    APP_BASIC_AUTH_USERNAME: "   ",
    APP_BASIC_AUTH_PASSWORD_SHA256: hash,
  }, false);
  await runScenario("valid synthetic credentials", {
    APP_BASIC_AUTH_USERNAME: user,
    APP_BASIC_AUTH_PASSWORD_SHA256: hash,
  }, true);
  console.log("PASS: " + checked + " fail-closed authentication assertions.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
