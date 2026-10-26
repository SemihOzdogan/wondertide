module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((@)?react-native|@react-native-async-storage|@react-navigation|lucide-react-native|react-native-safe-area-context|react-native-screens|react-native-url-polyfill)/)',
  ],
};
