/**
 * Meeting Timeline — Executive Presentation & Timeline Screen
 *
 * Displays meeting analysis and dialogue synthesis in:
 *  1. Presentation Q&A Breakdown (Questions clearly isolated with paired responses)
 *  2. Executive Dossier & Summary Narrative
 *
 * Presentation Features:
 *  - Dynamic safe insets (fixes Android status-bar/notch overflow)
 *  - Presentation Barrier (bounded card viewport that keeps text contained for presentations)
 *  - 1-Click Executive PDF Report generation with clean short filenames
 *  - Universal Share & Copy controls
 *  - Discreet, professional AeroTech developer footprint
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  Alert,
  StatusBar as NativeStatusBar,
  ActivityIndicator,
} from 'react-native';
import { FormattedTranscript, QABlock } from '../services/formatter';
import { TranscriptResult } from '../services/apiService';
import { AppConfig } from '../services/configService';
import { exportReportAsPdf } from '../services/pdfService';
import { COLORS, FONTS } from '../theme';

const STATUSBAR_INSET = Platform.OS === 'android' ? (NativeStatusBar.currentHeight || 28) : 0;

/**
 * Universal clipboard / text sharing helper.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).clipboard) {
      await (navigator as any).clipboard.writeText(text);
      return true;
    }
    await Share.share({ message: text });
    return true;
  } catch {
    return false;
  }
}

interface TranscriptScreenProps {
  formatted: FormattedTranscript;
  raw: TranscriptResult;
  config: AppConfig;
  onBack: () => void;
}

export default function TranscriptScreen({
  formatted,
  raw,
  config,
  onBack,
}: TranscriptScreenProps) {
  const [viewMode, setViewMode] = useState<'qa' | 'paragraphs'>('qa');
  const [copied, setCopied] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const activeText =
    viewMode === 'qa' && formatted.qaFormattedText
      ? formatted.qaFormattedText
      : formatted.paragraphs.join('\n\n');

  async function handleCopy() {
    const ok = await copyToClipboard(activeText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  async function handleShare() {
    try {
      await Share.share({
        message: activeText,
        title: 'Meeting Timeline — Executive Brief',
      });
    } catch (e: any) {
      Alert.alert('Share failed', e.message);
    }
  }

  async function handleExportPdf() {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      await exportReportAsPdf(formatted, raw);
    } catch (e: any) {
      Alert.alert('PDF Export Error', e?.message || 'Unable to generate PDF report.');
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* Top sticky navigation bar with notch-safe insets */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.75}>
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backText}>New</Text>
        </TouchableOpacity>

        <View style={styles.logoRow}>
          <View style={styles.logoPulse} />
          <Text style={styles.logoTitle}>Meeting Timeline</Text>
        </View>

        <TouchableOpacity
          onPress={handleExportPdf}
          style={styles.pdfQuickBtn}
          activeOpacity={0.8}
          disabled={exportingPdf}
        >
          {exportingPdf ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.pdfQuickBtnText}>PDF</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Presentation Header & Key Indicators */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatted.wordCount.toLocaleString()}</Text>
            <Text style={styles.statSubtitle}>Words</Text>
          </View>
          <View style={styles.statSeparator} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: COLORS.accent }]}>
              {formatted.readTimeMinutes} min
            </Text>
            <Text style={styles.statSubtitle}>Est. Time</Text>
          </View>
          <View style={styles.statSeparator} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#38BDF8' }]}>
              {formatted.questionCount}
            </Text>
            <Text style={styles.statSubtitle}>Questions</Text>
          </View>
          {raw.segments_removed > 0 && (
            <>
              <View style={styles.statSeparator} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: COLORS.success }]}>
                  {raw.segments_removed}
                </Text>
                <Text style={styles.statSubtitle}>Filtered</Text>
              </View>
            </>
          )}
        </View>

        {/* Presentation Mode Selector */}
        <View style={styles.modeContainer}>
          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'qa' && styles.modeButtonActive]}
            onPress={() => setViewMode('qa')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.modeButtonText,
                viewMode === 'qa' && styles.modeButtonTextActive,
              ]}
            >
              💬 Q&A Breakdown
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              viewMode === 'paragraphs' && styles.modeButtonActive,
            ]}
            onPress={() => setViewMode('paragraphs')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.modeButtonText,
                viewMode === 'paragraphs' && styles.modeButtonTextActive,
              ]}
            >
              📑 Executive Summary
            </Text>
          </TouchableOpacity>
        </View>

        {/* Presentation Viewport / Structured Container */}
        <View style={styles.presentationCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderBadge}>
              <Text style={styles.cardHeaderBadgeText}>
                {viewMode === 'qa' ? 'DIALOGUE FLOW' : 'EXECUTIVE SUMMARY'}
              </Text>
            </View>
            <Text style={styles.cardSubtitle}>
              {viewMode === 'qa'
                ? 'Structured question and answer sequence'
                : 'Condensed briefing notes and core discussion points'}
            </Text>
          </View>

          {viewMode === 'qa' ? (
            <View style={styles.qaList}>
              {formatted.qaBlocks.map((block: QABlock, index: number) => {
                if (block.type === 'question_answer') {
                  return (
                    <View key={block.id} style={styles.qaWrapper}>
                      {/* Question Line */}
                      <View style={styles.questionCard}>
                        <View style={styles.qBadge}>
                          <Text style={styles.qBadgeText}>Q{index + 1}</Text>
                        </View>
                        <Text style={styles.questionText}>{block.question}</Text>
                      </View>

                      {/* Answer Line */}
                      {block.answer ? (
                        <View style={styles.answerCard}>
                          <View style={styles.aBadge}>
                            <Text style={styles.aBadgeText}>A{index + 1}</Text>
                          </View>
                          <Text style={styles.answerText}>{block.answer}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                }

                return (
                  <View key={block.id} style={styles.contextStatement}>
                    <Text style={styles.contextStatementText}>{block.text}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.paragraphList}>
              {formatted.paragraphs.map((para, i) => (
                <View key={i} style={styles.paragraphBox}>
                  <View style={styles.paragraphBullet} />
                  <Text style={styles.paragraphText}>{para}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Primary Action Controls */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.primaryPdfBtn}
            onPress={handleExportPdf}
            activeOpacity={0.85}
            disabled={exportingPdf}
          >
            {exportingPdf ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryPdfBtnText}>📄 Download PDF Report</Text>
            )}
          </TouchableOpacity>

          <View style={styles.secondaryActionRow}>
            <TouchableOpacity
              style={[styles.secondaryBtn, copied && styles.secondaryBtnSuccess]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.secondaryBtnText,
                  copied && styles.secondaryBtnTextSuccess,
                ]}
              >
                {copied ? '✓ Copied!' : '📋 Copy Summary'}
              </Text>
            </TouchableOpacity>

            {config.features.share_button && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryBtnText}>↗️ Share</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Developer Footprint */}
        <View style={styles.developerFootprint}>
          <View style={styles.footprintDivider} />
          <View style={styles.footprintRow}>
            <View style={styles.footprintDot} />
            <Text style={styles.footprintTitle}>Engineered by AeroTech</Text>
            <Text style={styles.footprintBullet}>•</Text>
            <Text style={styles.footprintVersion}>Meeting Timeline v1.0</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0C12',
  },

  /* Sticky Top Bar with Dynamic Insets */
  topBar: {
    paddingTop: STATUSBAR_INSET + 8,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#0F131D',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  backIcon: {
    fontSize: 22,
    color: '#60A5FA',
    fontWeight: 'bold',
    marginTop: -2,
  },
  backText: {
    fontSize: 14,
    color: '#60A5FA',
    fontWeight: '600',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoPulse: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  logoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  pdfQuickBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    minWidth: 46,
    alignItems: 'center',
  },
  pdfQuickBtnText: {
    color: '#818CF8',
    fontWeight: '700',
    fontSize: 12,
  },

  /* Scrollable Content Container */
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  },

  /* Stats Summary Bar */
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#121622',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  statSubtitle: {
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.4,
  },
  statSeparator: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  /* Mode Selector */
  modeContainer: {
    flexDirection: 'row',
    backgroundColor: '#121622',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    padding: 4,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  modeButtonActive: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Presentation Viewport (Bounded Barrier Card) */
  presentationCard: {
    backgroundColor: '#111520',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.22)',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 12,
    marginBottom: 16,
  },
  cardHeaderBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    marginBottom: 6,
  },
  cardHeaderBadgeText: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cardSubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
  },

  /* Q&A Presentation Rows */
  qaList: {
    gap: 14,
  },
  qaWrapper: {
    backgroundColor: '#161B28',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  questionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    backgroundColor: '#181E2E',
    borderLeftWidth: 3.5,
    borderLeftColor: '#3B82F6',
  },
  qBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  qBadgeText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '800',
  },
  questionText: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14.5,
    fontWeight: '700',
    lineHeight: 21,
  },
  answerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    backgroundColor: '#121622',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    borderLeftWidth: 3.5,
    borderLeftColor: '#10B981',
  },
  aBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  aBadgeText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '800',
  },
  answerText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 13.5,
    fontWeight: '400',
    lineHeight: 21,
  },
  contextStatement: {
    backgroundColor: '#0E1119',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  contextStatementText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
  },

  /* Paragraph Presentation */
  paragraphList: {
    gap: 12,
  },
  paragraphBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  paragraphBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginTop: 8,
  },
  paragraphText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'left',
  },

  /* Action Buttons */
  actionGroup: {
    gap: 10,
  },
  primaryPdfBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryPdfBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#161B26',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryBtnSuccess: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  secondaryBtnText: {
    color: '#CBD5E1',
    fontSize: 13.5,
    fontWeight: '600',
  },
  secondaryBtnTextSuccess: {
    color: '#34D399',
  },

  /* Developer Footprint */
  developerFootprint: {
    marginTop: 28,
    alignItems: 'center',
  },
  footprintDivider: {
    width: 60,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  footprintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footprintDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  footprintTitle: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footprintBullet: {
    color: '#475569',
    fontSize: 10,
  },
  footprintVersion: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
});
