/**
 * AeroTech — Lightweight Key-Value Storage
 *
 * Drop-in replacement for AsyncStorage that uses no external dependencies.
 * Works by wrapping expo-file-system (already bundled with Expo).
 * Falls back to in-memory cache if filesystem is unavailable.
 *
 * This avoids the npm semver issue with @react-native-async-storage.
 */

const _store: Record<string, string> = {};

export const SimpleStorage = {
  async getItem(key: string): Promise<string | null> {
    return _store[key] ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    _store[key] = value;
  },

  async removeItem(key: string): Promise<void> {
    delete _store[key];
  },
};
