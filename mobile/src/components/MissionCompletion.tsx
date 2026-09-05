import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { lessonImageSource } from '../lessonImageSources';
import type { MissionPresentation } from '../types';

type Props = {
  onContinue: () => void;
  presentation: MissionPresentation;
};

const FINAL_PORTRAIT = '/lesson-assets/a1_u1_album_22_final_portrait.webp';

export function MissionCompletion({ onContinue, presentation }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.page} style={styles.scroll}>
      <View style={styles.badge}>
        <Ionicons color="#fff" name="sparkles" size={24} />
      </View>
      <Text style={styles.label}>{presentation.label}</Text>
      <Text accessibilityRole="header" style={styles.title}>{presentation.completion_title}</Text>
      <View style={styles.portraitFrame}>
        <Image
          accessibilityLabel="La familia reunida en el álbum restaurado"
          resizeMode="cover"
          source={lessonImageSource(FINAL_PORTRAIT)}
          style={styles.portrait}
        />
        <View style={styles.stamp}>
          <Ionicons color="#fff" name="checkmark" size={19} />
        </View>
      </View>
      <Text style={styles.finalLine}>They are a family.</Text>
      <Text style={styles.message}>{presentation.completion_message}</Text>
      <View accessibilityLabel="Cuatro capítulos restaurados" style={styles.restoredRow}>
        {['Personas', 'Familia', 'Acciones', 'Voces'].map((label) => (
          <View key={label} style={styles.restoredChip}>
            <Ionicons color="#24765f" name="checkmark-circle" size={16} />
            <Text style={styles.restoredText}>{label}</Text>
          </View>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={onContinue} style={styles.button}>
        <Text style={styles.buttonText}>Continuar</Text>
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
    backgroundColor: '#d88a2e',
    borderRadius: 24,
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
    maxHeight: 390,
    maxWidth: 700,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  portrait: { height: '100%', width: '100%' },
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
  message: { color: '#56656a', fontSize: 15, lineHeight: 21, marginTop: 6, maxWidth: 650, textAlign: 'center' },
  restoredRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginTop: 13 },
  restoredChip: {
    alignItems: 'center',
    backgroundColor: '#e6f4ed',
    borderColor: '#9dcbbd',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  restoredText: { color: '#24634f', fontSize: 11, fontWeight: '800' },
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
