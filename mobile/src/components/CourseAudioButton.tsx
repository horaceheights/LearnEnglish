import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { courseAudioSource } from '../courseAudioSources';

type Props = {
  text: string;
  label?: string;
  mode?: string;
  variant?: string;
};

export function CourseAudioButton({ text, label = 'Escuchar', mode = 'prompt', variant = 'default' }: Props) {
  const player = useAudioPlayer(null, { keepAudioSessionActive: true });
  const status = useAudioPlayerStatus(player);
  const [loadedText, setLoadedText] = useState('');

  const play = () => {
    if (!text) return;
    if (loadedText !== text) {
      player.replace(courseAudioSource(text, mode, variant));
      setLoadedText(text);
    } else {
      player.seekTo(0);
    }
    player.play();
  };

  return (
    <Pressable
      accessibilityLabel={`Reproducir audio: ${text}`}
      accessibilityRole="button"
      disabled={!text}
      onPress={play}
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
    >
      <Text style={styles.icon}>{status.playing ? '■' : '▶'}</Text>
      <Text style={styles.label}>{status.isBuffering ? 'Cargando audio…' : label}</Text>
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
