const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { prepareLessonImagePacks } = require('./scripts/prepare-lesson-image-packs.cjs');

prepareLessonImagePacks(__dirname);
const config = getSentryExpoConfig(__dirname);
config.resolver.assetExts = [...new Set([...config.resolver.assetExts, 'bin'])];
module.exports = config;
