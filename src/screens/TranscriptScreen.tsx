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
 *  - Dynamic Light & Dark theme toggle
 *  - 1-Click Executive PDF Report generation with clean short filenames
 *  - Universal Share & Copy controls
 *  - Discreet, professional AeroTech developer footprint
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { exportReportAsPdf, shareReportAsPdf } from '../services/pdfService';
import { useTheme, FONTS } from '../theme';

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
  const { colors, isDark, toggleTheme } = useTheme();
  const [viewMode, setViewMode] = useState<'qa' | 'paragraphs'>('qa');
  const [copied, setCopied] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);

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

  async function handleShareText() {
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
      const res = await exportReportAsPdf(formatted, raw, config.footprint);
      if (res.savedDirectly) {
        Alert.alert(
          'Saved to Storage ✅',
          `Your executive report has been saved directly to device storage as:\n\n${res.filename}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Report Ready 📄',
          `Your executive report has been generated:\n\n${res.filename}`,
          [{ text: 'OK' }]
        );
      }
    } catch (e: any) {
      Alert.alert('Download Error', e?.message || 'Unable to save PDF report.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleSharePdf() {
    if (sharingPdf) return;
    setSharingPdf(true);
    try {
      await shareReportAsPdf(formatted, raw, config.footprint);
    } catch (e: any) {
      Alert.alert('Share Error', e?.message || 'Unable to share PDF.');
    } finally {
      setSharingPdf(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Top sticky navigation bar with notch-safe insets */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.75}>
          <Text style={[styles.backIcon, { color: colors.accent }]}>‹</Text>
          <Text style={[styles.backText, { color: colors.accent }]}>New</Text>
        </TouchableOpacity>

        <View style={styles.logoRow}>
          <View style={[styles.logoPulse, { backgroundColor: colors.accent }]} />
          <Text style={[styles.logoTitle, { color: colors.text }]}>Meeting Timeline</Text>
        </View>

        <View style={styles.topRightActions}>
          {/* Theme Toggle Button */}
          <TouchableOpacity
            onPress={toggleTheme}
            style={[
              styles.topActionBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
              },
            ]}
            activeOpacity={0.8}
            accessibilityLabel="Switch color theme"
          >
            <Text style={styles.topActionIcon}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>

          {/* Quick Share PDF Button */}
          <TouchableOpacity
            onPress={handleSharePdf}
            style={[
              styles.topActionBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
              },
            ]}
            activeOpacity={0.8}
            disabled={sharingPdf}
            accessibilityLabel="Share PDF Report"
          >
            {sharingPdf ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.topActionIcon}>↗️</Text>
            )}
          </TouchableOpacity>

          {/* Prominent Top Download Button */}
          <TouchableOpacity
            onPress={handleExportPdf}
            style={[
              styles.topDownloadBtn,
              {
                backgroundColor: colors.accent,
              },
            ]}
            activeOpacity={0.8}
            disabled={exportingPdf}
            accessibilityLabel="Download PDF directly to storage"
          >
            {exportingPdf ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.topDownloadBtnInner}>
                <Text style={styles.topDownloadBtnIcon}>⬇️</Text>
                <Text style={styles.topDownloadBtnText}>Save</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Presentation Header & Key Indicators */}
        <View
          style={[
            styles.statsBar,
            {
              backgroundColor: colors.surfaceCard,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {formatted.wordCount.toLocaleString()}
            </Text>
            <Text style={[styles.statSubtitle, { color: colors.muted }]}>Words</Text>
          </View>
          <View style={[styles.statSeparator, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.accent }]}>
              {formatted.readTimeMinutes} min
            </Text>
            <Text style={[styles.statSubtitle, { color: colors.muted }]}>Est. Time</Text>
          </View>
          <View style={[styles.statSeparator, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#0EA5E9' }]}>
              {formatted.questionCount}
            </Text>
            <Text style={[styles.statSubtitle, { color: colors.muted }]}>Questions</Text>
          </View>
          {raw.segments_removed > 0 && (
            <>
              <View style={[styles.statSeparator, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.success }]}>
                  {raw.segments_removed}
                </Text>
                <Text style={[styles.statSubtitle, { color: colors.muted }]}>Filtered</Text>
              </View>
            </>
          )}
        </View>

        {/* Presentation Mode Selector */}
        <View
          style={[
            styles.modeContainer,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.modeButton,
              viewMode === 'qa' && [styles.modeButtonActive, { backgroundColor: colors.accent }],
            ]}
            onPress={() => setViewMode('qa')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.modeButtonText,
                { color: viewMode === 'qa' ? '#FFFFFF' : colors.muted },
              ]}
            >
              💬 Q&A Breakdown
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              viewMode === 'paragraphs' && [
                styles.modeButtonActive,
                { backgroundColor: colors.accent },
              ],
            ]}
            onPress={() => setViewMode('paragraphs')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.modeButtonText,
                { color: viewMode === 'paragraphs' ? '#FFFFFF' : colors.muted },
              ]}
            >
              📑 Executive Summary
            </Text>
          </TouchableOpacity>
        </View>

        {/* Presentation Viewport / Structured Container */}
        <View
          style={[
            styles.presentationCard,
            {
              backgroundColor: colors.surfaceCard,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <View style={[styles.cardHeaderBadge, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.cardHeaderBadgeText, { color: colors.accent }]}>
                {viewMode === 'qa' ? 'DIALOGUE FLOW' : 'EXECUTIVE SUMMARY'}
              </Text>
            </View>
            <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
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
                    <View
                      key={block.id}
                      style={[
                        styles.qaWrapper,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {/* Question Line */}
                      <View
                        style={[
                          styles.questionCard,
                          {
                            backgroundColor: colors.qCardBg,
                            borderLeftColor: colors.accent,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.qBadge,
                            { backgroundColor: colors.qBadgeBg },
                          ]}
                        >
                          <Text style={[styles.qBadgeText, { color: colors.qBadgeText }]}>
                            Q{index + 1}
                          </Text>
                        </View>
                        <Text style={[styles.questionText, { color: colors.text }]}>
                          {block.question}
                        </Text>
                      </View>

                      {/* Answer Line */}
                      {block.answer ? (
                        <View
                          style={[
                            styles.answerCard,
                            {
                              backgroundColor: colors.aCardBg,
                              borderTopColor: colors.border,
                              borderLeftColor: colors.success,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.aBadge,
                              { backgroundColor: colors.aBadgeBg },
                            ]}
                          >
                            <Text style={[styles.aBadgeText, { color: colors.aBadgeText }]}>
                              A{index + 1}
                            </Text>
                          </View>
                          <Text style={[styles.answerText, { color: colors.textSecondary }]}>
                            {block.answer}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                }

                return (
                  <View
                    key={block.id}
                    style={[
                      styles.contextStatement,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.contextStatementText, { color: colors.muted }]}>
                      {block.text}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.paragraphList}>
              {formatted.paragraphs.map((para, i) => (
                <View key={i} style={styles.paragraphBox}>
                  <View
                    style={[styles.paragraphBullet, { backgroundColor: colors.accent }]}
                  />
                  <Text style={[styles.paragraphText, { color: colors.textSecondary }]}>
                    {para}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Primary Action Controls */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={[styles.primaryPdfBtn, { backgroundColor: colors.accent }]}
            onPress={handleExportPdf}
            activeOpacity={0.85}
            disabled={exportingPdf}
          >
            {exportingPdf ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryPdfBtnText}>⬇️ Download PDF to Storage</Text>
            )}
          </TouchableOpacity>

          <View style={styles.secondaryActionRow}>
            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                {
                  backgroundColor: colors.surfaceCard,
                  borderColor: colors.border,
                },
                copied && {
                  borderColor: colors.success,
                  backgroundColor: colors.successBg,
                },
              ]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.secondaryBtnText,
                  { color: copied ? colors.success : colors.textSecondary },
                ]}
              >
                {copied ? '✓ Copied!' : '📋 Copy Summary'}
              </Text>
            </TouchableOpacity>

            {config.features.share_button && (
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  {
                    backgroundColor: colors.surfaceCard,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleSharePdf}
                activeOpacity={0.8}
                disabled={sharingPdf}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                  {sharingPdf ? 'Preparing...' : '↗️ Share PDF'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Developer Footprint */}
        <View style={styles.developerFootprint}>
          <View style={[styles.footprintDivider, { backgroundColor: colors.border }]} />
          <View style={styles.footprintRow}>
            <View style={[styles.footprintDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.footprintTitle, { color: colors.accent }]}>
              {config.footprint}
            </Text>
            <Text style={[styles.footprintBullet, { color: colors.muted }]}>•</Text>
            <Text style={[styles.footprintVersion, { color: colors.muted }]}>
              Meeting Timeline v{config.min_version || '1.0'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  /* Sticky Top Bar with Dynamic Insets */
  topBar: {
    paddingTop: STATUSBAR_INSET + 8,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
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
    fontWeight: 'bold',
    marginTop: -2,
  },
  backText: {
    fontSize: 14,
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
  },
  logoTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  topActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 34,
    height: 32,
  },
  topActionIcon: {
    fontSize: 14,
  },
  topDownloadBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    shadowColor: '#2563EB',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  topDownloadBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topDownloadBtnIcon: {
    fontSize: 12,
  },
  topDownloadBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.3,
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
    borderRadius: 14,
    borderWidth: 1,
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
  },
  statSubtitle: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.4,
  },
  statSeparator: {
    width: 1,
    height: 24,
  },

  /* Mode Selector */
  modeContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
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
    shadowColor: '#2563EB',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },

  /* Presentation Viewport (Bounded Barrier Card) */
  presentationCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  cardHeader: {
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 16,
  },
  cardHeaderBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    marginBottom: 6,
  },
  cardHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },

  /* Q&A Presentation Rows */
  qaList: {
    gap: 14,
  },
  qaWrapper: {
    borderRadius: 13,
    borderWidth: 1,
    overflow: 'hidden',
  },
  questionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    borderLeftWidth: 3.5,
  },
  qBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  qBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  questionText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    lineHeight: 21,
  },
  answerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    borderTopWidth: 1,
    borderLeftWidth: 3.5,
  },
  aBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  aBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  answerText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '400',
    lineHeight: 21,
  },
  contextStatement: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  contextStatementText: {
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
    marginTop: 8,
  },
  paragraphText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'left',
  },

  /* Action Buttons */
  actionGroup: {
    gap: 10,
  },
  primaryPdfBtn: {
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
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },

  /* Developer Footprint */
  developerFootprint: {
    marginTop: 28,
    alignItems: 'center',
  },
  footprintDivider: {
    width: 60,
    height: 1,
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
  },
  footprintTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footprintBullet: {
    fontSize: 10,
  },
  footprintVersion: {
    fontSize: 11,
    fontWeight: '500',
  },
});
