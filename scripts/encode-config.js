#!/usr/bin/env node
/**
 * AeroTech — Config Obfuscator & Base64 Encoder
 * ==============================================
 * This script prepares your GitHub config file with:
 *  1. Disguised keyword names (no obvious words like "sponsor", "maintenance", "api")
 *  2. Base64-encoded sponsor API endpoint
 *  3. A 100% Base64-encoded single-string version for maximum privacy on GitHub
 *
 * Usage:
 *   node scripts/encode-config.js
 */

const fs = require('fs');
const path = require('path');

const SPONSOR_URL = 'https://sponsor.ajay.app/api/skipSegments';
const B64_SPONSOR_URL = Buffer.from(SPONSOR_URL).toString('base64');

// Disguised JSON structure
const disguisedConfig = {
  engine_active: true,
  standby_mode: false,
  standby_notice: "Service optimization in progress.",
  critical_rev: false,
  critical_notice: "Update required to continue.",
  content_node: B64_SPONSOR_URL,
  gateway_node: "",
  features: {
    stream_clean: true,
    export_txt: true,
    share_action: true,
    format_mode: true,
  },
  patch_delivery: {
    enabled: false,
    bundle_url: "",
  },
  broadcast: "",
  min_build: "1.0.0",
};

const jsonString = JSON.stringify(disguisedConfig, null, 2);
const fullBase64 = Buffer.from(JSON.stringify(disguisedConfig)).toString('base64');

console.log('\n======================================================');
console.log('🔒 OPTION 1: Disguised JSON (Safe & Clean)');
console.log('======================================================\n');
console.log(jsonString);

console.log('\n======================================================');
console.log('🛡️ OPTION 2: 100% Base64 Encoded (Maximum Privacy)');
console.log('   Paste this single string into your GitHub config.json');
console.log('======================================================\n');
console.log(fullBase64);
console.log('\n======================================================\n');

// Also save to config directory for convenience
const targetPath = path.resolve(__dirname, '../../config/config.obfuscated.json');
fs.writeFileSync(targetPath, jsonString, 'utf-8');

const targetB64Path = path.resolve(__dirname, '../../config/config.base64.txt');
fs.writeFileSync(targetB64Path, fullBase64, 'utf-8');

console.log(`Saved Disguised JSON to: config/config.obfuscated.json`);
console.log(`Saved Full Base64 to:    config/config.base64.txt\n`);
