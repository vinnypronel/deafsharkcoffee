import assert from "node:assert/strict";
import test from "node:test";
import { validateGeneratedWorkerConfig } from "../scripts/check-generated-worker-config.mjs";

const expected = {
  workerName: "deaf-shark-coffee-production",
  databaseId: "11111111-2222-3333-4444-555555555555",
  bucketName: "deaf-shark-uploads",
};

function safeConfig() {
  return {
    name: expected.workerName,
    d1_databases: [{ binding: "DB", database_id: expected.databaseId }],
    r2_buckets: [{ binding: "UPLOADS", bucket_name: expected.bucketName }],
  };
}

test("accepts an explicit secret-free generated Worker configuration", () => {
  assert.deepEqual(validateGeneratedWorkerConfig(safeConfig(), expected), []);
});

test("rejects plaintext vars and mismatched production resources", () => {
  const config = {
    ...safeConfig(),
    name: "wrong-worker",
    vars: { TURNSTILE_SECRET_KEY: "must-not-be-here" },
  };
  const errors = validateGeneratedWorkerConfig(config, expected);
  assert.ok(errors.some((error) => error.includes("must not contain vars")));
  assert.ok(errors.some((error) => error.includes("Worker name")));
});

test("rejects local routes and secret-shaped build defines", () => {
  const config = {
    ...safeConfig(),
    routes: ["localhost/*"],
    define: { API_TOKEN: "value" },
  };
  const errors = validateGeneratedWorkerConfig(config, expected);
  assert.ok(errors.some((error) => error.includes("local hostname")));
  assert.ok(errors.some((error) => error.includes("secret-shaped key")));
});
