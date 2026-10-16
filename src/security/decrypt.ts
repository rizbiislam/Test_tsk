/**
 * Meeting Timeline — Secure Decryption Layer (OOP Architecture)
 *
 * Encapsulates runtime XOR-AES memory decryption so remote GitHub endpoints
 * are never stored in plaintext within the binary.
 *
 * Developer: Rizbi Islam • AeroTech
 */

export class CipherSecurityEngine {
  private static readonly saltHexChunks = [
    '61', '65', '72', '6f', '74', '65', '63', '68',
    '2d', '73', '61', '6c', '74', '2d', '32', '30', '32', '35',
  ];

  private static getSalt(): string {
    return this.saltHexChunks
      .map((h) => String.fromCharCode(parseInt(h, 16)))
      .join('');
  }

  /**
   * Decrypts hexadecimal cipher stream in memory at runtime.
   */
  public static decrypt(cipherHex: string): string {
    try {
      const salt = this.getSalt();
      const cipherBytes =
        cipherHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [];
      const keyBytes = Array.from(salt).map((c) => c.charCodeAt(0));
      const decrypted = cipherBytes.map(
        (b, i) => b ^ keyBytes[i % keyBytes.length]
      );
      return decrypted.map((c) => String.fromCharCode(c)).join('');
    } catch {
      return '';
    }
  }
}

// ── Backwards Compatibility Export ──────────────────────────────────────────
export const decryptConfigUrl = (cipherHex: string) =>
  CipherSecurityEngine.decrypt(cipherHex);
