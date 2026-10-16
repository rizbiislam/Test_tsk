/**
 * AeroTech — Remote Config Service
 *
 * Fetches and caches the remote config from GitHub.
 * The GitHub URL is encrypted with AES-XOR cipher and decrypted at runtime in memory.
 *
 * Security Features:
 *  - Supports both Plain JSON AND 100% Base64-encoded files on GitHub
 *  - Supports disguised / obfuscated field names (no obvious words like "sponsor", "maintenance")
 *  - Supports Base64-encoded API URLs (e.g. content_node)
 *  - In-memory cache + persistent storage cache (TTL: 5 minutes)
 */

import { SimpleStorage } from './storage';
import { decryptConfigUrl } from '../security/decrypt';
import { _APP_THEME_PRIMARY_ACCENT_HEX as _cipher } from '../security/obfuscated-url';

const CACHE_KEY = '_at_cfg_v2';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface AppFeatures {
  sponsor_removal: boolean;
  download_transcript: boolean;
  share_button: boolean;
  paragraph_mode: boolean;
}

export interface DynamicUpdate {
  enabled: boolean;
  bundle_url: string;
}

export interface AppConfig {
  is_app_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  force_update: boolean;
  force_update_message: string;
  sponsor_api_url?: string;
  api_base_url: string;
  features: AppFeatures;
  dynamic_update: DynamicUpdate;
  announcement: string;
  min_version: string;
}

/** Safe default config */
const DEFAULT_CONFIG: AppConfig = {
  is_app_enabled: true,
  maintenance_mode: false,
  maintenance_message: '',
  force_update: false,
  force_update_message: '',
  sponsor_api_url: 'https://sponsor.ajay.app/api/skipSegments',
  api_base_url: '', // standalone on-device execution
  features: {
    sponsor_removal: true,
    download_transcript: true,
    share_button: true,
    paragraph_mode: true,
  },
  dynamic_update: {
    enabled: false,
    bundle_url: '',
  },
  announcement: '',
  min_version: '1.0.0',
};

interface CacheEntry {
  config: AppConfig;
  fetchedAt: number;
}

let _memCache: CacheEntry | null = null;

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

/**
 * Universal Base64 decoder with zero external dependencies.
 */
export function decodeBase64(input: string): string {
  try {
    const str = input.replace(/[\t\n\f\r ]+/g, '');
    let output = '';
    let i = 0;
    while (i < str.length) {
      const enc1 = B64_CHARS.indexOf(str.charAt(i++));
      const enc2 = B64_CHARS.indexOf(str.charAt(i++));
      const enc3 = B64_CHARS.indexOf(str.charAt(i++));
      const enc4 = B64_CHARS.indexOf(str.charAt(i++));

      if (enc1 === -1 || enc2 === -1) break;

      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;

      output += String.fromCharCode(chr1);
      if (enc3 !== 64 && enc3 !== -1) {
        output += String.fromCharCode(chr2);
      }
      if (enc4 !== 64 && enc4 !== -1) {
        output += String.fromCharCode(chr3);
      }
    }
    return decodeURIComponent(escape(output));
  } catch {
    return input;
  }
}

/**
 * Automatically decodes a string if it is Base64 encoded.
 * If already a plaintext URL, returns it directly.
 */
export function decodeIfBase64(val?: any): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  try {
    const decoded = decodeBase64(trimmed);
    if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
      return decoded;
    }
  } catch {}
  return trimmed;
}

/**
 * Parses raw remote text whether it's plain JSON or a 100% Base64-encoded blob.
 */
export function parseRemoteConfigText(rawText: string): AppConfig {
  let jsonString = rawText.trim();

  // 1. If wrapped in JSON quotes: "eyJ..."
  if (jsonString.startsWith('"') && jsonString.endsWith('"')) {
    jsonString = jsonString.slice(1, -1).trim();
  }

  // 2. If not starting with '{', it's a full Base64 encoded payload
  if (!jsonString.startsWith('{')) {
    jsonString = decodeBase64(jsonString);
  }

  let remote: any = {};
  try {
    remote = JSON.parse(jsonString);
  } catch {
    try {
      remote = JSON.parse(decodeBase64(jsonString));
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  // 3. If wrapped in a JSON envelope: { "payload": "eyJ..." } or { "data": "eyJ..." }
  if (remote && typeof remote === 'object' && !remote.engine_active && !remote.is_app_enabled) {
    const innerB64 = remote.payload || remote.data || remote.config;
    if (typeof innerB64 === 'string') {
      try {
        remote = JSON.parse(decodeBase64(innerB64));
      } catch {}
    }
  }

  const remoteFeatures = remote?.features || {};

  // Support both disguised/obfuscated keyword names AND legacy keyword names
  const merged: AppConfig = {
    is_app_enabled:
      remote.engine_active ??
      remote.sys_active ??
      remote.is_app_enabled ??
      DEFAULT_CONFIG.is_app_enabled,

    maintenance_mode:
      remote.standby_mode ??
      remote.sys_hold ??
      remote.maintenance_mode ??
      DEFAULT_CONFIG.maintenance_mode,

    maintenance_message:
      remote.standby_notice ??
      remote.maintenance_message ??
      DEFAULT_CONFIG.maintenance_message,

    force_update:
      remote.critical_rev ??
      remote.force_update ??
      DEFAULT_CONFIG.force_update,

    force_update_message:
      remote.critical_notice ??
      remote.force_update_message ??
      DEFAULT_CONFIG.force_update_message,

    sponsor_api_url:
      decodeIfBase64(remote.content_node ?? remote.filter_endpoint ?? remote.sponsor_api_url) ||
      DEFAULT_CONFIG.sponsor_api_url,

    api_base_url:
      decodeIfBase64(remote.gateway_node ?? remote.api_base_url) ||
      DEFAULT_CONFIG.api_base_url,

    features: {
      sponsor_removal:
        remoteFeatures.stream_clean ??
        remoteFeatures.clean_filter ??
        remoteFeatures.sponsor_removal ??
        DEFAULT_CONFIG.features.sponsor_removal,

      download_transcript:
        remoteFeatures.export_txt ??
        remoteFeatures.download_transcript ??
        DEFAULT_CONFIG.features.download_transcript,

      share_button:
        remoteFeatures.share_action ??
        remoteFeatures.share_button ??
        DEFAULT_CONFIG.features.share_button,

      paragraph_mode:
        remoteFeatures.format_mode ??
        remoteFeatures.paragraph_mode ??
        DEFAULT_CONFIG.features.paragraph_mode,
    },

    dynamic_update: {
      enabled:
        remote.patch_delivery?.enabled ??
        remote.dynamic_update?.enabled ??
        DEFAULT_CONFIG.dynamic_update.enabled,
      bundle_url:
        decodeIfBase64(remote.patch_delivery?.bundle_url ?? remote.dynamic_update?.bundle_url) ||
        DEFAULT_CONFIG.dynamic_update.bundle_url,
    },

    announcement: remote.broadcast ?? remote.announcement ?? DEFAULT_CONFIG.announcement,
    min_version: remote.min_build ?? remote.min_version ?? DEFAULT_CONFIG.min_version,
  };

  return merged;
}

async function loadFromDisk(): Promise<CacheEntry | null> {
  try {
    const raw = await SimpleStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as CacheEntry;
  } catch {}
  return null;
}

async function saveToDisk(entry: CacheEntry): Promise<void> {
  try {
    await SimpleStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {}
}

function isFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

/**
 * Main entry point — call this on app startup.
 * Returns the live or cached AppConfig.
 */
export async function fetchConfig(): Promise<AppConfig> {
  // 1. Return in-memory cache if fresh
  if (_memCache && isFresh(_memCache)) return _memCache.config;

  // 2. Try disk cache
  const disk = await loadFromDisk();
  if (disk && isFresh(disk)) {
    _memCache = disk;
    return disk.config;
  }

  // 3. Decrypt the URL at runtime (never stored as plaintext)
  const configUrl = decryptConfigUrl(_cipher);

  // 4. Fetch from remote GitHub URL
  if (configUrl && !configUrl.includes('PASTE_ENCRYPTED')) {
    try {
      const res = await fetch(configUrl, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const rawText = await res.text();
        const merged = parseRemoteConfigText(rawText);
        const entry: CacheEntry = { config: merged, fetchedAt: Date.now() };
        _memCache = entry;
        await saveToDisk(entry);
        return merged;
      }
    } catch {}
  }

  // 5. Fallback: return stale disk cache if available
  if (disk) return disk.config;

  // 6. Final fallback: hardcoded defaults
  return DEFAULT_CONFIG;
}

/** Force refresh — bypasses cache, re-fetches from GitHub */
export async function refreshConfig(): Promise<AppConfig> {
  _memCache = null;
  await SimpleStorage.removeItem(CACHE_KEY);
  return fetchConfig();
}
