const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    assetExts: getDefaultConfig(__dirname).resolver.assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...getDefaultConfig(__dirname).resolver.sourceExts, 'svg'],
    // React Query platform resolution fix
    platforms: ['ios', 'android', 'native', 'web'],
  },
  transformer: {
    // Enable inline requires for better performance
    inlineRequires: true,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
