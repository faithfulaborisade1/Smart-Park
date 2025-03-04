const { getDefaultConfig } = require("expo/metro-config");

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  const { resolver } = config;

  resolver.assetExts.push("cjs"); // Fix for react-native-maps on web
  return config;
})();
