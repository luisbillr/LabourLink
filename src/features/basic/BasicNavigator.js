import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { ActivityIndicator, Button } from 'react-native-paper';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useLogin } from '../../context/LoginProvider';
import { ForgotPasswordScreen, LoginScreen, RegisterScreen } from './AuthScreens';
import { WorkersScreen, WorkerAvailabilityScreen, WorkerDetailScreen, WorkerHomeScreen } from './WorkerScreens';
import { CreateBookingScreen, BookingsScreen, ReportScreen, ReviewScreen } from './BookingScreens';
import ProfileScreen, { ChangePasswordScreen } from './ProfileScreen';
import { AboutScreen, ChatScreen, CustomerHomeScreen, NotificationsScreen, ProfileMenuScreen, WelcomeScreen } from './LegacyScreens';
import { api } from '../../services/api';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
function HomeTabs() {
  const { userRole } = useLogin();
  const [unread, setUnread] = useState({ notifications: 0, messages: 0 });
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try { await api.put('/presence/heartbeat', {}); } catch {}
      try {
        const [notifications, messages] = await Promise.all([api.get('/notifications/unread-count'), api.get('/messages/unread-count')]);
        if (active) setUnread({ notifications, messages });
      } catch {}
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const icons = { Home: 'home', Notification: 'notifications', Chat: 'chatbubble', Profile: 'person' };
  return <Tab.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: '#F97300', tabBarInactiveTintColor: '#72757A', tabBarStyle: { backgroundColor: 'white' }, tabBarBadge: route.name === 'Notification' ? (unread.notifications || undefined) : route.name === 'Chat' ? (unread.messages || undefined) : undefined, tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} /> })}>
    <Tab.Screen name="Home" component={userRole === 'CUSTOMER' ? CustomerHomeScreen : WorkerHomeScreen} options={{ title: 'Inicio' }} />
    <Tab.Screen name="Notification" component={NotificationsScreen} options={{ title: 'Notificaciones' }} />
    <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
    <Tab.Screen name="Profile" component={ProfileMenuScreen} options={{ title: 'Mi perfil' }} />
  </Tab.Navigator>;
}
function ChooseProfileScreen() {
  const { user, setActiveRole } = useLogin();
  const roles = user?.roles || [user?.role].filter(Boolean);
  return <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'white' }}>
    <Text style={{ fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 10, color: '#222' }}>¿Cómo quieres ingresar?</Text>
    <Text style={{ textAlign: 'center', color: '#666', marginBottom: 26 }}>{user?.email}</Text>
    {roles.includes('CUSTOMER') && <Button mode="contained" buttonColor="#F97300" style={{ marginVertical: 7 }} onPress={() => setActiveRole('CUSTOMER')}>Entrar como cliente</Button>}
    {roles.includes('LABOUR') && <Button mode="contained" buttonColor="#F97300" style={{ marginVertical: 7 }} onPress={() => setActiveRole('LABOUR')}>Entrar como trabajador</Button>}
  </View>;
}
export default function BasicNavigator() {
  const { user, userRole, loading, sessionError, restore, signOut } = useLogin();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'white' }}><ActivityIndicator color="#F97300" /></View>;
  if (sessionError && !user) return <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'white' }}><Text style={{ marginBottom: 20 }}>{sessionError}</Text><Button onPress={restore}>Reintentar conexión</Button><Button onPress={signOut}>Ir al inicio de sesión</Button></View>;
  return <Stack.Navigator key={`${user ? 'signed-in' : 'signed-out'}-${userRole || 'choose'}`} screenOptions={{ headerTintColor: '#00204A', headerStyle: { backgroundColor: 'white' }, cardStyle: { backgroundColor: 'white' } }}>
    {user ? userRole ? <><Stack.Screen name="HomeTabs" component={HomeTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Workers" component={WorkersScreen} options={{ title: 'Encuentra un trabajador' }} />
      <Stack.Screen name="Requests" component={BookingsScreen} options={{ title: 'Solicitudes e historial' }} />
      <Stack.Screen name="EditProfile" component={ProfileScreen} options={{ title: 'Datos personales' }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: 'Acerca de nosotros' }} />
      <Stack.Screen name="Messages" component={ChatScreen} options={{ title: 'Mensajes' }} />
      <Stack.Screen name="Availability" component={WorkerAvailabilityScreen} options={{ title: 'Disponibilidad' }} />
      <Stack.Screen name="WorkerDetail" component={WorkerDetailScreen} options={{ title: 'Perfil del trabajador' }} />
      <Stack.Screen name="CreateBooking" component={CreateBookingScreen} options={{ title: 'Solicitar servicio' }} />
      <Stack.Screen name="Review" component={ReviewScreen} options={{ title: 'Calificar servicio' }} />
      <Stack.Screen name="Report" component={ReportScreen} options={{ title: 'Reportar usuario' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Seguridad' }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Recuperar contraseña' }} />
      <Stack.Screen name="AddProfile" component={RegisterScreen} options={{ title: 'Crear otro perfil' }} />
    </> : <Stack.Screen name="ChooseProfile" component={ChooseProfileScreen} options={{ title: 'Elegir perfil' }} /> : <><Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} /><Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} /><Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Crear cuenta' }} /></>}
  </Stack.Navigator>;
}
