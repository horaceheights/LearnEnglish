module.exports = ({ config }) => {
  const arm64Only = process.env.SPANGLISH_ARM64_ONLY === '1';
  const isDevelopment = process.env.APP_VARIANT === 'development';

  return {
    ...config,
    ...(isDevelopment ? { name: `${config.name} Dev`, scheme: 'spanglish-dev' } : {}),
    android: {
      ...config.android,
      ...(isDevelopment ? { package: `${config.android.package}.dev` } : {}),
    },
    ios: {
      ...config.ios,
      ...(isDevelopment ? { bundleIdentifier: `${config.ios.bundleIdentifier}.dev` } : {}),
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
