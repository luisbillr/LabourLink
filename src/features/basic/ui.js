import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Surface, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

export const orange = '#F97300';
export function Screen({ children, refreshControl, backgroundColor = 'white' }) {
  const insets = useSafeAreaInsets();
  const header = useHeaderHeight();
  return <KeyboardAvoidingView style={[s.page, { backgroundColor }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={header}>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" refreshControl={refreshControl} contentContainerStyle={{ paddingHorizontal: 15, paddingTop: 28 + (header ? 0 : insets.top), paddingBottom: insets.bottom + 30, flexGrow: 1 }}>
      <View style={s.content}>{children}</View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
export function Brand({ subtitle }) {
  return <View style={{ marginBottom: 24 }}><Text style={s.brand}>To<Text style={{ color: orange }}>Reparo</Text></Text>{!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}</View>;
}
export function Field({ label, password, icon, style, ...props }) {
  const [hidden, setHidden] = useState(true);
  return <View style={{ marginBottom: 16 }}><Text style={{ color: '#222222', marginBottom: 6 }}>{label}</Text><TextInput mode="flat" placeholder={label} style={[s.input, style]} theme={{ roundness: 20, colors: { primary: orange } }} underlineColor="transparent" activeUnderlineColor={orange} secureTextEntry={password && hidden}
    left={icon ? <TextInput.Icon icon={icon} color="#737780" /> : undefined}
    right={password ? <TextInput.Icon icon={hidden ? 'eye-off-outline' : 'eye-outline'} color="#737780" onPress={() => setHidden(!hidden)} /> : undefined} {...props} /></View>;
}
export const Action = ({ children, style, ...props }) => <Button mode="contained" buttonColor={orange} textColor="white" style={[s.button, style]} contentStyle={{ minHeight: 46 }} {...props}>{children}</Button>;
export const ErrorText = ({ children }) => children ? <Text accessibilityRole="alert" style={s.error}>{children}</Text> : null;
export const Card = ({ children, style }) => <Surface elevation={1} style={[s.card, style]}>{children}</Surface>;
export const Title = ({ children }) => <Text style={s.title}>{children}</Text>;
export const labels = { PENDING: 'Pendiente', ACCEPTED: 'Aceptada', DECLINED: 'Rechazada', CANCELLED: 'Cancelada', COMPLETED: 'Finalizada' };
export const jobLabel = (code) => ({ CARPENTER: 'Carpintería', DRIVER: 'Conducción', ELECTRICIAN: 'Electricidad', MASON: 'Albañilería', MECHANIC: 'Mecánica', PAINTER: 'Pintura', PLUMBER: 'Plomería', WELDER: 'Soldadura' })[code] || 'Servicio';
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: 'white' }, content: { width: '100%', maxWidth: 390, alignSelf: 'center' },
  brand: { fontSize: 36, fontWeight: '600', textAlign: 'center', color: '#111' }, subtitle: { textAlign: 'center', fontSize: 18, marginTop: 12, color: '#333' },
  input: { backgroundColor: '#EDEDEC', minHeight: 50, borderRadius: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  button: { marginVertical: 8, borderRadius: 24 }, error: { color: '#b42318', marginVertical: 10, lineHeight: 21 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 14, color: '#101828' }, card: { padding: 15, backgroundColor: '#fff', borderRadius: 20, marginBottom: 24, gap: 9 },
  text: { fontSize: 15, color: '#333', lineHeight: 23 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, muted: { color: '#666', lineHeight: 22 },
});
