import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';

import { lessonOptionImageSource } from '../lessonImageSources';

const THREE_BY_TWO_ASPECT_RATIO = 3 / 2;
const ASPECT_RATIO_TOLERANCE = 0.005;

export function OptionMediaImage({
  accessibilityLabel,
  imageUrl,
  poster = false,
  preserveSubject = false,
  sourceOverride,
}: {
  accessibilityLabel?: string;
  imageUrl: string;
  poster?: boolean;
  preserveSubject?: boolean;
  sourceOverride?: ImageSourcePropType;
}) {
  const source = sourceOverride ?? lessonOptionImageSource(imageUrl);
  const resolvedSource = Image.resolveAssetSource(source);
  const sourceIsThreeByTwo = Boolean(
    resolvedSource?.width
      && resolvedSource?.height
      && Math.abs((resolvedSource.width / resolvedSource.height) - THREE_BY_TWO_ASPECT_RATIO)
        <= ASPECT_RATIO_TOLERANCE,
  );
  // Exact 3:2 artwork already matches the viewport and may fill it edge-to-edge.
  // Any legacy ratio is zoomed out over the warm frame so no head, face, body,
  // or teaching action can be lost to a generic crop.
  const shouldContain = preserveSubject || !sourceIsThreeByTwo;

  return (
    <Image
      accessible={Boolean(accessibilityLabel)}
      accessibilityIgnoresInvertColors
      accessibilityLabel={accessibilityLabel}
      resizeMode={shouldContain ? 'contain' : 'cover'}
      source={source}
      style={[styles.fill, poster ? styles.poster : null]}
    />
  );
}

const styles = StyleSheet.create({
  fill: { height: '100%', width: '100%' },
  poster: { zIndex: 1 },
});
