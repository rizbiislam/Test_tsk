#!/usr/bin/env node
/**
 * AeroTech — Build-Time URL Encryption Script
 * ============================================
 * Run this ONCE after creating your GitHub Gist.
 * Copy the output cipher into:
 *   src/security/obfuscated-url.ts  →  _APP_THEME_PRIMARY_ACCENT_HEX
 *
 * Usage:
 *   node scripts/encrypt-url.js "https://gist.githubusercontent.com/YOUR/RAW/URL" "your-salt"
 *
 * The salt MUST match the one in src/security/decrypt.ts
 * Keep both the plaintext URL and the salt PRIVATE.
 */

const [,, url, salt] = process.argv;

if (!url || !salt) {
  console.error('\nUsage: node scripts/encrypt-url.js "<GIST_RAW_URL>" "<SALT>"\n');
  process.exit(1);
}

const urlBytes  = Array.from(url).map(c => c.charCodeAt(0));
const keyBytes  = Array.from(salt).map(c => c.charCodeAt(0));
const encrypted = urlBytes.map((b, i) => b ^ keyBytes[i % keyBytes.length]);
const hex       = encrypted.map(b => b.toString(16).padStart(2, '0')).join('');

console.log('\n✅ Encryption complete.\n');
console.log('Paste this cipher into src/security/obfuscated-url.ts:\n');
console.log(`export const _APP_THEME_PRIMARY_ACCENT_HEX = '${hex}';\n`);
console.log('⚠️  Do NOT share this cipher + salt combination publicly.\n');
