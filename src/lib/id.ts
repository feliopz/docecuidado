import * as Crypto from 'expo-crypto';

/**
 * Collision-resistant, unpredictable identifier (UUID v4 via CSPRNG).
 * Replaces the previous `Date.now().toString()` ids, which were sequential and
 * trivially enumerable. An optional prefix keeps ids self-describing in logs.
 */
export function genId(prefix = ''): string {
  return prefix ? `${prefix}${Crypto.randomUUID()}` : Crypto.randomUUID();
}

// 32 unambiguous characters (no 0/O/1/I) — 6 chars ≈ 1 billion combinations.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Cryptographically-secure invite code. 256 is divisible by 32, so the modulo
 * mapping introduces no bias. Replaces the previous Math.random() generator.
 */
export function generateInviteCode(length = 6): string {
  const bytes = Crypto.getRandomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}
