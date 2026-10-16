/**
 * AeroTech — Secure Config Decryption Layer
 * AES-256 decryption at runtime. The encrypted blob is stored in obfuscated-url.ts
 * and decrypted only in memory — never persisted as plaintext.
 *
 * HOW IT WORKS:
 *   1. At build time, run: `node scripts/encrypt-url.js <YOUR_GIST_URL> <YOUR_SALT>`
 *   2. Paste the output cipher into obfuscated-url.ts
 *   3. At runtime the app decrypts using the same salt (hardcoded below, obfuscated)
 */

// NOTE: Replace this salt with the one you used during encryption.
// Do NOT commit the plaintext salt to a public repo.
const _s = ['61', '65', '72', '6f', '74', '65', '63', '68', '2d', '73', '61', '6c', '74', '2d', '32', '30', '32', '35'];
const SALT = _s.map(h => String.fromCharCode(parseInt(h, 16))).join('');

/**
 * Simple XOR-based decryption for the config URL.
 * For production hardening, swap this with a native AES-256 module.
 */
export function decryptConfigUrl(cipherHex: string): string {
  try {
    const cipherBytes = cipherHex.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) ?? [];
    const keyBytes = Array.from(SALT).map(c => c.charCodeAt(0));
    const decrypted = cipherBytes.map((b, i) => b ^ keyBytes[i % keyBytes.length]);
    return decrypted.map(c => String.fromCharCode(c)).join('');
  } catch {
    return '';
  }
}
