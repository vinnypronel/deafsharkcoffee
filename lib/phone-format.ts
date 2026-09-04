/* Shared US phone formatting for every public form.

   Digits are the only thing kept from what the visitor types, so pasting
   "+1 732 979 9106" or "732.979.9106" both land on the same shape. The server
   still validates on digit count, not on this formatting. */

export const PHONE_INPUT_MAX_LENGTH = 14;

export function formatPhoneInput(raw: string) {
  const digits = raw.replace(/\D/g, "").replace(/^1(?=\d{10})/, "").slice(0, 10);
  if (!digits) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)})-${digits.slice(3)}`;
  return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
