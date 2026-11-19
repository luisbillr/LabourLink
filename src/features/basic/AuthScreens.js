import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Chip } from 'react-native-paper';
import { api, errorMessage, signIn, signUp } from '../../services/api';
import { writeActiveRole } from '../../services/refreshStorage';
import { Action, Brand, ErrorText, Field, Screen, s } from './ui';

export function LoginScreen({ navigation }) {
  const [role, setRole] = useState('CUSTOMER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
    setError(''); setBusy(true);
    try { await writeActiveRole(role); await signIn(email, password); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <Screen><View style={login.card}>
    <View style={login.brand}><Text style={login.wordmark}>To<Text style={{ color: '#F97300' }}>Reparo</Text></Text></View>
    <Text style={login.title}>Ingresa a tu cuenta</Text>
    <View style={login.roles}>{[['CUSTOMER', 'Cliente'], ['LABOUR', 'Trabajador']].map(([code, text], index) => <Pressable key={code} accessibilityRole="button" accessibilityState={{ selected: role === code }} onPress={() => setRole(code)} style={[login.role, index === 0 ? login.roleLeft : login.roleRight, role === code && login.activeRole]}><Text style={{ textAlign: 'center', color: role === code ? 'white' : '#222' }}>{text}</Text></Pressable>)}</View>
    <Field icon="email-outline" label="Correo electrónico" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" />
    <Field icon="lock-outline" label="Contraseña" value={password} onChangeText={setPassword} password autoCapitalize="none" autoComplete="current-password" />
    <Pressable accessibilityRole="button" style={login.forgot} onPress={() => navigation.navigate('ForgotPassword')}><Text style={login.forgotText}>¿Olvidaste tu contraseña?</Text></Pressable>
    <ErrorText>{error}</ErrorText><Action style={login.primary} loading={busy} disabled={busy} onPress={submit}>Iniciar sesión</Action>
    <View style={login.separator}><View style={login.rule} /><Text style={login.separatorText}>¿Aún no tienes una cuenta?</Text><View style={login.rule} /></View>
    <Button textColor="#F97300" onPress={() => navigation.navigate('Register', { role })}>Registrarme como {role === 'LABOUR' ? 'trabajador' : 'cliente'}</Button>
  </View></Screen>;
}

const login = StyleSheet.create({
  card: { width: '100%', alignSelf: 'center', marginTop: 30, paddingHorizontal: 9, paddingBottom: 28, backgroundColor: 'white' },
  brand: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 10 },
  wordmark: { fontSize: 40, fontWeight: '600', color: '#16181C' },
  title: { textAlign: 'center', color: '#454851', fontSize: 15, marginVertical: 10 },
  roles: { flexDirection: 'row', marginVertical: 20 },
  role: { flex: 1, borderWidth: 1, borderColor: '#F97300', paddingVertical: 12 },
  roleLeft: { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  roleRight: { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  activeRole: { backgroundColor: '#F97300' },
  forgot: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 2, marginTop: -8, marginBottom: 12 },
  forgotText: { color: '#F97300', fontSize: 14, fontWeight: '500' },
  primary: { marginTop: 4, marginBottom: 14, borderRadius: 24, backgroundColor: '#FB9741' },
  separator: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 10 },
  rule: { flex: 1, height: 1, backgroundColor: '#D9DBE0' },
  separatorText: { fontSize: 13, color: '#6B6E76' },
  secondary: { borderColor: '#C9CBD1', borderRadius: 14, marginVertical: 7 },
  secondaryContent: { minHeight: 50 },
});

export function RegisterScreen({ route, navigation }) {
  const role = route.params.role;
  const worker = role === 'LABOUR';
  const [form, setForm] = useState(() => ({ name: '', email: route.params.email || '', mobileNumber: '', password: '', confirm: '', address: '', identificationNumber: '' }));
  const [categories, setCategories] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = () => api.get('/categories').then(setCategories).catch((e) => setError(errorMessage(e)));
  useEffect(() => { if (worker) load(); }, [worker]);
  const change = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  async function submit() {
    setError('');
    if (form.password !== form.confirm) return setError('Las contraseñas no coinciden.');
    if (form.password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (worker && !jobs.length) return setError('Selecciona al menos un oficio.');
    setBusy(true);
    try { const { confirm, ...data } = form; await signUp(role, { ...data, jobRoles: jobs }); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <Screen><Image source={require('../../assets/Images/Welcoming.png')} style={{ height: 120, width: '100%', marginBottom: 20 }} resizeMode="contain" /><Brand subtitle={`Crea tu cuenta de ${worker ? 'trabajador' : 'cliente'}`} />
    <Field label="Nombre completo" value={form.name} onChangeText={change('name')} autoComplete="name" />
    <Field label="Correo electrónico" value={form.email} onChangeText={change('email')} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
    <Field label="Teléfono (con código de país)" value={form.mobileNumber} onChangeText={change('mobileNumber')} keyboardType="phone-pad" />
    {worker ? <><Field label="Documento de identidad" value={form.identificationNumber} onChangeText={change('identificationNumber')} />
      <Text style={[s.text, { marginBottom: 10 }]}>Selecciona tus oficios</Text><View style={s.row}>{categories.map((c) => <Chip key={c.code} selected={jobs.includes(c.code)} onPress={() => setJobs((v) => v.includes(c.code) ? v.filter((x) => x !== c.code) : [...v, c.code])}>{c.name}</Chip>)}</View>
      {!categories.length && <Button onPress={load}>Cargar oficios</Button>}
      <Text style={[s.muted, { marginVertical: 12 }]}>Después de registrarte podrás adjuntar tu documento y completar tu perfil.</Text>
    </> : <Field label="Dirección" value={form.address} onChangeText={change('address')} />}
    <Field label="Contraseña (mínimo 8 caracteres)" value={form.password} onChangeText={change('password')} password autoCapitalize="none" />
    <Field label="Confirmar contraseña" value={form.confirm} onChangeText={change('confirm')} password autoCapitalize="none" />
    <ErrorText>{error}</ErrorText><Action loading={busy} disabled={busy} onPress={submit}>Crear cuenta</Action>
    {!route.params.email && <Button textColor="#F97300" onPress={() => navigation.navigate('Login')}>¿Ya tienes una cuenta? Inicia sesión</Button>}
  </Screen>;
}

export function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [stage, setStage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function submit() {
    setBusy(true); setError(''); setMessage('');
    try {
      if (stage === 0) { await api.post('/auth/password-recovery/request', { email }); setStage(1); setMessage('Si la cuenta existe, recibirás un código por correo.'); }
      else if (stage === 1) { const result = await api.post('/auth/password-recovery/verify', { email, code }); setToken(result.resetToken); setStage(2); }
      else {
        if (password !== confirm) throw new Error('Las contraseñas no coinciden.');
        await api.post('/auth/password-recovery/reset', { email, resetToken: token, newPassword: password });
        setMessage('Contraseña actualizada. Ya puedes iniciar sesión.');
        setStage(3);
      }
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <Screen><Brand subtitle="Recuperar contraseña" />
    {stage < 3 && <Field label="Correo electrónico" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />}
    {stage === 1 && <Field label="Código de 6 dígitos" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />}
    {stage === 2 && <><Field label="Nueva contraseña (mínimo 8 caracteres)" value={password} onChangeText={setPassword} password /><Field label="Confirmar contraseña" value={confirm} onChangeText={setConfirm} password /></>}
    {!!message && <Text style={s.text}>{message}</Text>}<ErrorText>{error}</ErrorText>
    {stage < 3 ? <Action loading={busy} disabled={busy} onPress={submit}>{['Enviar código', 'Verificar código', 'Cambiar contraseña'][stage]}</Action> : <Action onPress={() => navigation.navigate('Login')}>Volver al inicio de sesión</Action>}
  </Screen>;
}
