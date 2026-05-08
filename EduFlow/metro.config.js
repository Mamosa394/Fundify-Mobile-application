// mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force Firebase to use browser/compat builds instead of the React Native
// specific build (dist/rn/index.js) which breaks on New Architecture (Fabric)
config.resolver.unstable_enablePackageExports = false;

module.exports = config;