/**
 * Meeting Timeline — Executive PDF Report Generator (OOP Architecture)
 *
 * Generates an executive-grade briefing PDF containing:
 *  - Formal Briefing Header & Document Metadata
 *  - Key Performance & Duration Indicators (Word count, read time, questions detected)
 *  - Structured Question & Answer Exchange (Cards with distinct badges)
 *  - Executive Narrative & Summary
 *  - Developer Footprint: "Engineered by Rizbi Islam • AeroTech"
 *
 * Direct Storage:
 *  - Saves directly to device storage on Android via StorageAccessFramework.
 *  - Preserves local permanent document copy in FileSystem.documentDirectory.
 *  - Independent Sharing pipeline via native share sheet.
 *
 * Developer: Rizbi Islam • AeroTech
 */

import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { FormattedTranscript, QABlock } from './formatter';
import { TranscriptResult } from './apiService';

export interface ReportExportResult {
  uri: string;
  filename: string;
  savedDirectly: boolean;
  storagePath?: string;
}

/**
 * Object-Oriented PDF Report Generator & Storage Engine
 */
export class PdfReportEngine {
  private static instance: PdfReportEngine | null = null;

  public readonly developerName = 'Rizbi Islam';
  public readonly organization = 'AeroTech';
  public readonly appName = 'Meeting Timeline';

  public static getInstance(): PdfReportEngine {
    if (!PdfReportEngine.instance) {
      PdfReportEngine.instance = new PdfReportEngine();
    }
    return PdfReportEngine.instance;
  }

  /**
   * Returns a clean, short filename without illegal characters.
   * Example: Meeting_Timeline_20261016_2210.pdf
   */
  public getCleanReportFilename(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `Meeting_Timeline_${yyyy}${mm}${dd}_${hh}${min}.pdf`;
  }

  private getFormattedDate(): string {
    const d = new Date();
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Builds high-resolution, print-ready HTML for the executive briefing PDF.
   */
  public generateReportHtml(
    formatted: FormattedTranscript,
    raw: TranscriptResult,
    footprint?: string
  ): string {
    const dateStr = this.getFormattedDate();
    const signature = footprint || `${this.developerName} • ${this.organization}`;

    // Build Q&A HTML blocks
    const qaCardsHtml = formatted.qaBlocks
      .map((block: QABlock, index: number) => {
        if (block.type === 'question_answer') {
          return `
            <div class="qa-card">
              <div class="question-row">
                <span class="badge badge-q">Q${index + 1}</span>
                <div class="question-text">${this.escapeHtml(block.question || '')}</div>
              </div>
              ${
                block.answer
                  ? `
                <div class="answer-row">
                  <span class="badge badge-a">A${index + 1}</span>
                  <div class="answer-text">${this.escapeHtml(block.answer)}</div>
                </div>
              `
                  : ''
              }
            </div>
          `;
        }
        return `
          <div class="statement-card">
            <p>${this.escapeHtml(block.text)}</p>
          </div>
        `;
      })
      .join('');

    // Build Executive Paragraphs HTML
    const paragraphsHtml = formatted.paragraphs
      .map((p) => `<p class="executive-paragraph">${this.escapeHtml(p)}</p>`)
      .join('');

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Meeting Timeline Report</title>
        <style>
          @page {
            size: A4;
            margin: 18mm 16mm 20mm 16mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1E293B;
            background: #FFFFFF;
            margin: 0;
            padding: 0;
            font-size: 13px;
            line-height: 1.6;
          }
          
          /* Header Banner */
          .header {
            border-bottom: 2px solid #2563EB;
            padding-bottom: 16px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header-title {
            font-size: 24px;
            font-weight: 800;
            color: #0F172A;
            letter-spacing: -0.5px;
            margin: 0 0 4px 0;
          }
          .header-subtitle {
            font-size: 13px;
            color: #64748B;
            font-weight: 500;
            margin: 0;
          }
          .header-meta {
            text-align: right;
            font-size: 11px;
            color: #64748B;
          }
          .header-date {
            font-weight: 700;
            color: #0F172A;
            font-size: 12px;
          }

          /* Stats Grid */
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }
          .stat-box {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
          }
          .stat-value {
            font-size: 18px;
            font-weight: 800;
            color: #1E293B;
            margin-bottom: 2px;
          }
          .stat-value.accent { color: #2563EB; }
          .stat-value.success { color: #059669; }
          .stat-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748B;
            font-weight: 600;
          }

          /* Section Headings */
          .section-header {
            font-size: 14px;
            font-weight: 700;
            color: #0F172A;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            border-left: 4px solid #2563EB;
            padding-left: 10px;
            margin: 28px 0 16px 0;
          }

          /* Q&A Cards */
          .qa-card {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 14px;
            margin-bottom: 12px;
            page-break-inside: avoid;
          }
          .question-row {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 10px;
          }
          .badge {
            display: inline-block;
            font-size: 10px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 4px;
            flex-shrink: 0;
            line-height: 1.2;
          }
          .badge-q {
            background: #DBEAFE;
            color: #1D4ED8;
          }
          .badge-a {
            background: #D1FAE5;
            color: #047857;
          }
          .question-text {
            font-weight: 700;
            color: #0F172A;
            font-size: 13.5px;
            line-height: 1.45;
          }
          .answer-row {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding-top: 10px;
            border-top: 1px solid #E2E8F0;
          }
          .answer-text {
            color: #334155;
            font-size: 12.5px;
            line-height: 1.55;
          }

          .statement-card {
            background: #FFFFFF;
            border: 1px dashed #CBD5E1;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 10px;
            font-size: 12px;
            color: #475569;
            page-break-inside: avoid;
          }

          .executive-paragraph {
            font-size: 12.5px;
            color: #334155;
            line-height: 1.7;
            margin-bottom: 14px;
            text-align: justify;
          }

          /* Footer & Footprint */
          .footer {
            margin-top: 36px;
            padding-top: 14px;
            border-top: 1px solid #E2E8F0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            color: #94A3B8;
          }
          .footprint-tag {
            font-weight: 700;
            color: #2563EB;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div>
            <h1 class="header-title">${this.appName}</h1>
            <p class="header-subtitle">Executive Q&A Synthesis & Discussion Dossier • ${signature}</p>
          </div>
          <div class="header-meta">
            <div class="header-date">${dateStr}</div>
            <div>Ref ID: #${this.escapeHtml(raw.video_id || 'LOCAL')}</div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-value">${formatted.wordCount.toLocaleString()}</div>
            <div class="stat-label">Total Words</div>
          </div>
          <div class="stat-box">
            <div class="stat-value accent">${formatted.readTimeMinutes} min</div>
            <div class="stat-label">Estimated Read Time</div>
          </div>
          <div class="stat-box">
            <div class="stat-value ${formatted.questionCount > 0 ? 'accent' : ''}">${formatted.questionCount}</div>
            <div class="stat-label">Key Questions</div>
          </div>
          <div class="stat-box">
            <div class="stat-value success">${raw.segments_removed || 0}</div>
            <div class="stat-label">Noise Filtered</div>
          </div>
        </div>

        <!-- Q&A Section -->
        <div class="section-header">Structured Questions & Answers</div>
        <div class="qa-section">
          ${qaCardsHtml}
        </div>

        <!-- Narrative Section -->
        <div class="section-header" style="page-break-before: auto;">Executive Discussion Summary</div>
        <div class="narrative-section">
          ${paragraphsHtml}
        </div>

        <!-- Footer / Developer Footprint -->
        <div class="footer">
          <div>${this.appName} • Official Executive Briefing Document</div>
          <div>
            <span class="footprint-tag">${signature}</span> • v1.0.0
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Direct Download to Storage:
   * 1. Generates the PDF document.
   * 2. Permanently writes to app document directory so the file persists.
   * 3. On Android: Uses StorageAccessFramework to prompt for directory (e.g. Downloads)
   *    and saves the file directly into that folder without opening the share sheet.
   * 4. If permissions are cancelled, falls back cleanly to the native save sheet.
   */
  public async exportReportAsPdf(
    formatted: FormattedTranscript,
    raw: TranscriptResult,
    footprint?: string
  ): Promise<ReportExportResult> {
    const html = this.generateReportHtml(formatted, raw, footprint);
    const { uri: tempUri } = await Print.printToFileAsync({ html });
    const filename = this.getCleanReportFilename();

    // Guarantee a permanent copy in the application's document directory
    if (FileSystem.documentDirectory) {
      try {
        const permanentDocUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.copyAsync({
          from: tempUri,
          to: permanentDocUri,
        });
      } catch {}
    }

    // 1. Android Direct Storage via StorageAccessFramework
    if (Platform.OS === 'android') {
      try {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const base64Data = await FileSystem.readAsStringAsync(tempUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const cleanBaseName = filename.replace(/\.pdf$/i, '');
          const createdSafUri = await StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            cleanBaseName,
            'application/pdf'
          );
          await StorageAccessFramework.writeAsStringAsync(createdSafUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          return {
            uri: createdSafUri,
            filename,
            savedDirectly: true,
            storagePath: 'Selected Device Storage Directory',
          };
        }
      } catch (safErr) {
        console.warn('StorageAccessFramework save failed:', safErr);
      }
    }

    // 2. iOS or Fallback: Native Save Sheet
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(tempUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Save ${filename}`,
        UTI: 'com.adobe.pdf',
      });
    }

    return {
      uri: tempUri,
      filename,
      savedDirectly: false,
    };
  }

  /**
   * Share PDF Report:
   * Explicitly opens the Android / iOS share dialog (WhatsApp, Email, Drive).
   */
  public async shareReportAsPdf(
    formatted: FormattedTranscript,
    raw: TranscriptResult,
    footprint?: string
  ): Promise<string> {
    const html = this.generateReportHtml(formatted, raw, footprint);
    const { uri: tempUri } = await Print.printToFileAsync({ html });
    const filename = this.getCleanReportFilename();

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(tempUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${filename}`,
        UTI: 'com.adobe.pdf',
      });
    }
    return tempUri;
  }
}

// ── Backwards Compatibility Export ──────────────────────────────────────────
export const pdfReportEngine = PdfReportEngine.getInstance();
export const exportReportAsPdf = (
  formatted: FormattedTranscript,
  raw: TranscriptResult,
  footprint?: string
) => pdfReportEngine.exportReportAsPdf(formatted, raw, footprint);
export const shareReportAsPdf = (
  formatted: FormattedTranscript,
  raw: TranscriptResult,
  footprint?: string
) => pdfReportEngine.shareReportAsPdf(formatted, raw, footprint);
export const generateReportHtml = (
  formatted: FormattedTranscript,
  raw: TranscriptResult,
  footprint?: string
) => pdfReportEngine.generateReportHtml(formatted, raw, footprint);
export const getCleanReportFilename = () =>
  pdfReportEngine.getCleanReportFilename();
