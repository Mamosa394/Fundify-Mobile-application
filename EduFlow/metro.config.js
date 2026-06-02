const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force Firebase to use browser/compat builds instead of the React Native
// specific build (dist/rn/index.js) which breaks on New Architecture (Fabric)
config.resolver.unstable_enablePackageExports = false;

// Whitelist 3D file formats so Metro treats them as static assets instead of JS files
config.resolver.assetExts.push('glb', 'gltf');

module.exports = config;