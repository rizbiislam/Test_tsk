/**
 * Meeting Timeline — Remote Config Service (OOP Architecture)
 *
 * Encapsulates remote configuration fetching, caching, runtime decryption,
 * and resilient parsing with zero external runtime dependencies.
 *
 * Developer: Rizbi Islam • AeroTech
 */

import { SimpleStorage } from './storage';
import { decryptConfigUrl } from '../security/decrypt';
import { _APP_THEME_PRIMARY_ACCENT_HEX as _cipher } from '../security/obfuscated-url';

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
  footprint: string;
}

interface CacheEntry {
  config: AppConfig;
  fetchedAt: number;
}

/**
 * Object-Oriented Remote Configuration Manager
 */
export class RemoteConfigManager {
  private static instance: RemoteConfigManager | null = null;
  private memCache: CacheEntry | null = null;
  private readonly cacheKey = '_mt_cfg_v2';
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes
  private readonly b64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  public static readonly DEFAULT_CONFIG: AppConfig = {
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
    footprint: 'Engineered by Rizbi Islam • AeroTech',
  };

  private constructor() {}

  /**
   * Singleton Accessor
   */
  public static getInstance(): RemoteConfigManager {
    if (!RemoteConfigManager.instance) {
      RemoteConfigManager.instance = new RemoteConfigManager();
    }
    return RemoteConfigManager.instance;
  }

  /**
   * Universal Base64 decoder with resilient padding and zero external dependencies.
   */
  public decodeBase64(input: string): string {
    try {
      let str = input.replace(/[\t\n\f\r ]+/g, '');
      str = str.replace(/=+$/, '');
      while (str.length % 4 !== 0) {
        str += '=';
      }

      let output = '';
      let i = 0;
      while (i < str.length) {
        const enc1 = this.b64Chars.indexOf(str.charAt(i++));
        const enc2 = this.b64Chars.indexOf(str.charAt(i++));
        const enc3 = this.b64Chars.indexOf(str.charAt(i++));
        const enc4 = this.b64Chars.indexOf(str.charAt(i++));

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
      try {
        return decodeURIComponent(escape(output));
      } catch {
        return output;
      }
    } catch {
      return input;
    }
  }

  /**
   * Automatically decodes a string if Base64 encoded, otherwise returns plaintext.
   */
  public decodeIfBase64(val?: any): string {
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    try {
      const decoded = this.decodeBase64(trimmed);
      if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
        return decoded;
      }
    } catch {}
    return trimmed;
  }

  /**
   * Sanitizes comments, outer quotes, and isolates outermost JSON objects.
   */
  private cleanRawConfigString(raw: string): string {
    let text = (raw || '').trim();
    text = text.replace(/\/\*[\s\S]*?\*\//g, '');
    text = text.replace(/\/\/.*$/gm, '');
    text = text.trim();

    if (text.startsWith('"') && text.endsWith('"')) {
      text = text.slice(1, -1).trim();
    }

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }
    return text;
  }

  /**
   * Parses raw remote configuration string (JSON, Base64 blob, or wrapped envelope).
   */
  public parseRemoteConfigText(rawText: string): AppConfig {
    let jsonString = this.cleanRawConfigString(rawText);

    if (!jsonString.startsWith('{')) {
      jsonString = this.cleanRawConfigString(this.decodeBase64(jsonString));
    }

    let remote: any = {};
    try {
      remote = JSON.parse(jsonString);
    } catch {
      try {
        remote = JSON.parse(this.cleanRawConfigString(this.decodeBase64(jsonString)));
      } catch {
        return RemoteConfigManager.DEFAULT_CONFIG;
      }
    }

    // Support wrapped payloads: { "payload": "..." } or { "data": "..." }
    if (remote && typeof remote === 'object' && !remote.engine_active && !remote.is_app_enabled) {
      const innerB64 = remote.payload || remote.data || remote.config;
      if (typeof innerB64 === 'string') {
        try {
          remote = JSON.parse(this.cleanRawConfigString(this.decodeBase64(innerB64)));
        } catch {}
      }
    }

    const remoteFeatures = remote?.features || {};

    const merged: AppConfig = {
      is_app_enabled:
        remote.engine_active ??
        remote.sys_active ??
        remote.is_app_enabled ??
        RemoteConfigManager.DEFAULT_CONFIG.is_app_enabled,

      maintenance_mode:
        remote.standby_mode ??
        remote.sys_hold ??
        remote.maintenance_mode ??
        RemoteConfigManager.DEFAULT_CONFIG.maintenance_mode,

      maintenance_message:
        remote.standby_notice ??
        remote.maintenance_message ??
        RemoteConfigManager.DEFAULT_CONFIG.maintenance_message,

      force_update:
        remote.critical_rev ??
        remote.force_update ??
        RemoteConfigManager.DEFAULT_CONFIG.force_update,

      force_update_message:
        remote.critical_notice ??
        remote.force_update_message ??
        RemoteConfigManager.DEFAULT_CONFIG.force_update_message,

      sponsor_api_url:
        this.decodeIfBase64(remote.content_node ?? remote.filter_endpoint ?? remote.sponsor_api_url) ||
        RemoteConfigManager.DEFAULT_CONFIG.sponsor_api_url,

      api_base_url:
        this.decodeIfBase64(remote.gateway_node ?? remote.api_base_url) ||
        RemoteConfigManager.DEFAULT_CONFIG.api_base_url,

      features: {
        sponsor_removal:
          remoteFeatures.stream_clean ??
          remoteFeatures.clean_filter ??
          remoteFeatures.sponsor_removal ??
          RemoteConfigManager.DEFAULT_CONFIG.features.sponsor_removal,

        download_transcript:
          remoteFeatures.export_txt ??
          remoteFeatures.download_transcript ??
          RemoteConfigManager.DEFAULT_CONFIG.features.download_transcript,

        share_button:
          remoteFeatures.share_action ??
          remoteFeatures.share_button ??
          RemoteConfigManager.DEFAULT_CONFIG.features.share_button,

        paragraph_mode:
          remoteFeatures.format_mode ??
          remoteFeatures.paragraph_mode ??
          RemoteConfigManager.DEFAULT_CONFIG.features.paragraph_mode,
      },

      dynamic_update: {
        enabled:
          remote.patch_delivery?.enabled ??
          remote.dynamic_update?.enabled ??
          RemoteConfigManager.DEFAULT_CONFIG.dynamic_update.enabled,
        bundle_url:
          this.decodeIfBase64(remote.patch_delivery?.bundle_url ?? remote.dynamic_update?.bundle_url) ||
          RemoteConfigManager.DEFAULT_CONFIG.dynamic_update.bundle_url,
      },

      announcement: remote.broadcast ?? remote.announcement ?? RemoteConfigManager.DEFAULT_CONFIG.announcement,
      min_version: remote.min_build ?? remote.min_version ?? RemoteConfigManager.DEFAULT_CONFIG.min_version,
      footprint:
        remote.signature ??
        remote.author_mark ??
        remote.footprint ??
        remote.brand_tag ??
        RemoteConfigManager.DEFAULT_CONFIG.footprint,
    };

    return merged;
  }

  private async loadFromDisk(): Promise<CacheEntry | null> {
    try {
      const raw = await SimpleStorage.getItem(this.cacheKey);
      if (raw) return JSON.parse(raw) as CacheEntry;
    } catch {}
    return null;
  }

  private async saveToDisk(entry: CacheEntry): Promise<void> {
    try {
      await SimpleStorage.setItem(this.cacheKey, JSON.stringify(entry));
    } catch {}
  }

  private isFresh(entry: CacheEntry): boolean {
    return Date.now() - entry.fetchedAt < this.cacheTtlMs;
  }

  /**
   * Main entry point to fetch and synchronize configuration.
   */
  public async fetchConfig(): Promise<AppConfig> {
    if (this.memCache && this.isFresh(this.memCache)) {
      return this.memCache.config;
    }

    const disk = await this.loadFromDisk();
    if (disk && this.isFresh(disk)) {
      this.memCache = disk;
      return disk.config;
    }

    const configUrl = decryptConfigUrl(_cipher);

    if (configUrl && !configUrl.includes('PASTE_ENCRYPTED')) {
      try {
        const res = await fetch(configUrl, {
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (res.ok) {
          const rawText = await res.text();
          const merged = this.parseRemoteConfigText(rawText);
          const entry: CacheEntry = { config: merged, fetchedAt: Date.now() };
          this.memCache = entry;
          await this.saveToDisk(entry);
          return merged;
        }
      } catch {}
    }

    if (disk) return disk.config;

    return RemoteConfigManager.DEFAULT_CONFIG;
  }

  /**
   * Forces cache invalidation and pulls live remote config.
   */
  public async refreshConfig(): Promise<AppConfig> {
    this.memCache = null;
    await SimpleStorage.removeItem(this.cacheKey);
    return this.fetchConfig();
  }
}

// ── Convenience Functional Exports (100% Backwards Compatible) ────────────────
export const remoteConfigManager = RemoteConfigManager.getInstance();
export const fetchConfig = () => remoteConfigManager.fetchConfig();
export const refreshConfig = () => remoteConfigManager.refreshConfig();
export const parseRemoteConfigText = (rawText: string) => remoteConfigManager.parseRemoteConfigText(rawText);
export const decodeBase64 = (input: string) => remoteConfigManager.decodeBase64(input);
export const decodeIfBase64 = (val?: any) => remoteConfigManager.decodeIfBase64(val);
