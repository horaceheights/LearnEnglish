import { Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const LISTENING_SQUIRREL = require('../../assets/mascots/serious/listening-frames-normalized/listening-06.png');

type Props = {
  anchorBottom?: number;
  onClose: () => void;
  visible: boolean;
};

export function SentenceHelpOverlay({ anchorBottom, onClose, visible }: Props) {
  const { height, width } = useWindowDimensions();
  const isLandscape = width > height;
  const estimatedHeight = isLandscape ? 150 : 216;
  const fallbackTop = height * (isLandscape ? 0.26 : 0.29);
  const desiredTop = anchorBottom === undefined
    ? fallbackTop
    : anchorBottom + 26;
  const calloutTop = Math.max(12, Math.min(desiredTop, height - estimatedHeight - 14));

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
        <View pointerEvents="box-none" style={[styles.calloutPositioner, { paddingTop: calloutTop }]}>
          <View style={[
            styles.callout,
            isLandscape ? styles.calloutLandscape : null,
          ]}>
            <View pointerEvents="none" style={styles.pointerWrap}>
              <Text style={styles.pointerLabel}>LA FRASE</Text>
              <Text style={styles.pointerArrow}>↑</Text>
            </View>
            <View style={styles.calloutBody}>
              <Image
                accessibilityIgnoresInvertColors
                accessible={false}
                resizeMode="contain"
                source={LISTENING_SQUIRREL}
                style={styles.squirrel}
              />
              <View style={styles.copy}>
                <Text accessibilityRole="header" style={styles.title}>
                  ¿Necesitas ayuda?
                </Text>
                <Text style={styles.message}>
                  Toca <Text style={styles.emphasis}>una vez</Text> la frase para repetirla.
                </Text>
                <Text style={styles.message}>
                  Toca <Text style={styles.emphasis}>dos veces</Text> para ver su traducción.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={onClose}
                  style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
                >
                  <Text style={styles.buttonText}>Entendido</Text>
                </Pressable>
              </View>
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
    paddingHorizontal: 14,
  },
  calloutPositioner: { alignItems: 'center', flex: 1, width: '100%' },
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
  calloutLandscape: { maxWidth: 700, paddingVertical: 10 },
  pointerWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    left: 0,
    position: 'absolute',
    right: 0,
    top: -23,
  },
  pointerArrow: {
    color: '#f06d3f',
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 27,
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
    paddingVertical: 2,
  },
  calloutBody: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  squirrel: { flexShrink: 0, height: 112, width: 112 },
  copy: { flex: 1 },
  title: { color: '#24333a', fontSize: 22, fontWeight: '900', marginBottom: 5 },
  message: { color: '#46545a', fontSize: 15, lineHeight: 21, marginTop: 2 },
  emphasis: { color: '#d45732', fontWeight: '900' },
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
