import { createHmac, timingSafeEqual } from "node:crypto";

export function verifySignature(body: Uint8Array, secret: string, header: string | undefined): boolean {
  if (header?.length !== 71 || !/^sha256=[0-9a-f]{64}$/.test(header)) return false;

  const received = Buffer.from(header.slice("sha256=".length), "hex");
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(received, expected);
}
