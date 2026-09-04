import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedResumeFile } from "../lib/resume-file.ts";

test("accepts files whose extension, MIME type, and signature agree", async () => {
  const pdf = new File(["%PDF-1.7\nexample"], "resume.pdf", { type: "application/pdf" });
  const text = new File(["Plain text resume"], "resume.txt", { type: "text/plain" });
  assert.equal(await isAllowedResumeFile(pdf, "pdf"), true);
  assert.equal(await isAllowedResumeFile(text, "txt"), true);
});

test("rejects renamed executables and mismatched MIME types", async () => {
  const renamed = new File([new Uint8Array([0x4d, 0x5a, 0x90, 0x00])], "resume.pdf", { type: "application/pdf" });
  const mismatch = new File(["%PDF-1.7"], "resume.pdf", { type: "image/png" });
  assert.equal(await isAllowedResumeFile(renamed, "pdf"), false);
  assert.equal(await isAllowedResumeFile(mismatch, "pdf"), false);
});
