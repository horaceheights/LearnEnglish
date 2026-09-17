import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LessonMediaFrame } from './LessonMediaFrame';
import { OptionMediaImage } from './OptionMediaImage';

type Props = PropsWithChildren<{
  location: string; stage: string; color: string; progress: string;
  imageUrl?: string | null;
  onBack: () => void; onHome: () => void; onMenu: () => void;
}>;

export function LessonLandscapeRail({ location, stage, color, progress, imageUrl,
  onBack, onHome, onMenu, children }: Props) {
  const { fontScale } = useWindowDimensions();
  const [mediaHeight, setMediaHeight] = useState(0);
  return <View style={styles.rail}>
    <View style={styles.navigation}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver a lecciones" onPress={onBack} style={styles.button}>
        <Ionicons name="arrow-back" size={24} color="#245f53" />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="SpanGlish: inicio" onPress={onHome} style={styles.button}>
        <Ionicons name="home-outline" size={24} color="#dd6844" />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Secciones, ayuda y opciones" onPress={onMenu} style={styles.button}>
        <Ionicons name="ellipsis-horizontal" size={24} color="#245f53" />
      </Pressable>
    </View>
    <Text adjustsFontSizeToFit minimumFontScale={1 / Math.min(1.3, fontScale)} numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.location}>{location}</Text>
    <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[styles.stage, { color }]}>{stage}</Text>
    <Text maxFontSizeMultiplier={1.3} style={styles.progress}>{progress}</Text>
    {children}
    {imageUrl ? <View style={styles.media} onLayout={event => setMediaHeight(event.nativeEvent.layout.height)}>
      {mediaHeight > 0 ? <LessonMediaFrame maxHeight={mediaHeight}>
        <OptionMediaImage imageUrl={imageUrl} accessibilityLabel="Imagen de la frase" />
      </LessonMediaFrame> : null}
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  rail: { width: '28%', minWidth: 180, maxWidth: 260, flexShrink: 0, gap: 4,
    borderRadius: 18, backgroundColor: '#fff0d6', padding: 6 },
  navigation: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  button: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffdf7', borderRadius: 14 },
  location: { fontSize: 16, lineHeight: 20, fontWeight: '900', color: '#8b765d', textAlign: 'center' },
  stage: { fontSize: 20, lineHeight: 24, fontWeight: '900', textAlign: 'center' },
  progress: { fontSize: 12, color: '#67583f', textAlign: 'center' },
  media: { flex: 1, minHeight: 0, justifyContent: 'center' },
});
