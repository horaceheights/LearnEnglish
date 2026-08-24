import { Image, StyleSheet } from 'react-native';

import { lessonOptionImageSource } from '../lessonImageSources';

const TOP_ALIGNED_OPTION_MEDIA = new Set([
  'boy.webp',
  'family_brothers.webp',
  'family_children.webp',
  'family_grandfather.webp',
  'family_grandmother.webp',
  'family_grandparents.webp',
  'family_mother.webp',
  'family_sisters.webp',
  'girl.webp',
  'man.webp',
  'woman.webp',
]);

function optionMediaFilename(imageUrl: string): string {
  const cleanPath = imageUrl.split(/[?#]/, 1)[0];
  return cleanPath.slice(cleanPath.lastIndexOf('/') + 1);
}

export function OptionMediaImage({
  accessibilityLabel,
  imageUrl,
  poster = false,
}: {
  accessibilityLabel?: string;
  imageUrl: string;
  poster?: boolean;
}) {
  const source = lessonOptionImageSource(imageUrl);
  const topAligned = TOP_ALIGNED_OPTION_MEDIA.has(optionMediaFilename(imageUrl));
  const resolvedSource = topAligned ? Image.resolveAssetSource(source) : null;
  const sourceAspectRatio = resolvedSource?.width && resolvedSource?.height
    ? resolvedSource.width / resolvedSource.height
    : 3 / 2;

  return (
    <Image
      accessible={Boolean(accessibilityLabel)}
      accessibilityIgnoresInvertColors
      accessibilityLabel={accessibilityLabel}
      resizeMode="cover"
      source={source}
      style={[
        topAligned
          ? [styles.topAligned, { aspectRatio: sourceAspectRatio }]
          : styles.fill,
        poster ? styles.poster : null,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  fill: { height: '100%', width: '100%' },
  poster: { zIndex: 1 },
  topAligned: { left: 0, position: 'absolute', right: 0, top: 0, width: '100%' },
});
