import { StyleSheet, Text, View } from 'react-native';

import { useConnectivity } from '../hooks/useConnectivity';

export function ConnectivityBanner() {
  const isOffline = useConnectivity();
  if (!isOffline) return null;

  return (
    <View accessible accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.banner}>
      <Text style={styles.text}>Sin conexión. Revisa tu internet para cargar lecciones y revisar pronunciación.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#7d2f2a', paddingHorizontal: 14, paddingVertical: 8 },
  text: { color: '#fff', fontSize: 13, fontWeight: '800', textAlign: 'center' },
});
