/** Short shareable Game ID for private invite matches (8 chars, no ambiguous glyphs). */
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateJoinCode(length = 8): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARSET[bytes[i] % CHARSET.length];
  }
  return code;
}

/** Normalize pasted Game ID: trim, uppercase, strip spaces/dashes. */
export function normalizeJoinCodeInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]/g, '');
}
