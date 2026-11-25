import { expect, test } from "bun:test";
import { verifySignature } from "./signature";

const body = new TextEncoder().encode("The quick brown fox jumps over the lazy dog");
const signature = "sha256=f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8";

test("verifies a known HMAC-SHA256 signature for the exact bytes", () => {
  expect(verifySignature(body, "key", signature)).toBe(true);
  expect(verifySignature(new Uint8Array([...body, 10]), "key", signature)).toBe(false);
  expect(verifySignature(body, "other-key", signature)).toBe(false);
});

test("rejects missing, malformed, and mismatched signatures", () => {
  expect(verifySignature(body, "key", undefined)).toBe(false);
  expect(verifySignature(body, "key", signature.slice(0, -1))).toBe(false);
  expect(verifySignature(body, "key", signature + "\n")).toBe(false);
  expect(verifySignature(body, "key", "sha256=" + "g".repeat(64))).toBe(false);
  expect(verifySignature(body, "key", "sha256=" + "0".repeat(64))).toBe(false);
});
