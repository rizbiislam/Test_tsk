/**
 * AeroTech — Gate Screen
 *
 * Shown on app launch when the remote config signals:
 *   - App is disabled (is_app_enabled: false)
 *   - Maintenance mode (maintenance_mode: true)
 *   - Force update required (force_update: true)
 *
 * The API URL, GitHub link, and all backend details are
 * NEVER shown to the user in any of these screens.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { AppConfig } from '../services/configService';
import { COLORS, FONTS } from '../theme';

interface GateScreenProps {
  config: AppConfig;
  onRetry: () => void;
}

export type GateReason = 'disabled' | 'maintenance' | 'force_update' | null;

export function getGateReason(config: AppConfig): GateReason {
  if (!config.is_app_enabled) return 'disabled';
  if (config.maintenance_mode) return 'maintenance';
  if (config.force_update) return 'force_update';
  return null;
}

const GATE_CONTENT: Record<
  NonNullable<GateReason>,
  { emoji: string; title: string; defaultMessage: string; action?: string }
> = {
  disabled: {
    emoji: '🔒',
    title: 'App Unavailable',
    defaultMessage: 'This app is currently unavailable. Please try again later.',
  },
  maintenance: {
    emoji: '🛠️',
    title: 'Under Maintenance',
    defaultMessage: 'We are performing maintenance. We will be back shortly.',
    action: 'Check Again',
  },
  force_update: {
    emoji: '⬆️',
    title: 'Update Required',
    defaultMessage: 'A new version is required to continue. Please update the app.',
    action: 'Update Now',
  },
};

export default function GateScreen({ config, onRetry }: GateScreenProps) {
  const reason = getGateReason(config) ?? 'disabled';
  const content = GATE_CONTENT[reason];

  const message =
    reason === 'maintenance' && config.maintenance_message
      ? config.maintenance_message
      : reason === 'force_update' && config.force_update_message
      ? config.force_update_message
      : content.defaultMessage;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.emoji}>{content.emoji}</Text>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.message}>{message}</Text>

        {content.action && (
          <TouchableOpacity style={styles.btn} onPress={onRetry} activeOpacity={0.85}>
            <Text style={styles.btnText}>{content.action}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>AeroTech © {new Date().getFullYear()}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  emoji: { fontSize: 52, marginBottom: 16 },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 36,
    marginBottom: 12,
  },
  btnText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#fff',
  },
  footer: { marginTop: 24 },
  footerText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.muted,
    opacity: 0.5,
  },
});
