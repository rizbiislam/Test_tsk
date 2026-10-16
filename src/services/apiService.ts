/**
 * Meeting Timeline — Dialogue & Caption Extraction Engine (OOP Architecture)
 *
 * Runs 100% on-device standalone — zero local server dependencies.
 *
 * Pipeline:
 *  1. Extracts & validates 11-char YouTube Video ID
 *  2. Connects to InnerTube API directly from mobile device
 *  3. Parses multi-format caption XML (srv3 + classic)
 *  4. Queries secret SponsorBlock skip endpoint defined in remote config
 *  5. Filters overlapping promotional/filler audio segments
 *
 * Developer: Rizbi Islam • AeroTech
 */

import type { AppConfig } from './configService';

export interface TranscriptResult {
  video_id: string;
  clean_text: string;
  qa_formatted_text?: string;
  segments_removed: number;
  word_count: number;
}

export interface ApiError {
  detail: string;
}

interface RawCaptionEntry {
  text: string;
  start: number;
  duration: number;
}

/**
 * Object-Oriented Caption & Dialogue Extractor
 */
export class TranscriptExtractor {
  private static instance: TranscriptExtractor | null = null;

  private readonly innertubeApiUrl =
    'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
  private readonly innertubeClientVersion = '20.10.38';
  private readonly innertubeUserAgent = `com.google.android.youtube/${this.innertubeClientVersion} (Linux; U; Android 14)`;
  private readonly browserUserAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36';

  private readonly videoIdPatterns: RegExp[] = [
    /(?:v=|\/)([0-9A-Za-z_-]{11}).*/,
    /(?:embed\/)([0-9A-Za-z_-]{11})/,
    /(?:watch\?v=)([0-9A-Za-z_-]{11})/,
    /(?:shorts\/)([0-9A-Za-z_-]{11})/,
    /^([0-9A-Za-z_-]{11})$/,
  ];

  public static getInstance(): TranscriptExtractor {
    if (!TranscriptExtractor.instance) {
      TranscriptExtractor.instance = new TranscriptExtractor();
    }
    return TranscriptExtractor.instance;
  }

  /**
   * Validates and extracts 11-character YouTube video ID.
   */
  public extractVideoId(urlOrId: string): string {
    for (const pattern of this.videoIdPatterns) {
      const match = urlOrId.match(pattern);
      if (match) return match[1];
    }
    throw new Error('Invalid discussion or video link. Please verify the URL.');
  }

  /**
   * Decodes HTML entities commonly found in transcript XML.
   */
  private decodeEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
        String.fromCodePoint(parseInt(hex, 16))
      )
      .replace(/&#(\d+);/g, (_, dec) =>
        String.fromCodePoint(parseInt(dec, 10))
      );
  }

  /**
   * Parses XML dialogue tracks (srv3 <p t="ms"> and classic <text start="s"> formats).
   */
  private parseTranscriptXml(xml: string): RawCaptionEntry[] {
    const results: RawCaptionEntry[] = [];

    // Format 1: srv3 format (<p t="ms" d="ms"><s>word</s></p>)
    const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
    let match: RegExpExecArray | null;
    while ((match = pRegex.exec(xml)) !== null) {
      const startMs = parseInt(match[1], 10);
      const durMs = parseInt(match[2], 10);
      const inner = match[3];

      let text = '';
      const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
      let sMatch: RegExpExecArray | null;
      while ((sMatch = sRegex.exec(inner)) !== null) {
        text += sMatch[1];
      }
      if (!text) {
        text = inner.replace(/<[^>]+>/g, '');
      }
      text = this.decodeEntities(text).trim();

      if (text) {
        results.push({
          text,
          start: startMs / 1000,
          duration: durMs / 1000,
        });
      }
    }

    if (results.length > 0) return results;

    // Format 2: classic format (<text start="s" dur="s">content</text>)
    const classicRegex = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;
    while ((match = classicRegex.exec(xml)) !== null) {
      const start = parseFloat(match[1]);
      const duration = parseFloat(match[2]);
      const text = this.decodeEntities(match[3]).trim();
      if (text) {
        results.push({ text, start, duration });
      }
    }

    return results;
  }

  /**
   * Fetches sponsor/filler skip intervals from remote endpoint.
   */
  private async fetchSponsorSkipSegments(
    sponsorApiUrl: string | undefined,
    videoId: string
  ): Promise<Array<[number, number]>> {
    if (!sponsorApiUrl) return [];

    try {
      const categories = encodeURIComponent(
        JSON.stringify(['sponsor', 'selfpromo', 'interaction'])
      );
      const url = `${sponsorApiUrl}?videoID=${videoId}&categories=${categories}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.status === 200) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data.map((item: any) => item.segment as [number, number]);
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Primary extraction pipeline running 100% on-device.
   */
  private async extractDirectOnDevice(
    videoId: string,
    config: AppConfig
  ): Promise<TranscriptResult> {
    const resp = await fetch(this.innertubeApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this.innertubeUserAgent,
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: this.innertubeClientVersion,
            hl: 'en',
            gl: 'US',
          },
        },
        videoId: videoId,
      }),
    });

    if (!resp.ok) {
      throw new Error(`Unable to contact dialogue service (${resp.status})`);
    }

    const data = await resp.json();
    const captionTracks =
      data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
      throw new Error('No spoken dialogue or captions available for this video.');
    }

    // Prefer English captions, otherwise pick primary track
    const track =
      captionTracks.find((t: any) => t.languageCode?.startsWith('en')) ||
      captionTracks[0];

    const capRes = await fetch(track.baseUrl, {
      headers: { 'User-Agent': this.browserUserAgent },
    });

    if (!capRes.ok) {
      throw new Error('Failed to retrieve audio dialogue stream.');
    }

    const xml = await capRes.text();
    const entries = this.parseTranscriptXml(xml);

    if (entries.length === 0) {
      throw new Error('No readable dialogue found in the audio stream.');
    }

    // Query skip intervals
    let skipSegments: Array<[number, number]> = [];
    if (config.features.sponsor_removal && config.sponsor_api_url) {
      skipSegments = await this.fetchSponsorSkipSegments(
        config.sponsor_api_url,
        videoId
      );
    }

    // Filter overlapping noise/sponsor segments
    const cleanSegments: string[] = [];
    for (const entry of entries) {
      const start = entry.start;
      const end = start + entry.duration;
      const isSponsored = skipSegments.some(
        (seg) => start < seg[1] && end > seg[0]
      );
      if (!isSponsored && entry.text) {
        cleanSegments.push(entry.text);
      }
    }

    const cleanText = cleanSegments.join(' ');
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

    return {
      video_id: videoId,
      clean_text: cleanText,
      segments_removed: skipSegments.length,
      word_count: wordCount,
    };
  }

  /**
   * Optional remote cloud backend fallback.
   */
  private async extractViaRemoteBackend(
    baseUrl: string,
    youtubeUrl: string
  ): Promise<TranscriptResult> {
    const endpoint = `${baseUrl.replace(/\/+$/, '')}/extract/`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ url: youtubeUrl.trim() }),
    });

    if (!response.ok) {
      let detail = `Server error (${response.status})`;
      try {
        const err = (await response.json()) as ApiError;
        detail = err.detail ?? detail;
      } catch {}
      throw new Error(detail);
    }

    return (await response.json()) as TranscriptResult;
  }

  /**
   * Main Transcript Extractor.
   */
  public async extractTranscript(
    configOrUrl: AppConfig | string,
    youtubeUrl?: string
  ): Promise<TranscriptResult> {
    let config: AppConfig;
    let targetUrl: string;

    if (typeof configOrUrl === 'object') {
      config = configOrUrl;
      targetUrl = (youtubeUrl || '').trim();
    } else {
      targetUrl = (youtubeUrl || '').trim();
      config = {
        is_app_enabled: true,
        maintenance_mode: false,
        maintenance_message: '',
        force_update: false,
        force_update_message: '',
        sponsor_api_url: 'https://sponsor.ajay.app/api/skipSegments',
        api_base_url: configOrUrl,
        features: {
          sponsor_removal: true,
          download_transcript: true,
          share_button: true,
          paragraph_mode: true,
        },
        dynamic_update: { enabled: false, bundle_url: '' },
        announcement: '',
        min_version: '1.0.0',
        footprint: 'Engineered by Rizbi Islam • AeroTech',
      };
    }

    const videoId = this.extractVideoId(targetUrl);

    try {
      return await this.extractDirectOnDevice(videoId, config);
    } catch (directError: any) {
      if (
        config.api_base_url &&
        config.api_base_url.startsWith('https://') &&
        !config.api_base_url.includes('127.0.0.1') &&
        !config.api_base_url.includes('localhost')
      ) {
        try {
          return await this.extractViaRemoteBackend(config.api_base_url, targetUrl);
        } catch (backendError: any) {
          throw new Error(backendError?.message || directError?.message);
        }
      }
      throw directError;
    }
  }

  /**
   * Silent health check for optional cloud backend.
   */
  public async pingBackend(baseUrl: string): Promise<void> {
    if (
      !baseUrl ||
      baseUrl.includes('127.0.0.1') ||
      baseUrl.includes('localhost')
    ) {
      return;
    }
    try {
      await fetch(`${baseUrl.replace(/\/+$/, '')}/health`, { method: 'GET' });
    } catch {}
  }
}

// ── Backwards Compatibility Export ──────────────────────────────────────────
export const transcriptExtractor = TranscriptExtractor.getInstance();
export const extractTranscript = (
  configOrUrl: AppConfig | string,
  youtubeUrl?: string
) => transcriptExtractor.extractTranscript(configOrUrl, youtubeUrl);
export const extractVideoId = (urlOrId: string) =>
  transcriptExtractor.extractVideoId(urlOrId);
export const pingBackend = (baseUrl: string) =>
  transcriptExtractor.pingBackend(baseUrl);
