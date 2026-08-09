import { Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const LISTENING_SQUIRREL = require('../../assets/mascots/serious/listening-frames-normalized/listening-06.png');

type Props = {
  mode: 'coachmark' | 'translation';
  onClose: () => void;
  translation?: string;
  visible: boolean;
};

export function SentenceHelpOverlay({ mode, onClose, translation, visible }: Props) {
  const { height, width } = useWindowDimensions();
  const isLandscape = width > height;
  const isCoachmark = mode === 'coachmark';

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View accessibilityViewIsModal style={styles.overlay}>
        <Pressable
          accessibilityLabel="Cerrar ayuda"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={[
          styles.callout,
          isLandscape ? styles.calloutLandscape : styles.calloutPortrait,
          !isCoachmark ? styles.translationCallout : null,
        ]}>
          {isCoachmark ? (
            <View pointerEvents="none" style={styles.pointerWrap}>
              <Text style={styles.pointerArrow}>↑</Text>
              <Text style={styles.pointerLabel}>LA FRASE</Text>
            </View>
          ) : null}
          <View style={styles.calloutBody}>
            <Image
              accessibilityIgnoresInvertColors
              accessible={false}
              resizeMode="contain"
              source={LISTENING_SQUIRREL}
              style={[
                styles.squirrel,
                isCoachmark ? styles.squirrelCoachmark : styles.squirrelTranslation,
              ]}
            />
            <View style={styles.copy}>
              <Text accessibilityRole="header" style={styles.title}>
                {isCoachmark ? '¿Necesitas ayuda?' : 'En español'}
              </Text>
              {isCoachmark ? (
                <>
                  <Text style={styles.message}>
                    Toca <Text style={styles.emphasis}>una vez</Text> la frase para repetirla.
                  </Text>
                  <Text style={styles.message}>
                    Toca <Text style={styles.emphasis}>dos veces</Text> para ver su traducción.
                  </Text>
                </>
              ) : (
                <Text accessibilityLiveRegion="polite" style={styles.translation}>
                  {translation}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
              >
                <Text style={styles.buttonText}>{isCoachmark ? 'Entendido' : 'Cerrar'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(26, 31, 34, 0.46)',
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  callout: {
    alignSelf: 'center',
    backgroundColor: '#fffaf1',
    borderColor: '#d9b873',
    borderRadius: 24,
    borderWidth: 2,
    elevation: 12,
    maxWidth: 620,
    padding: 14,
    shadowColor: '#1c2f37',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    width: '100%',
  },
  calloutPortrait: { marginBottom: 18 },
  calloutLandscape: { marginBottom: 2, maxWidth: 700, paddingVertical: 10 },
  translationCallout: { maxWidth: 520 },
  pointerWrap: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: -55,
  },
  pointerArrow: {
    color: '#f06d3f',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 40,
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 2,
  },
  pointerLabel: {
    backgroundColor: '#fffaf1',
    borderRadius: 8,
    color: '#7c5427',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  calloutBody: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  squirrel: { flexShrink: 0 },
  squirrelCoachmark: { height: 112, width: 112 },
  squirrelTranslation: { height: 82, width: 82 },
  copy: { flex: 1 },
  title: { color: '#24333a', fontSize: 22, fontWeight: '900', marginBottom: 5 },
  message: { color: '#46545a', fontSize: 15, lineHeight: 21, marginTop: 2 },
  emphasis: { color: '#d45732', fontWeight: '900' },
  translation: { color: '#24333a', fontSize: 20, fontWeight: '800', lineHeight: 27 },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#287f68',
    borderRadius: 13,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 42,
    minWidth: 112,
    paddingHorizontal: 18,
  },
  buttonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});
