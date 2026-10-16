/**
 * AeroTech — Standalone Transcript & Sponsor Filter Service
 *
 * Runs 100% on-device inside the app — NO local server, NO local IP required.
 * When built as an APK, this works completely standalone on any phone.
 *
 * Pipeline:
 *  1. Parse YouTube Video ID from any URL format
 *  2. Fetch captions directly via YouTube InnerTube
 *  3. Load secret Sponsor API endpoint from remote GitHub config (never hardcoded in app)
 *  4. Filter out sponsor, self-promo, and interaction segments
 *  5. Optional remote cloud backend fallback if configured in remote config
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

const INNERTUBE_API_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
const INNERTUBE_CLIENT_VERSION = '20.10.38';
const INNERTUBE_USER_AGENT = `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36';

/**
 * Extracts 11-char YouTube Video ID from watch URLs, Shorts, embeds, youtu.be, or raw ID.
 */
export function extractVideoId(urlOrId: string): string {
  const patterns = [
    /(?:v=|\/)([0-9A-Za-z_-]{11}).*/,
    /(?:embed\/)([0-9A-Za-z_-]{11})/,
    /(?:watch\?v=)([0-9A-Za-z_-]{11})/,
    /(?:shorts\/)([0-9A-Za-z_-]{11})/,
    /^([0-9A-Za-z_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = urlOrId.match(pattern);
    if (match) return match[1];
  }
  throw new Error('Invalid YouTube URL or Video ID. Please check the link.');
}

/**
 * Decodes HTML entities commonly found in transcript XML.
 */
function decodeEntities(text: string): string {
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

interface RawCaptionEntry {
  text: string;
  start: number;
  duration: number;
}

/**
 * Parses YouTube XML transcript formats (both srv3 <p t="ms"> and classic <text start="s">).
 */
function parseTranscriptXml(xml: string): RawCaptionEntry[] {
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
    text = decodeEntities(text).trim();

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
    const text = decodeEntities(match[3]).trim();
    if (text) {
      results.push({ text, start, duration });
    }
  }

  return results;
}

/**
 * Fetches sponsor skip intervals from the endpoint provided in remote config.
 * (URL is loaded secretly from the GitHub config, not hardcoded in the app).
 */
async function fetchSponsorSkipSegments(
  sponsorApiUrl: string | undefined,
  videoId: string
): Promise<Array<[number, number]>> {
  if (!sponsorApiUrl) return [];

  try {
    const cats = encodeURIComponent(
      JSON.stringify(['sponsor', 'selfpromo', 'interaction'])
    );
    const url = `${sponsorApiUrl}?videoID=${videoId}&categories=${cats}`;
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
 * Direct on-device extraction from YouTube.
 * Works 100% standalone on device — requires NO local server.
 */
async function extractDirectOnDevice(
  videoId: string,
  config: AppConfig
): Promise<TranscriptResult> {
  const resp = await fetch(INNERTUBE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': INNERTUBE_USER_AGENT,
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: INNERTUBE_CLIENT_VERSION,
          hl: 'en',
          gl: 'US',
        },
      },
      videoId: videoId,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Unable to reach YouTube service (${resp.status})`);
  }

  const data = await resp.json();
  const captionTracks =
    data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
    throw new Error('No transcript or captions are available for this video.');
  }

  // Select primary caption track (English preferred if present)
  const track =
    captionTracks.find((t: any) => t.languageCode?.startsWith('en')) ||
    captionTracks[0];

  const capRes = await fetch(track.baseUrl, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!capRes.ok) {
    throw new Error('Failed to retrieve caption stream from YouTube.');
  }

  const xml = await capRes.text();
  const entries = parseTranscriptXml(xml);

  if (entries.length === 0) {
    throw new Error('No readable text found in captions.');
  }

  // Query SponsorBlock intervals using endpoint defined in GitHub config
  let skipSegments: Array<[number, number]> = [];
  if (config.features.sponsor_removal && config.sponsor_api_url) {
    skipSegments = await fetchSponsorSkipSegments(config.sponsor_api_url, videoId);
  }

  // Filter overlapping sponsor segments
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
 * Optional cloud backend fallback (only if user explicitly configured a remote cloud URL).
 */
async function extractViaRemoteBackend(
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
 * Always prefers standalone on-device execution (0 local server dependency).
 */
export async function extractTranscript(
  configOrUrl: AppConfig | string,
  youtubeUrl?: string
): Promise<TranscriptResult> {
  let config: AppConfig;
  let targetUrl: string;

  if (typeof configOrUrl === 'object') {
    config = configOrUrl;
    targetUrl = (youtubeUrl || '').trim();
  } else {
    // Backwards compatibility if called with (baseUrl, url)
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
    };
  }

  const videoId = extractVideoId(targetUrl);

  // 1. Primary: Run standalone on-device directly
  try {
    return await extractDirectOnDevice(videoId, config);
  } catch (directError: any) {
    // 2. Fallback: If and only if user configured a remote cloud backend URL (not localhost)
    if (
      config.api_base_url &&
      config.api_base_url.startsWith('https://') &&
      !config.api_base_url.includes('127.0.0.1') &&
      !config.api_base_url.includes('localhost')
    ) {
      try {
        return await extractViaRemoteBackend(config.api_base_url, targetUrl);
      } catch (backendError: any) {
        throw new Error(backendError?.message || directError?.message);
      }
    }
    throw directError;
  }
}

/**
 * Silent health check for cloud backend if configured.
 */
export async function pingBackend(baseUrl: string): Promise<void> {
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
