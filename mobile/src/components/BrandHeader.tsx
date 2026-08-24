import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  compact?: boolean;
  prominentLogo?: boolean;
  onLogoPress?: () => void;
};

export function BrandHeader({ eyebrow, title, subtitle, compact = false, prominentLogo = false, onLogoPress }: Props) {
  const logo = (
    <Image
      accessible={false}
      accessibilityIgnoresInvertColors
      resizeMode="cover"
      source={require('../../assets/spanglish-header-logo.png')}
      style={[styles.logo, compact ? styles.logoCompact : null, prominentLogo ? styles.logoProminent : null]}
    />
  );

  return (
    <View style={[styles.hero, compact ? styles.heroCompact : null, prominentLogo ? styles.heroProminent : null]}>
      {onLogoPress ? (
        <Pressable accessibilityLabel="Ir a Inicio" accessibilityRole="button" onPress={onLogoPress}>{logo}</Pressable>
      ) : logo}
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={[styles.title, compact ? styles.titleCompact : null]}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    backgroundColor: '#fff1d8',
    borderColor: '#dab277',
    borderRadius: 26,
    borderWidth: 1,
    padding: 20,
  },
  heroCompact: { paddingBottom: 12, paddingTop: 10 },
  heroProminent: { paddingHorizontal: 8 },
  logo: { height: 82, marginBottom: 8, width: 250 },
  logoCompact: { height: 54, marginBottom: 3, width: 170 },
  logoProminent: { height: 108, marginBottom: 6, maxWidth: 340, width: '100%' },
  eyebrow: { color: '#697177', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: '#24333a', fontSize: 28, fontWeight: '900', lineHeight: 34, marginTop: 4, textAlign: 'center' },
  titleCompact: { fontSize: 22, lineHeight: 27 },
  subtitle: { color: '#526168', fontSize: 15, lineHeight: 21, marginTop: 6, textAlign: 'center' },
});
