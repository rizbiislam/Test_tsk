/**
 * Meeting Timeline — Root App
 *
 * Boot sequence:
 *  1. Fetch remote config (GitHub Gist, encrypted URL)
 *  2. Ping backend silently to pre-warm it
 *  3. Check gate conditions (disabled / maintenance / force_update)
 *  4. Show Home or Gate screen accordingly
 *
 * Supports dynamic Light/Dark mode with ThemeProvider.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fetchConfig, refreshConfig, AppConfig } from './src/services/configService';
import { pingBackend } from './src/services/apiService';
import { FormattedTranscript } from './src/services/formatter';
import { TranscriptResult } from './src/services/apiService';
import GateScreen, { getGateReason } from './src/screens/GateScreen';
import HomeScreen from './src/screens/HomeScreen';
import TranscriptScreen from './src/screens/TranscriptScreen';
import { ThemeProvider, useTheme, FONTS } from './src/theme';

type Screen = 'loading' | 'gate' | 'home' | 'transcript';

function MainApp() {
  const { isDark, colors } = useTheme();
  const [screen, setScreen] = useState<Screen>('loading');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [result, setResult] = useState<FormattedTranscript | null>(null);
  const [rawResult, setRawResult] = useState<TranscriptResult | null>(null);

  const boot = useCallback(async (forceRefresh = false) => {
    setScreen('loading');
    try {
      const cfg = forceRefresh ? await refreshConfig() : await fetchConfig();
      setConfig(cfg);

      // Silently warm up the backend if configured
      pingBackend(cfg.api_base_url).catch(() => {});

      const gateReason = getGateReason(cfg);
      setScreen(gateReason ? 'gate' : 'home');
    } catch {
      // If config fails entirely, go to home with defaults
      setScreen('home');
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  function handleResult(formatted: FormattedTranscript, raw: TranscriptResult) {
    setResult(formatted);
    setRawResult(raw);
    setScreen('transcript');
  }

  function handleBack() {
    setResult(null);
    setRawResult(null);
    setScreen('home');
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (screen === 'loading') {
    return (
      <View style={[styles.splash, { backgroundColor: colors.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.splashInner}>
          <View style={styles.splashLogo}>
            <View style={[styles.splashDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.splashText, { color: colors.text }]}>Meeting Timeline</Text>
          </View>
          <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 40 }} />
        </View>
      </View>
    );
  }

  if (screen === 'gate' && config) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <GateScreen config={config} onRetry={() => boot(true)} />
      </>
    );
  }

  if (screen === 'transcript' && result && rawResult && config) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <TranscriptScreen
          formatted={result}
          raw={rawResult}
          config={config}
          onBack={handleBack}
        />
      </>
    );
  }

  // Default: home screen
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {config && <HomeScreen config={config} onResult={handleResult} />}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashInner: { alignItems: 'center' },
  splashLogo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  splashDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  splashText: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    letterSpacing: 0.5,
  },
});
