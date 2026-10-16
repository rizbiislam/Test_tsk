/**
 * Meeting Timeline — Key-Value Storage Engine (OOP Architecture)
 *
 * Lightweight, zero-dependency persistent in-memory storage manager.
 * Avoids native AsyncStorage compilation friction across React Native versions.
 *
 * Developer: Rizbi Islam • AeroTech
 */

export interface IKeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class KeyValueStorageManager implements IKeyValueStorage {
  private static instance: KeyValueStorageManager | null = null;
  private readonly store: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): KeyValueStorageManager {
    if (!KeyValueStorageManager.instance) {
      KeyValueStorageManager.instance = new KeyValueStorageManager();
    }
    return KeyValueStorageManager.instance;
  }

  public async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  public async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  public async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  public async clear(): Promise<void> {
    this.store.clear();
  }
}

// ── Backwards Compatibility Export ──────────────────────────────────────────
export const SimpleStorage = KeyValueStorageManager.getInstance();
