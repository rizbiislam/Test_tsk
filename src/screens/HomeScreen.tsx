/**
 * AeroTech — Home Screen
 *
 * Main input screen. Users paste a YouTube URL and tap Transcribe.
 * Shows announcement banner if config has one set.
 * API base URL is loaded from remote config — never shown to user.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { AppConfig } from '../services/configService';
import { extractTranscript, TranscriptResult } from '../services/apiService';
import { formatTranscript, FormattedTranscript } from '../services/formatter';
import { COLORS, FONTS } from '../theme';

interface HomeScreenProps {
  config: AppConfig;
  onResult: (result: FormattedTranscript, raw: TranscriptResult) => void;
}

type Step = 'idle' | 'extracting' | 'formatting' | 'done' | 'error';

const STEP_LABELS: Record<Step, string> = {
  idle: '',
  extracting: 'Fetching transcript...',
  formatting: 'Formatting output...',
  done: 'Done!',
  error: '',
};

export default function HomeScreen({ config, onResult }: HomeScreenProps) {
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const isLoading = step === 'extracting' || step === 'formatting';

  async function handleTranscribe() {
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
      setErrorMsg(e?.message ?? 'Something went wrong. Please try again.');
    }
  }

  function handleClear() {
    setUrl('');
    setStep('idle');
    setErrorMsg('');
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoDot} />
              <Text style={styles.logoText}>AeroTech</Text>
            </View>
            <Text style={styles.tagline}>YouTube Transcript Extractor</Text>
          </View>

          {/* Announcement banner */}
          {!!config.announcement && (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>📢 {config.announcement}</Text>
            </View>
          )}

          {/* Input card */}
          <View style={styles.card}>
            <Text style={styles.label}>YouTube URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://www.youtube.com/watch?v=..."
              placeholderTextColor={COLORS.muted}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={handleTranscribe}
              editable={!isLoading}
            />

            {/* Action buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
                onPress={handleTranscribe}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>▶ Transcribe</Text>
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

          {/* How it works */}
          <View style={styles.howCard}>
            <Text style={styles.howTitle}>How it works</Text>
            {[
              ['🔗', 'Paste a YouTube URL above'],
              ['📝', 'Transcript is extracted & cleaned'],
              ['🧹', 'Sponsor segments are removed'],
              ['📄', 'Output formatted into readable paragraphs'],
            ].map(([icon, text], i) => (
              <View key={i} style={styles.howRow}>
                <Text style={styles.howIcon}>{icon}</Text>
                <Text style={styles.howText}>{text}</Text>
              </View>
            ))}
          </View>

          {/* Footer — no API/tech info shown */}
          <Text style={styles.footer}>AeroTech · Internal Tools Division</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: 28, marginTop: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  logoText: { fontFamily: FONTS.bold, fontSize: 26, color: COLORS.text },
  tagline: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted },

  banner: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  bannerText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.accent },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    padding: 14,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  btnPrimary: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { fontFamily: FONTS.bold, fontSize: 15, color: '#fff' },
  btnSecondary: {
    backgroundColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    justifyContent: 'center',
  },
  statusText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.accent },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.errorBg,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    gap: 8,
  },
  errorIcon: { fontSize: 16 },
  errorText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.error, flex: 1 },

  howCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  howTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  howIcon: { fontSize: 18, width: 26 },
  howText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted, flex: 1 },

  footer: {
    textAlign: 'center',
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.muted,
    opacity: 0.4,
  },
});
