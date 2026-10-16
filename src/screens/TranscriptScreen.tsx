/**
 * AeroTech — Transcript Screen
 *
 * Displays the formatted transcript in:
 *  1. Smart Q&A Flow (Question on new line, Answer below with distinct styling)
 *  2. Executive Paragraph Mode
 *
 * Features:
 *  - Mode selector toggle: [ Q&A Flow ] vs [ Paragraphs ]
 *  - Stats bar (word count, read time, questions detected, ads filtered)
 *  - Universal copy mechanism
 *  - Native OS Share sheet
 *  - Zero internal API / technical data exposed
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
} from 'react-native';
import { FormattedTranscript, QABlock } from '../services/formatter';
import { TranscriptResult } from '../services/apiService';
import { AppConfig } from '../services/configService';
import { COLORS, FONTS } from '../theme';

/**
 * Clipboard helper — uses the Share API or navigator.clipboard.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
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
        title: 'Transcript — AeroTech',
      });
    } catch (e: any) {
      Alert.alert('Share failed', e.message);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>New</Text>
        </TouchableOpacity>
        <View style={styles.logoRow}>
          <View style={styles.logoDot} />
          <Text style={styles.logoText}>AeroTech</Text>
        </View>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Stats bar */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{formatted.wordCount.toLocaleString()}</Text>
            <Text style={styles.statLabel}>words</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{formatted.readTimeMinutes} min</Text>
            <Text style={styles.statLabel}>read time</Text>
          </View>
          {formatted.questionCount > 0 && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statChip}>
                <Text style={[styles.statValue, { color: COLORS.accent }]}>{formatted.questionCount}</Text>
                <Text style={styles.statLabel}>questions</Text>
              </View>
            </>
          )}
          {raw.segments_removed > 0 && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statChip}>
                <Text style={[styles.statValue, { color: COLORS.success }]}>{raw.segments_removed}</Text>
                <Text style={styles.statLabel}>ads removed</Text>
              </View>
            </>
          )}
        </View>

        {/* View Mode Toggle */}
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[styles.modeTab, viewMode === 'qa' && styles.modeTabActive]}
            onPress={() => setViewMode('qa')}
            activeOpacity={0.85}
          >
            <Text style={[styles.modeTabText, viewMode === 'qa' && styles.modeTabTextActive]}>
              💬 Question & Answer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, viewMode === 'paragraphs' && styles.modeTabActive]}
            onPress={() => setViewMode('paragraphs')}
            activeOpacity={0.85}
          >
            <Text style={[styles.modeTabText, viewMode === 'paragraphs' && styles.modeTabTextActive]}>
              📄 Paragraphs
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transcript Content Container */}
        <View style={styles.transcriptCard}>
          <View style={styles.transcriptHeader}>
            <Text style={styles.transcriptLabel}>
              {viewMode === 'qa' ? 'Structured Q&A Output' : 'Executive Paragraphs'}
            </Text>
            <Text style={styles.modeSubtitle}>
              {viewMode === 'qa'
                ? 'Questions separated onto individual lines with paired answers'
                : 'Formatted narrative grouped for quick review'}
            </Text>
          </View>

          {viewMode === 'qa' ? (
            <View style={styles.qaContainer}>
              {formatted.qaBlocks.map((block: QABlock) => {
                if (block.type === 'question_answer') {
                  return (
                    <View key={block.id} style={styles.qaCard}>
                      {/* Question Line */}
                      <View style={styles.questionRow}>
                        <View style={styles.questionBadge}>
                          <Text style={styles.questionBadgeText}>Q</Text>
                        </View>
                        <Text style={styles.questionText}>{block.question}</Text>
                      </View>

                      {/* Answer Line */}
                      {block.answer && (
                        <View style={styles.answerRow}>
                          <View style={styles.answerBadge}>
                            <Text style={styles.answerBadgeText}>A</Text>
                          </View>
                          <Text style={styles.answerText}>{block.answer}</Text>
                        </View>
                      )}
                    </View>
                  );
                }

                // Standard paragraph block in Q&A view
                return (
                  <View key={block.id} style={styles.statementBox}>
                    <Text style={styles.statementText}>{block.text}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View>
              {formatted.paragraphs.map((para, i) => (
                <Text key={i} style={styles.paragraph}>
                  {para}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, copied && styles.actionBtnSuccess]}
            onPress={handleCopy}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>
              {copied ? '✓ Copied to Clipboard!' : '📋 Copy Clean Transcript'}
            </Text>
          </TouchableOpacity>

          {config.features.share_button && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnAccent]}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>↑ Share Transcript</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 64 },
  backIcon: { fontSize: 18, color: COLORS.accent, fontFamily: FONTS.bold },
  backText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.accent },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  logoText: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },

  scroll: { padding: 20, paddingBottom: 48 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  statChip: { alignItems: 'center', flex: 1 },
  statValue: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.text },
  statLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.border },

  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  modeTabActive: {
    backgroundColor: COLORS.accent,
  },
  modeTabText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.muted,
  },
  modeTabTextActive: {
    color: '#ffffff',
  },

  transcriptCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 5,
  },
  transcriptHeader: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
    marginBottom: 18,
  },
  transcriptLabel: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modeSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
  },

  qaContainer: {
    gap: 16,
  },
  qaCard: {
    backgroundColor: '#161922',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    gap: 12,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  questionBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  questionBadgeText: {
    color: COLORS.accent,
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  questionText: {
    flex: 1,
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  answerBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  answerBadgeText: {
    color: COLORS.success,
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  answerText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
  },

  statementBox: {
    marginBottom: 6,
  },
  statementText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 24,
  },

  paragraph: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 26,
    marginBottom: 18,
    textAlign: 'left',
  },

  actions: { gap: 12 },
  actionBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnSuccess: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successBg,
  },
  actionBtnAccent: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  actionBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.text,
  },
});
