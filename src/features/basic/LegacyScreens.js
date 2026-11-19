import React, { useCallback, useEffect, useState } from 'react';
import { Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Avatar, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useLogin } from '../../context/LoginProvider';
import { api, errorMessage, photoUrl } from '../../services/api';
import { Action, Brand, Card, ErrorText, Field, Screen, Title, jobLabel, s } from './ui';

const images = {
  DRIVER: require('../../assets/Images/driver.png'),
  ELECTRICIAN: require('../../assets/Images/electrician.png'),
  CARPENTER: require('../../assets/Images/carpenter.png'),
  PAINTER: require('../../assets/Images/painter.png'),
  MASON: require('../../assets/Images/mason.png'),
  MECHANIC: require('../../assets/Images/mechanic.png'),
  PLUMBER: require('../../assets/Images/plumber.png'),
  WELDER: require('../../assets/Images/welder.png'),
};
const categoryOrder = Object.keys(images);
export const avatarSource = (id) => id ? { uri: photoUrl(id) } : require('../../assets/Images/boy.png');

export function WorkerCard({ worker, onPress }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ver perfil de ${worker.name}`} onPress={onPress}>
    <Card><View style={styles.workerRow}><Avatar.Image size={80} source={avatarSource(worker.profileImageId)} /><View style={{ flex: 1, gap: 7 }}>
      <Text style={styles.name}>{worker.name}</Text><Text style={s.muted}>{worker.jobRoles.map(jobLabel).join(' · ')}</Text>
      <Text style={{ color: '#FF7600', fontSize: 19 }}>{'★'.repeat(Math.round(worker.rating))}<Text style={s.text}> {worker.rating.toFixed(1)}</Text></Text>
    </View><Ionicons name="chevron-forward" color="#505151" size={20} /></View></Card>
  </TouchableOpacity>;
}

function BookingSummary({ title, bookings, navigation, status, worker }) {
  return <Card><View style={styles.sectionHeading}><Text style={styles.orangeTitle}>{title}</Text><TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Requests', { status })}><Text style={styles.link}>Ver todo</Text></TouchableOpacity></View>
    {!bookings.length && <Text style={s.muted}>No hay servicios en esta sección.</Text>}
    {bookings.slice(0, 3).map((b) => <TouchableOpacity accessibilityRole="button" key={b.id} style={styles.booking} onPress={() => navigation.navigate('Requests', { status })}>
      <Text style={styles.name}>{worker ? b.customerName : b.labourName}</Text><Text style={s.muted}>{jobLabel(b.jobRole)} · {new Date(b.startsAt).toLocaleString()}</Text>
    </TouchableOpacity>)}
  </Card>;
}

export function CustomerHomeScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const [profile, workers, categories, bookings] = await Promise.all([api.get('/customers/me'), api.get('/labours'), api.get('/categories'), api.get('/bookings')]);
      setData({ profile, workers, categories, bookings });
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const top = data && [...data.workers].sort((a, b) => b.rating - a.rating || b.completedServices - a.completedServices)[0];
  return <Screen refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}>
    <ErrorText>{error}</ErrorText>{!!error && <Button onPress={load}>Reintentar</Button>}{busy && !data && <ActivityIndicator color="#F97300" />}
    {data && <><View style={styles.welcome}><Avatar.Image size={60} source={avatarSource(data.profile.profileImageId)} /><View style={{ flex: 1 }}><Text style={s.muted}>Bienvenido de nuevo,</Text><Title>{data.profile.name}</Title></View></View>
      <Text style={styles.heading}>Trabajador mejor valorado</Text>{top ? <WorkerCard worker={top} onPress={() => navigation.navigate('WorkerDetail', { id: top.id })} /> : <Card><Text style={s.muted}>Todavía no hay trabajadores registrados.</Text></Card>}
      <View style={styles.sectionHeading}><Text style={styles.heading}>Categorías</Text><TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Workers')}><Text style={styles.link}>Ver todos</Text></TouchableOpacity></View>
      <LinearGradient colors={['#FEE0C5', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.categories}>
        {categoryOrder.filter((code) => data.categories.some((c) => c.code === code)).map((code) => <TouchableOpacity accessibilityRole="button" key={code} style={styles.category} onPress={() => navigation.navigate('Workers', { job: code })}>
          <Image source={images[code]} style={styles.categoryImage} resizeMode="contain" /><Text style={styles.categoryText}>{data.categories.find((c) => c.code === code).name}</Text>
        </TouchableOpacity>)}
      </LinearGradient>
      <BookingSummary title="Próximos servicios" bookings={data.bookings.filter((b) => b.status === 'ACCEPTED')} navigation={navigation} status="ACCEPTED" />
      <BookingSummary title="Solicitudes pendientes" bookings={data.bookings.filter((b) => b.status === 'PENDING')} navigation={navigation} status="PENDING" />
      <BookingSummary title="Historial de trabajos" bookings={data.bookings.filter((b) => b.status === 'COMPLETED')} navigation={navigation} status="COMPLETED" />
    </>}
  </Screen>;
}

export function ProfileMenuScreen({ navigation }) {
  const { user, userRole, setActiveRole, signOut } = useLogin();
  const roles = user?.roles?.length ? user.roles : [user?.role].filter(Boolean);
  const [error, setError] = useState('');
  const row = (icon, title, onPress, danger = false) => <TouchableOpacity accessibilityRole="button" style={styles.menuRow} onPress={onPress}>
    <Ionicons name={icon} size={22} color={danger ? '#F15C5C' : '#505151'} /><Text style={styles.menuText}>{title}</Text><Ionicons name="chevron-forward" size={18} color="#505151" />
  </TouchableOpacity>;
  return <Screen><Title>Mi perfil</Title><Text style={[s.muted, { marginBottom: 24 }]}>{user.email} · {userRole === 'LABOUR' ? 'Trabajador' : 'Cliente'}</Text><ErrorText>{error}</ErrorText>
    <Card>{row('person-outline', 'Datos personales', () => navigation.navigate('EditProfile'))}</Card>
    <Card>{row('lock-closed-outline', 'Cambiar contraseña', () => navigation.navigate('ChangePassword'))}</Card>
    <Card><Text style={styles.name}>Otros</Text>{row('information-circle-outline', 'Acerca de nosotros', () => navigation.navigate('About'))}
      {row('calendar-outline', 'Solicitudes e historial', () => navigation.navigate('Requests', { status: null }))}
      {roles.length > 1 ? row('swap-horizontal-outline', 'Cambiar a modo ' + (userRole === 'CUSTOMER' ? 'trabajador' : 'cliente'), () => setActiveRole(userRole === 'CUSTOMER' ? 'LABOUR' : 'CUSTOMER')) : row('person-add-outline', 'Crear perfil de ' + (userRole === 'CUSTOMER' ? 'trabajador' : 'cliente'), () => navigation.navigate('AddProfile', { role: userRole === 'CUSTOMER' ? 'LABOUR' : 'CUSTOMER', email: user.email }))}
      {row('log-out-outline', 'Cerrar sesión', async () => { try { await signOut(); } catch (e) { setError(errorMessage(e)); } }, true)}
    </Card>
  </Screen>;
}

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const load = useCallback(async () => { setError(''); try { setNotifications(await api.get('/notifications')); } catch (e) { setError(errorMessage(e)); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  async function open(item) {
    if (!item.readAt) {
      try { await api.patch(`/notifications/${item.id}/read`, {}); setNotifications((items) => items.map((x) => x.id === item.id ? { ...x, readAt: new Date().toISOString() } : x)); }
      catch (e) { setError(errorMessage(e)); }
    }
  }
  async function remove(id) {
    try { await api.delete(`/notifications/${id}`); setNotifications((items) => items.filter((x) => x.id !== id)); }
    catch (e) { setError(errorMessage(e)); }
  }
  return <Screen backgroundColor="#F8F5E4"><Title>Notificaciones</Title><ErrorText>{error}</ErrorText>
    {!notifications.length && !error && <Card><Ionicons name="notifications-outline" size={42} color="#00204A" /><Text style={styles.name}>No tienes notificaciones</Text></Card>}
    {notifications.map((item) => <TouchableOpacity key={item.id} onPress={() => open(item)}><Card style={!item.readAt ? { borderLeftWidth: 4, borderLeftColor: '#F97300' } : undefined}><Text style={styles.name}>{item.title}</Text><Text style={s.text}>{item.message}</Text><Text style={s.muted}>{new Date(item.createdAt).toLocaleString()}</Text><Button onPress={() => remove(item.id)}>Eliminar</Button></Card></TouchableOpacity>)}
  </Screen>;
}
export function ChatScreen({ route }) {
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedId, setSelectedId] = useState(route?.params?.conversationId || null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const loadConversations = useCallback(async () => {
    try { const [items, online] = await Promise.all([api.get('/conversations'), api.get('/presence/contacts')]); setConversations(items); setContacts(online); }
    catch (e) { setError(errorMessage(e)); }
  }, []);
  useEffect(() => { if (route?.params?.conversationId) setSelectedId(route.params.conversationId); }, [route?.params?.conversationId]);
  useEffect(() => { loadConversations(); const timer = setInterval(loadConversations, 7000); return () => clearInterval(timer); }, [loadConversations]);
  const loadMessages = useCallback(async () => {
    if (!selectedId) return;
    try { setMessages(await api.get(`/conversations/${selectedId}/messages`)); setError(''); }
    catch (e) { setError(errorMessage(e)); }
  }, [selectedId]);
  useEffect(() => { if (!selectedId) return; loadMessages(); const timer = setInterval(loadMessages, 4000); return () => clearInterval(timer); }, [selectedId, loadMessages]);
  async function send() {
    if (!draft.trim() || !selectedId) return;
    try { await api.post(`/conversations/${selectedId}/messages`, { body: draft.trim() }); setDraft(''); await loadMessages(); await loadConversations(); }
    catch (e) { setError(errorMessage(e)); }
  }
  const conversation = conversations.find((x) => x.id === selectedId);
  if (selectedId) return <Screen><Button onPress={() => setSelectedId(null)}>Volver a conversaciones</Button><Title>{conversation?.otherName || route?.params?.otherName || 'Mensajes'}</Title>
    <ErrorText>{error}</ErrorText>{messages.map((message) => <Card key={message.id}><Text style={s.text}>{message.body}</Text><Text style={s.muted}>{new Date(message.createdAt).toLocaleString()}</Text></Card>)}
    <Field label="Escribe un mensaje" value={draft} onChangeText={setDraft} multiline /><Action onPress={send} disabled={!draft.trim()}>Enviar</Action>
  </Screen>;
  return <Screen><Title>Mensajes</Title><ErrorText>{error}</ErrorText>{!conversations.length && !error && <Card><Ionicons name="chatbubbles-outline" size={42} color="#00204A" /><Text style={styles.name}>Aún no tienes conversaciones</Text><Text style={s.text}>Puedes iniciar un chat desde el perfil de un trabajador.</Text></Card>}
    {conversations.map((item) => { const contact = contacts.find((x) => x.accountId === item.otherAccountId); return <TouchableOpacity key={item.id} onPress={() => setSelectedId(item.id)}><Card><View style={styles.sectionHeading}><Text style={styles.name}>{item.otherName}</Text>{contact?.isOnline && <Text style={{ color: '#16803C' }}>En línea</Text>}</View><Text style={s.muted}>{item.unreadCount ? `${item.unreadCount} mensaje(s) sin leer` : new Date(item.lastMessageAt).toLocaleString()}</Text></Card></TouchableOpacity>; })}
  </Screen>;
}
export function AboutScreen() {
  return <Screen><Brand subtitle="Acerca de nosotros" /><Card><Text style={s.text}>ToReparo conecta a clientes con trabajadores de distintos oficios. Encuentra un profesional, solicita un servicio y comparte tu experiencia al finalizar.</Text></Card></Screen>;
}
export function WelcomeScreen({ navigation }) {
  return <Screen><View style={{ paddingTop: 40 }}><Brand subtitle="¡Hola, te estábamos esperando!" /><Text style={[s.text, { textAlign: 'center', marginBottom: 24 }]}>Encuentra el servicio que necesitas y forma parte de nuestra comunidad.</Text>
    <Action buttonColor="#01214A" style={{ alignSelf: 'center', borderRadius: 10 }} icon="arrow-right-bold-circle-outline" onPress={() => navigation.navigate('Login')}>Comenzar</Action>
    <View style={{ height: 360, marginTop: 35, overflow: 'hidden' }}><Image source={require('../../assets/Images/bg-home-ellipse.png')} style={{ position: 'absolute', width: '100%', height: 360 }} resizeMode="stretch" /><Image source={require('../../assets/Images/bg-home-people.png')} style={{ width: '100%', height: 340 }} resizeMode="contain" /></View>
  </View></Screen>;
}

export const styles = StyleSheet.create({
  welcome: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 30 },
  heading: { fontSize: 16, fontWeight: '700', color: '#101828', marginBottom: 15 },
  name: { fontSize: 16, fontWeight: '600', color: '#1D1617' },
  workerRow: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  orangeTitle: { color: '#FF7600', fontWeight: '700', fontSize: 16, flex: 1 },
  link: { color: '#0066CC', paddingVertical: 8 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 20, paddingVertical: 15, paddingHorizontal: 6, marginBottom: 30 },
  category: { width: '25%', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 2 },
  categoryImage: { width: 50, height: 60 }, categoryText: { textAlign: 'center', fontSize: 12, marginTop: 5 },
  booking: { paddingVertical: 8, gap: 5 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  menuText: { flex: 1, fontSize: 16, color: '#222222' },
});
