/**
 * Meeting Timeline — Home Screen
 *
 * Input screen where users paste meeting, discussion, or video URLs to generate:
 *  - Chronological Q&A breakdown
 *  - Executive Dossier & Discussion Summary
 *  - Professional 1-Click PDF Report
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
import { COLORS, FONTS } from '../theme';

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
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header with notch protection */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoDot} />
              <Text style={styles.logoText}>Meeting Timeline</Text>
            </View>
            <Text style={styles.tagline}>Intelligent Discussion & Q&A Synthesis</Text>
          </View>

          {/* Announcement banner */}
          {!!config.announcement && (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>📢 {config.announcement}</Text>
            </View>
          )}

          {/* Presentation Input Card */}
          <View style={styles.card}>
            <Text style={styles.label}>Discussion / Video Link</Text>
            <TextInput
              style={styles.input}
              placeholder="Paste YouTube or meeting recording link..."
              placeholderTextColor={COLORS.muted}
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
                style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
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
                  style={styles.btnSecondary}
                  onPress={handleClear}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnSecondaryText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Processing status */}
            {isLoading && (
              <View style={styles.statusRow}>
                <ActivityIndicator color={COLORS.accent} size="small" style={{ marginRight: 8 }} />
                <Text style={styles.statusText}>{STEP_LABELS[step]}</Text>
              </View>
            )}

            {/* Error message */}
            {step === 'error' && !!errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}
          </View>

          {/* Presentation Feature Highlights */}
          <View style={styles.howCard}>
            <Text style={styles.howTitle}>Report Capabilities</Text>
            {[
              ['⚡', 'Direct dialogue extraction & speech filtering'],
              ['💬', 'Smart Q&A grouping with sequential timestamps'],
              ['📑', 'Executive narrative summary for high-level review'],
              ['📄', 'One-click professional PDF report export to device'],
            ].map(([icon, text], i) => (
              <View key={i} style={styles.howRow}>
                <Text style={styles.howIcon}>{icon}</Text>
                <Text style={styles.howText}>{text}</Text>
              </View>
            ))}
          </View>

          {/* Developer Footprint */}
          <View style={styles.developerFootprint}>
            <View style={styles.footprintRow}>
              <View style={styles.footprintDot} />
              <Text style={styles.footprintTitle}>Engineered by AeroTech</Text>
              <Text style={styles.footprintDivider}>•</Text>
              <Text style={styles.footprintSub}>Meeting Timeline v1.0</Text>
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
    backgroundColor: '#0A0C12',
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: STATUSBAR_INSET + 18,
    paddingBottom: 40,
  },

  header: {
    alignItems: 'center',
    marginBottom: 26,
    marginTop: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  logoText: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#94A3B8',
  },

  banner: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    padding: 12,
    marginBottom: 16,
  },
  bannerText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#60A5FA',
  },

  card: {
    backgroundColor: '#111520',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.22)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 11.5,
    color: '#94A3B8',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#0A0D15',
    borderRadius: 12,
    padding: 14,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#F1F5F9',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#2563EB',
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
    backgroundColor: '#1A2030',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  btnSecondaryText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#94A3B8',
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
    color: '#60A5FA',
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    gap: 8,
  },
  errorIcon: { fontSize: 16 },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#F87171',
    flex: 1,
    lineHeight: 18,
  },

  howCard: {
    backgroundColor: '#111520',
    borderRadius: 18,
    padding: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  howTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#60A5FA',
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
    color: '#94A3B8',
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
    backgroundColor: '#3B82F6',
  },
  footprintTitle: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footprintDivider: {
    color: '#475569',
    fontSize: 10,
  },
  footprintSub: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
});
