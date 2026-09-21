/* Request-body size guards with no runtime binding dependency, so they are safe
   to import from pure modules and unit tests.

   Content-Length is attacker-controlled and can be omitted entirely with a
   chunked request, so a header check alone is only a fast reject. readCappedText
   reads the body through a size-limited stream and aborts past the cap, so a
   body with no declared length cannot be buffered without bound before it is
   parsed. */

export class BodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeds the allowed size.");
    this.name = "BodyTooLargeError";
  }
}

export async function readCappedText(request: Request, maxBytes: number): Promise<string> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyTooLargeError();
  const body = request.body;
  if (!body) return "";
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export async function readCappedJson(request: Request, maxBytes: number): Promise<unknown> {
  return JSON.parse(await readCappedText(request, maxBytes));
}

/* For multipart/form-data, which is consumed by request.formData() and cannot be
   re-parsed from a pre-read buffer, fail closed when no length is declared so a
   chunked upload cannot skip the cap. Browsers always set Content-Length. */
export function bodyLengthUnknownOrOver(request: Request, maxBytes: number) {
  const value = request.headers.get("content-length");
  if (!value) return true;
  const length = Number(value);
  return !Number.isFinite(length) || length > maxBytes;
}
