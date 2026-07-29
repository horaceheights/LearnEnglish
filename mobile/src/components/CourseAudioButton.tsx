import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { courseAudioUrl } from '../config';

type Props = { text: string; label?: string };

export function CourseAudioButton({ text, label = 'Listen' }: Props) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [loadedText, setLoadedText] = useState('');

  const play = () => {
    if (!text) return;
    if (loadedText !== text) {
      player.replace(courseAudioUrl(text));
      setLoadedText(text);
    } else {
      player.seekTo(0);
    }
    player.play();
  };

  return (
    <Pressable
      accessibilityLabel={`Play audio: ${text}`}
      accessibilityRole="button"
      disabled={!text}
      onPress={play}
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
    >
      <Text style={styles.icon}>{status.playing ? '■' : '▶'}</Text>
      <Text style={styles.label}>{status.isBuffering ? 'Loading audio…' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#eef6f1',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 9,
    minHeight: 46,
    paddingHorizontal: 18,
  },
  icon: { color: '#287a57', fontSize: 15 },
  label: { color: '#287a57', fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
