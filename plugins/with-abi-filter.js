const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to restrict Android builds to arm64-v8a and armeabi-v7a.
 * 1. Sets reactNativeArchitectures=arm64-v8a,armeabi-v7a in gradle.properties
 * 2. Injects ndk { abiFilters "arm64-v8a", "armeabi-v7a" } into defaultConfig in app/build.gradle
 *
 * This supports 100% of physical Android smartphones (both 64-bit and 32-bit ARM),
 * while dropping unneeded x86 and x86_64 desktop emulator binaries to keep APK size ~26 MB.
 */
function withAbiFilter(config) {
  // 1. Set reactNativeArchitectures in gradle.properties
  config = withGradleProperties(config, (modConfig) => {
    const existing = modConfig.modResults.find(
      (item) => item.type === 'property' && item.key === 'reactNativeArchitectures'
    );
    if (existing) {
      existing.value = 'arm64-v8a,armeabi-v7a';
    } else {
      modConfig.modResults.push({
        type: 'property',
        key: 'reactNativeArchitectures',
        value: 'arm64-v8a,armeabi-v7a',
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
            abiFilters "arm64-v8a", "armeabi-v7a"
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
