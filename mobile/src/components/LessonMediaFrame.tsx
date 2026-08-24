import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export const LESSON_MEDIA_FRAME_STYLE = {
  backgroundColor: '#fffef9',
  borderColor: '#172d35',
  borderRadius: 24,
  borderWidth: 4,
  elevation: 3,
  padding: 8,
  shadowColor: '#172d35',
  shadowOffset: { height: 3, width: 0 },
  shadowOpacity: 0.12,
  shadowRadius: 5,
} as const;

export const LESSON_MEDIA_VIEWPORT_STYLE = {
  backgroundColor: '#f2ebde',
  borderRadius: 17,
  overflow: 'hidden',
} as const;

function frameMaxWidth(maxHeight: number): number {
  // The shared border and inset add 24dp around the 3:2 media viewport.
  // Keep the complete frame inside the height reserved by the lesson layout.
  return Math.max(96, ((Math.max(48, maxHeight) - 24) * 3 / 2) + 24);
}

export function LessonMediaFrame({
  children,
  frameStyle,
  maxHeight,
}: PropsWithChildren<{
  frameStyle?: StyleProp<ViewStyle>;
  maxHeight: number;
}>) {
  return (
    <View style={[styles.frame, { maxWidth: frameMaxWidth(maxHeight) }, frameStyle]}>
      <View style={styles.media}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    ...LESSON_MEDIA_FRAME_STYLE,
    alignSelf: 'center',
    width: '100%',
  },
  media: {
    ...LESSON_MEDIA_VIEWPORT_STYLE,
    aspectRatio: 3 / 2,
    position: 'relative',
    width: '100%',
  },
});
