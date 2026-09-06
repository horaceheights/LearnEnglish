import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { lessonImageSource } from '../lessonImageSources';
import type { MissionPresentation } from '../types';

type Props = {
  finalImageAccessibilityLabel?: string | null;
  finalImageUrl?: string | null;
  finalLine?: string | null;
  onContinue: () => void;
  presentation: MissionPresentation;
};

export function MissionCompletion({
  finalImageAccessibilityLabel,
  finalImageUrl,
  finalLine,
  onContinue,
  presentation,
}: Props) {
  const completionHeadingRef = useRef<View | null>(null);
  const completionAnnouncement = `${presentation.completion_title}. ${presentation.completion_message}`;

  useEffect(() => {
    const timer = setTimeout(() => {
      const headingHandle = findNodeHandle(completionHeadingRef.current);
      if (headingHandle) AccessibilityInfo.setAccessibilityFocus(headingHandle);
      else AccessibilityInfo.announceForAccessibility(completionAnnouncement);
    }, 160);
    return () => clearTimeout(timer);
  }, [completionAnnouncement]);

  return (
    <ScrollView contentContainerStyle={styles.page} style={styles.scroll}>
      <View style={styles.badge}>
        <Ionicons color="#f7cf63" name="videocam" size={25} />
      </View>
      <Text style={styles.label}>{presentation.label}</Text>
      <View
        accessible
        accessibilityLabel={completionAnnouncement}
        accessibilityRole="header"
        ref={completionHeadingRef}
      >
        <Text accessible={false} style={styles.title}>{presentation.completion_title}</Text>
      </View>
      <View style={styles.portraitFrame}>
        {finalImageUrl ? (
          <Image
            accessible
            accessibilityLabel={finalImageAccessibilityLabel?.trim() || 'Escena final del reto Personas en acción'}
            accessibilityRole="image"
            resizeMode="cover"
            source={lessonImageSource(finalImageUrl)}
            style={styles.portrait}
          />
        ) : (
          <View accessible accessibilityLabel="Toma final aprobada" accessibilityRole="image" style={styles.visualFallback}>
            <Ionicons color="#f7cf63" name="film" size={56} />
            <Text style={styles.visualFallbackTitle}>TOMA APROBADA</Text>
            <Text style={styles.visualFallbackText}>Personas en acción</Text>
          </View>
        )}
        <View style={styles.stamp}>
          <Ionicons color="#fff" name="checkmark" size={19} />
        </View>
      </View>
      {finalLine?.trim() ? <Text style={styles.finalLine}>{finalLine.trim()}</Text> : null}
      <Text style={styles.message}>{presentation.completion_message}</Text>
      <View accessibilityLabel="Habilidades demostradas" style={styles.restoredRow}>
        {presentation.chapters.map((chapter) => (
          <View key={chapter.id} style={styles.restoredChip}>
            <Ionicons color="#24765f" name="checkmark-circle" size={20} />
            <View style={styles.restoredCopy}>
              <Text style={styles.restoredTitle}>{chapter.title}</Text>
              <Text style={styles.restoredText}>{chapter.objective}</Text>
            </View>
          </View>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={onContinue} style={styles.button}>
        <Text style={styles.buttonText}>Finalizar reto</Text>
        <Ionicons color="#fff" name="arrow-forward" size={20} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#fbf7ef', flex: 1 },
  page: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 28,
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#202b30',
    borderColor: '#d6ad4b',
    borderRadius: 12,
    borderWidth: 2,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  label: { color: '#a2601c', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginTop: 8 },
  title: { color: '#26363b', fontSize: 29, fontWeight: '900', marginTop: 2, textAlign: 'center' },
  portraitFrame: {
    aspectRatio: 3 / 2,
    backgroundColor: '#ead9bd',
    borderColor: '#70462a',
    borderRadius: 22,
    borderWidth: 5,
    marginTop: 14,
    maxWidth: 700,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  portrait: { height: '100%', width: '100%' },
  visualFallback: {
    alignItems: 'center',
    backgroundColor: '#202b30',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  visualFallbackTitle: { color: '#fff', fontSize: 27, fontWeight: '900', letterSpacing: 1.4, marginTop: 8, textAlign: 'center' },
  visualFallbackText: { color: '#f7cf63', fontSize: 17, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  stamp: {
    alignItems: 'center',
    backgroundColor: '#2f8f72',
    borderColor: '#fff',
    borderRadius: 22,
    borderWidth: 3,
    bottom: 10,
    height: 42,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    width: 42,
  },
  finalLine: { color: '#1c6858', fontSize: 25, fontWeight: '900', marginTop: 13, textAlign: 'center' },
  message: { color: '#56656a', fontSize: 16, lineHeight: 22, marginTop: 6, maxWidth: 650, textAlign: 'center' },
  restoredRow: { alignItems: 'center', gap: 7, marginTop: 13, maxWidth: 650, width: '100%' },
  restoredChip: {
    alignItems: 'center',
    backgroundColor: '#e6f4ed',
    borderColor: '#9dcbbd',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 7,
    width: '100%',
  },
  restoredCopy: { flex: 1, minWidth: 0 },
  restoredTitle: { color: '#205a49', fontSize: 16, fontWeight: '900', lineHeight: 21 },
  restoredText: { color: '#42675d', fontSize: 14, fontWeight: '700', lineHeight: 19 },
  button: {
    alignItems: 'center',
    backgroundColor: '#e76f43',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 54,
    paddingHorizontal: 28,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '900' },
});
