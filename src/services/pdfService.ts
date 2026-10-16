/**
 * Meeting Timeline — Executive PDF Report Generator
 *
 * Generates an executive-styled PDF report containing:
 *  - Formal Briefing Header & Document Metadata
 *  - Key Performance & Duration Indicators (Word count, read time, questions detected)
 *  - Structured Question & Answer Exchange (Formatted cards with badges)
 *  - Executive Narrative & Summary
 *  - Developer Footprint: "Engineered by AeroTech • Meeting Timeline"
 *
 * Automatically saves with a concise, clean filename (e.g. Meeting_Timeline_20261016.pdf)
 * and opens the native Save/Share dialog.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { FormattedTranscript, QABlock } from './formatter';
import { TranscriptResult } from './apiService';

/**
 * Formats current date for display (e.g. Oct 16, 2026).
 */
function getFormattedDate(): string {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Returns a short, clean filename (e.g. Meeting_Timeline_20261016_1430.pdf).
 */
export function getCleanReportFilename(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `Meeting_Timeline_${yyyy}${mm}${dd}_${hh}${min}.pdf`;
}

/**
 * Builds high-resolution, print-ready HTML for the executive briefing PDF.
 */
export function generateReportHtml(
  formatted: FormattedTranscript,
  raw: TranscriptResult
): string {
  const dateStr = getFormattedDate();

  // Build Q&A HTML blocks
  const qaCardsHtml = formatted.qaBlocks
    .map((block: QABlock, index: number) => {
      if (block.type === 'question_answer') {
        return `
          <div class="qa-card">
            <div class="question-row">
              <span class="badge badge-q">Q${index + 1}</span>
              <div class="question-text">${escapeHtml(block.question || '')}</div>
            </div>
            ${
              block.answer
                ? `
              <div class="answer-row">
                <span class="badge badge-a">A${index + 1}</span>
                <div class="answer-text">${escapeHtml(block.answer)}</div>
              </div>
            `
                : ''
            }
          </div>
        `;
      }
      return `
        <div class="statement-card">
          <p>${escapeHtml(block.text)}</p>
        </div>
      `;
    })
    .join('');

  // Build Executive Paragraphs HTML
  const paragraphsHtml = formatted.paragraphs
    .map((p) => `<p class="executive-paragraph">${escapeHtml(p)}</p>`)
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
          border-bottom: 2px solid #3B82F6;
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
        .stat-value.accent { color: #3B82F6; }
        .stat-value.success { color: #10B981; }
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
          border-left: 4px solid #3B82F6;
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
          color: #3B82F6;
          letter-spacing: 0.5px;
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div>
          <h1 class="header-title">Meeting Timeline</h1>
          <p class="header-subtitle">Executive Q&A Synthesis & Discussion Dossier</p>
        </div>
        <div class="header-meta">
          <div class="header-date">${dateStr}</div>
          <div>Ref ID: #${escapeHtml(raw.video_id || 'LOCAL')}</div>
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
        <div>Meeting Timeline • Official Executive Briefing Document</div>
        <div>
          <span class="footprint-tag">Engineered by AeroTech</span> • v1.0.0
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Escapes HTML characters to prevent rendering bugs.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates the PDF file, gives it a clean filename, and triggers the native Save/Share dialog.
 */
export async function exportReportAsPdf(
  formatted: FormattedTranscript,
  raw: TranscriptResult
): Promise<string> {
  const html = generateReportHtml(formatted, raw);

  // 1. Render HTML to temporary PDF
  const { uri: tempUri } = await Print.printToFileAsync({ html });

  // 2. Prepare clean, short filename in cache directory
  const filename = getCleanReportFilename();
  const sourceFile = new File(tempUri);
  const targetFile = new File(Paths.cache, filename);

  // 3. Copy to clean filename destination
  try {
    await sourceFile.copy(targetFile);
  } catch {
    // Fallback directly to tempUri if copy fails
    const isAvail = await Sharing.isAvailableAsync();
    if (isAvail) {
      await Sharing.shareAsync(tempUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save Meeting Timeline Report',
        UTI: 'com.adobe.pdf',
      });
    }
    return tempUri;
  }

  // 4. Open native save/share sheet with short clean filename
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(targetFile.uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Save Meeting Timeline Report',
      UTI: 'com.adobe.pdf',
    });
  }

  return targetFile.uri;
}
