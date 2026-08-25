import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';

import { lessonOptionImageSource } from '../lessonImageSources';

const THREE_BY_TWO_ASPECT_RATIO = 3 / 2;
const ASPECT_RATIO_TOLERANCE = 0.005;

export function OptionMediaImage({
  accessibilityLabel,
  imageUrl,
  poster = false,
  sourceOverride,
}: {
  accessibilityLabel?: string;
  imageUrl: string;
  poster?: boolean;
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
  // Published A1 option art is normalized to a reviewed 3:2 variant and fills
  // every option frame. Contain remains only as a safe fallback for an
  // unexpected legacy ratio, never as the normal catalog policy.
  const shouldContain = !sourceIsThreeByTwo;

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
