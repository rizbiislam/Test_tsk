/**
 * Meeting Timeline — Home Screen
 *
 * Input screen where users paste meeting, discussion, or video URLs to generate:
 *  - Chronological Q&A breakdown
 *  - Executive Dossier & Discussion Summary
 *  - Professional 1-Click PDF Report
 *  - Dynamic Dark / Light theme toggle
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  StatusBar as NativeStatusBar,
} from 'react-native';
import { AppConfig } from '../services/configService';
import { extractTranscript, TranscriptResult } from '../services/apiService';
import { formatTranscript, FormattedTranscript } from '../services/formatter';
import { useTheme, FONTS } from '../theme';

const STATUSBAR_INSET = Platform.OS === 'android' ? (NativeStatusBar.currentHeight || 28) : 0;

interface HomeScreenProps {
  config: AppConfig;
  onResult: (result: FormattedTranscript, raw: TranscriptResult) => void;
}

type Step = 'idle' | 'extracting' | 'formatting' | 'done' | 'error';

const STEP_LABELS: Record<Step, string> = {
  idle: '',
  extracting: 'Extracting meeting dialogue...',
  formatting: 'Synthesizing Q&A & timeline...',
  done: 'Ready!',
  error: '',
};

export default function HomeScreen({ config, onResult }: HomeScreenProps) {
  const { colors, isDark, toggleTheme } = useTheme();
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const isLoading = step === 'extracting' || step === 'formatting';

  async function handleAnalyze() {
    if (!url.trim()) return;
    setStep('extracting');
    setErrorMsg('');
    try {
      const raw = await extractTranscript(config, url);
      setStep('formatting');
      const formatted = formatTranscript(raw.clean_text, raw.qa_formatted_text);
      setStep('done');
      onResult(formatted, raw);
    } catch (e: any) {
      setStep('error');
      setErrorMsg(e?.message ?? 'Unable to process link. Please check the URL and try again.');
    }
  }

  function handleClear() {
    setUrl('');
    setStep('idle');
    setErrorMsg('');
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top navigation row with theme switch */}
          <View style={styles.topNavRow}>
            <View style={styles.logoRow}>
              <View style={[styles.logoDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.logoText, { color: colors.text }]}>Meeting Timeline</Text>
            </View>

            {/* Theme Toggle Button */}
            <TouchableOpacity
              onPress={toggleTheme}
              style={[
                styles.themeToggleBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.75}
              accessibilityLabel="Switch color theme"
            >
              <Text style={styles.themeToggleIcon}>{isDark ? '☀️' : '🌙'}</Text>
              <Text style={[styles.themeToggleLabel, { color: colors.muted }]}>
                {isDark ? 'Light' : 'Dark'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.tagline, { color: colors.muted }]}>
            Intelligent Discussion & Q&A Synthesis
          </Text>

          {/* Announcement banner */}
          {!!config.announcement && (
            <View
              style={[
                styles.banner,
                {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <Text style={[styles.bannerText, { color: colors.accent }]}>
                📢 {config.announcement}
              </Text>
            </View>
          )}

          {/* Presentation Input Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surfaceCard,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Text style={[styles.label, { color: colors.muted }]}>
              Discussion / Video Link
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Paste YouTube or meeting recording link..."
              placeholderTextColor={colors.muted}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={handleAnalyze}
              editable={!isLoading}
            />

            {/* Action buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  { backgroundColor: colors.accent },
                  isLoading && styles.btnDisabled,
                ]}
                onPress={handleAnalyze}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>✨ Generate Timeline</Text>
                )}
              </TouchableOpacity>

              {(url.length > 0 || step !== 'idle') && (
                <TouchableOpacity
                  style={[
                    styles.btnSecondary,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleClear}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.btnSecondaryText, { color: colors.muted }]}>
                    Clear
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Processing status */}
            {isLoading && (
              <View style={styles.statusRow}>
                <ActivityIndicator
                  color={colors.accent}
                  size="small"
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.statusText, { color: colors.accent }]}>
                  {STEP_LABELS[step]}
                </Text>
              </View>
            )}

            {/* Error message */}
            {step === 'error' && !!errorMsg && (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: colors.errorBg,
                    borderColor: colors.error,
                  },
                ]}
              >
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errorMsg}
                </Text>
              </View>
            )}
          </View>

          {/* Presentation Feature Highlights */}
          <View
            style={[
              styles.howCard,
              {
                backgroundColor: colors.surfaceCard,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.howTitle, { color: colors.accent }]}>
              Report Capabilities
            </Text>
            {[
              ['⚡', 'Direct dialogue extraction & speech filtering'],
              ['💬', 'Smart Q&A grouping with sequential timestamps'],
              ['📑', 'Executive narrative summary for high-level review'],
              ['📄', 'One-click professional PDF report export to device'],
            ].map(([icon, text], i) => (
              <View key={i} style={styles.howRow}>
                <Text style={styles.howIcon}>{icon}</Text>
                <Text style={[styles.howText, { color: colors.textSecondary }]}>
                  {text}
                </Text>
              </View>
            ))}
          </View>

          {/* Developer Footprint */}
          <View style={styles.developerFootprint}>
            <View style={styles.footprintRow}>
              <View style={[styles.footprintDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.footprintTitle, { color: colors.accent }]}>
                {config.footprint}
              </Text>
              <Text style={[styles.footprintDivider, { color: colors.muted }]}>•</Text>
              <Text style={[styles.footprintSub, { color: colors.muted }]}>
                Meeting Timeline v{config.min_version || '1.0'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: STATUSBAR_INSET + 14,
    paddingBottom: 40,
  },

  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  logoText: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    marginBottom: 20,
    marginLeft: 18,
  },

  /* Theme Toggle Switch */
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  themeToggleIcon: {
    fontSize: 14,
  },
  themeToggleLabel: {
    fontSize: 12,
    fontFamily: FONTS.bold,
  },

  banner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  bannerText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
  },

  card: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 11.5,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontFamily: FONTS.regular,
    fontSize: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnPrimary: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#2563EB',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimaryText: {
    fontFamily: FONTS.bold,
    fontSize: 14.5,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  btnSecondary: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnSecondaryText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    justifyContent: 'center',
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: 13.5,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    gap: 8,
  },
  errorIcon: { fontSize: 16 },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  howCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  howTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  howRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  howIcon: {
    fontSize: 16,
    width: 24,
  },
  howText: {
    fontFamily: FONTS.regular,
    fontSize: 13.5,
    flex: 1,
  },

  /* Developer Footprint */
  developerFootprint: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
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
  footprintDivider: {
    fontSize: 10,
  },
  footprintSub: {
    fontSize: 11,
    fontWeight: '500',
  },
});
