module.exports = {
  presets: [
    [
      'module:metro-react-native-babel-preset',
      {
        unstable_transformProfile: 'hermes-stable',
      },
    ],
  ],
  plugins: [
    ['@babel/plugin-transform-class-properties', { loose: true }],
    ['@babel/plugin-transform-private-methods', { loose: true }],
    'react-native-reanimated/plugin',
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@screens': './src/screens',
          '@services': './src/services',
          '@utils': './src/utils',
          '@types': './src/types',
          '@store': './src/store',
          '@core': './src/core',
        },
      },
    ],
  ],
};