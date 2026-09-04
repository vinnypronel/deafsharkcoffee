const extensionMimeTypes: Record<string, Set<string>> = {
  pdf: new Set(["application/pdf"]),
  doc: new Set(["application/msword", "application/cdfv2", "application/octet-stream"]),
  docx: new Set([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/octet-stream",
  ]),
  txt: new Set(["text/plain", "application/octet-stream"]),
  rtf: new Set(["application/rtf", "text/rtf", "application/octet-stream"]),
};

export const allowedResumeExtensions = new Set(Object.keys(extensionMimeTypes));

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

export async function isAllowedResumeFile(file: File, extension: string) {
  const normalizedExtension = extension.toLowerCase();
  const allowedMimes = extensionMimeTypes[normalizedExtension];
  const normalizedMime = file.type.toLowerCase();
  if (!allowedMimes || (normalizedMime && !allowedMimes.has(normalizedMime))) return false;

  const bytes = new Uint8Array(await file.slice(0, 8192).arrayBuffer());
  if (normalizedExtension === "pdf") return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (normalizedExtension === "doc") return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (normalizedExtension === "docx") return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);

  const sample = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (normalizedExtension === "rtf") return sample.trimStart().startsWith("{\\rtf");
  return normalizedExtension === "txt" && !bytes.includes(0);
}
