/**
 * AeroTech — Root App
 *
 * Boot sequence:
 *  1. Fetch remote config (GitHub Gist, encrypted URL)
 *  2. Ping backend silently to pre-warm it
 *  3. Check gate conditions (disabled / maintenance / force_update)
 *  4. Show Home or Gate screen accordingly
 *
 * Screen navigation is handled via simple state (no heavy nav library needed
 * for a 2-screen app — keeps bundle lean and APK small).
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
import { COLORS, FONTS } from './src/theme';

type Screen = 'loading' | 'gate' | 'home' | 'transcript';

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [result, setResult] = useState<FormattedTranscript | null>(null);
  const [rawResult, setRawResult] = useState<TranscriptResult | null>(null);

  const boot = useCallback(async (forceRefresh = false) => {
    setScreen('loading');
    try {
      const cfg = forceRefresh ? await refreshConfig() : await fetchConfig();
      setConfig(cfg);

      // Silently warm up the backend
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
      <View style={styles.splash}>
        <StatusBar style="light" />
        <View style={styles.splashInner}>
          <View style={styles.splashLogo}>
            <View style={styles.splashDot} />
            <Text style={styles.splashText}>AeroTech</Text>
          </View>
          <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 40 }} />
        </View>
      </View>
    );
  }

  if (screen === 'gate' && config) {
    return (
      <>
        <StatusBar style="light" />
        <GateScreen config={config} onRetry={() => boot(true)} />
      </>
    );
  }

  if (screen === 'transcript' && result && rawResult && config) {
    return (
      <>
        <StatusBar style="light" />
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
      <StatusBar style="light" />
      {config && <HomeScreen config={config} onResult={handleResult} />}
    </>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashInner: { alignItems: 'center' },
  splashLogo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  splashDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.accent,
  },
  splashText: {
    fontFamily: FONTS.bold,
    fontSize: 32,
    color: COLORS.text,
    letterSpacing: 1,
  },
});
