const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to restrict Android builds to arm64-v8a (modern physical Android phones).
 * 1. Sets reactNativeArchitectures=arm64-v8a in gradle.properties
 * 2. Injects ndk { abiFilters "arm64-v8a" } into defaultConfig in app/build.gradle
 *
 * This drops unneeded x86, x86_64, and armeabi-v7a native binaries,
 * shrinking the APK from ~64 MB down to ~18-20 MB.
 */
function withAbiFilter(config) {
  // 1. Set reactNativeArchitectures in gradle.properties
  config = withGradleProperties(config, (modConfig) => {
    const existing = modConfig.modResults.find(
      (item) => item.type === 'property' && item.key === 'reactNativeArchitectures'
    );
    if (existing) {
      existing.value = 'arm64-v8a';
    } else {
      modConfig.modResults.push({
        type: 'property',
        key: 'reactNativeArchitectures',
        value: 'arm64-v8a',
      });
    }
    return modConfig;
  });

  // 2. Add ndk.abiFilters to defaultConfig in app/build.gradle
  config = withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.contents.includes('abiFilters')) {
      return modConfig;
    }

    const ndkSnippet = `
        ndk {
            abiFilters "arm64-v8a"
        }
`;

    modConfig.modResults.contents = modConfig.modResults.contents.replace(
      /defaultConfig\s*\{/,
      `defaultConfig {${ndkSnippet}`
    );

    return modConfig;
  });

  return config;
}

module.exports = withAbiFilter;
