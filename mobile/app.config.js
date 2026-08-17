module.exports = ({ config }) => {
  const arm64Only = process.env.SPANGLISH_ARM64_ONLY === '1';
  const appVariant = process.env.APP_VARIANT || 'production';
  const isDevelopment = appVariant === 'development';
  const isPreview = appVariant === 'preview';
  const variantName = isDevelopment ? 'Dev' : isPreview ? 'Preview' : '';
  const variantScheme = isDevelopment ? 'spanglish-dev' : isPreview ? 'spanglish-preview' : config.scheme;
  const identifierSuffix = isDevelopment ? '.dev' : isPreview ? '.preview' : '';

  return {
    ...config,
    ...(variantName ? { name: `${config.name} ${variantName}` } : {}),
    ...(variantScheme ? { scheme: variantScheme } : {}),
    android: {
      ...config.android,
      ...(identifierSuffix ? { package: `${config.android.package}${identifierSuffix}` } : {}),
    },
    ios: {
      ...config.ios,
      ...(identifierSuffix ? { bundleIdentifier: `${config.ios.bundleIdentifier}${identifierSuffix}` } : {}),
    },
    plugins: [
      ...(config.plugins || []),
      'expo-video',
      '@sentry/react-native',
      [
        'expo-build-properties',
        {
          android: {
            ...(arm64Only ? { buildArchs: ['arm64-v8a'] } : {}),
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
          },
        },
      ],
    ],
  };
};
