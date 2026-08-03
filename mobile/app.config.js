module.exports = ({ config }) => {
  const arm64Only = process.env.SPANGLISH_ARM64_ONLY === '1';

  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
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
