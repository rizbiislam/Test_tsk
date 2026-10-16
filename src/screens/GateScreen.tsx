/**
 * Meeting Timeline — Gate Screen
 *
 * Shown on app launch when remote config signals:
 *   - App is disabled (is_app_enabled: false)
 *   - Maintenance mode (maintenance_mode: true)
 *   - Force update required (force_update: true)
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
import { useTheme, FONTS } from '../theme';

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
    defaultMessage: 'This service is currently unavailable. Please check back later.',
  },
  maintenance: {
    emoji: '🛠️',
    title: 'System Optimization',
    defaultMessage: 'We are performing routine service optimizations. Normal operations will resume shortly.',
    action: 'Refresh Status',
  },
  force_update: {
    emoji: '⬆️',
    title: 'Update Required',
    defaultMessage: 'A newer release of Meeting Timeline is required to continue.',
    action: 'Update App',
  },
};

export default function GateScreen({ config, onRetry }: GateScreenProps) {
  const { colors } = useTheme();
  const reason = getGateReason(config) ?? 'disabled';
  const content = GATE_CONTENT[reason];

  const message =
    reason === 'maintenance' && config.maintenance_message
      ? config.maintenance_message
      : reason === 'force_update' && config.force_update_message
      ? config.force_update_message
      : content.defaultMessage;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceCard,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={styles.emoji}>{content.emoji}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{content.title}</Text>
        <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>

        {content.action && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.accent }]}
            onPress={onRetry}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>{content.action}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }]}>
            Meeting Timeline • {config.footprint}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  emoji: { fontSize: 52, marginBottom: 16 },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontFamily: FONTS.regular,
    fontSize: 14.5,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 36,
    marginBottom: 12,
  },
  btnText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#fff',
  },
  footer: { marginTop: 24 },
  footerText: {
    fontFamily: FONTS.regular,
    fontSize: 11.5,
    opacity: 0.7,
  },
});
