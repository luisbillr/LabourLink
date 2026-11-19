import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Button, Chip } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { api, errorMessage } from '../../services/api';
import { useLogin } from '../../context/LoginProvider';
import { Action, Card, ErrorText, Field, Screen, Title, jobLabel, labels, s } from './ui';
import LabourProfileComponent from '../../components/LabourProfileComponent';
import { avatarSource } from './LegacyScreens';
import BookingLiveMap from './BookingLiveMap';
import { syncWorkerLocationTracking } from '../../services/locationTracking';

export function CreateBookingScreen({ route, navigation }) {
  const { worker } = route.params;
  const [job, setJob] = useState(worker.jobRoles[0]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/customers/me').then((p) => setAddress(p.address)).catch((e) => setError(errorMessage(e))); }, []);
  useEffect(() => {
    if (!date) { setAvailableSlots([]); setTime(''); return; }
    setAvailableSlots([]); setTime('');
    let active = true;
    api.get(`/labours/${worker.id}/availability?date=${date}`).then((slots) => { if (active) setAvailableSlots(slots); }).catch((e) => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [date, worker.id]);
  async function submit() {
    setError('');
    const startsAt = availableSlots.find((slot) => new Date(slot.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) === time)?.startsAt;
    if (!date || !startsAt || new Date(startsAt) <= new Date()) return setError('Selecciona una hora disponible.');
    if (description.trim().length < 10) return setError('Describe el trabajo con al menos 10 caracteres.');
    if (!address.trim()) return setError('Indica la dirección del servicio.');
    setBusy(true);
    try {
      let coords = null;
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status === 'granted') {
          const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          coords = { latitude: current.coords.latitude, longitude: current.coords.longitude };
        }
      } catch { /* GPS is optional; the saved address remains usable. */ }
      await api.post('/bookings', { labourId: worker.id, jobRole: job, description, serviceAddress: address, startsAt, latitude: coords?.latitude, longitude: coords?.longitude });
      navigation.replace('Requests', { status: 'PENDING' });
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  const localToday = new Date();
  const minDate = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, '0')}-${String(localToday.getDate()).padStart(2, '0')}`;
  return <Screen><LabourProfileComponent profileImage={avatarSource(worker.profileImageId)} name={worker.name} jobTitle={worker.jobRoles.map(jobLabel).join(' · ')} rating={worker.rating} /><Title>Selecciona la fecha</Title><View style={s.row}>{worker.jobRoles.map((code) => <Chip key={code} selected={job === code} onPress={() => setJob(code)}>{jobLabel(code)}</Chip>)}</View>
    <Calendar minDate={minDate} onDayPress={(day) => setDate(day.dateString)} markedDates={date ? { [date]: { selected: true, selectedColor: '#F97300' } } : {}} />
    <Text style={s.text}>{date ? `Fecha: ${date}` : 'Selecciona el día del servicio'}</Text>
    <Text style={s.muted}>{!date ? 'Elige una fecha para consultar los horarios libres.' : availableSlots.length ? `Horas disponibles (servicios de ${availableSlots[0].durationMinutes} minutos)` : 'No hay horarios disponibles para esta fecha.'}</Text>
    <View style={s.row}>{availableSlots.map((slot) => { const label = new Date(slot.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); return <Chip key={slot.startsAt} selected={time === label} onPress={() => setTime(label)}>{label}</Chip>; })}</View>
    <Field label="Dirección del servicio" value={address} onChangeText={setAddress} />
    <Field label="Describe el servicio que necesitas" multiline value={description} onChangeText={setDescription} />
    <Text style={s.muted}>La fecha usa tu zona horaria. Si compartes tu ubicación, el trabajador podrá abrir el mapa del servicio.</Text>
    <ErrorText>{error}</ErrorText><Action loading={busy} disabled={busy} onPress={submit}>Enviar solicitud</Action>
  </Screen>;
}

export function BookingsScreen({ route, navigation }) {
  const { userRole } = useLogin();
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState(route.params?.status || null);
  const [busy, setBusy] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const list = await api.get(`/bookings${status ? `?status=${status}` : ''}`);
      setBookings(list);
      if (userRole === 'LABOUR') {
        const accepted = status === 'ACCEPTED' ? list : await api.get('/bookings?status=ACCEPTED');
        try { await syncWorkerLocationTracking(accepted); } catch { /* Booking data remains available if GPS permission is unavailable. */ }
      }
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }, [status, userRole]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  async function update(id, next) {
    setUpdating(id); setError('');
    try { await api.patch(`/bookings/${id}/status`, { status: next }); await load(); } catch (e) { setError(errorMessage(e)); } finally { setUpdating(null); }
  }
  async function cancel(id) {
    setUpdating(id); setError('');
    try { await api.post(`/bookings/${id}/cancel`, {}); await load(); }
    catch (e) { setError(errorMessage(e)); } finally { setUpdating(null); }
  }
  function confirmCancel(id) {
    Alert.alert('Cancelar servicio', '¿Quieres cancelar esta solicitud de servicio?', [
      { text: 'Volver', style: 'cancel' },
      { text: 'Cancelar servicio', style: 'destructive', onPress: () => cancel(id) },
    ]);
  }
  return <Screen refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}><Title>Solicitudes e historial</Title>
    <View style={[s.row, { marginBottom: 18 }]}><Chip selected={!status} onPress={() => setStatus(null)}>Todas</Chip>{Object.entries(labels).map(([code, name]) => <Chip key={code} selected={status === code} onPress={() => setStatus(code)}>{name}</Chip>)}</View>
    <ErrorText>{error}</ErrorText>{!!error && <Button onPress={load}>Reintentar</Button>}{!busy && !error && !bookings.length && <Text style={s.muted}>No hay solicitudes en este estado.</Text>}
    {bookings.map((b) => <Card key={b.id}><Title>{userRole === 'CUSTOMER' ? b.labourName : b.customerName}</Title><Text style={s.text}>{jobLabel(b.jobRole)} · {labels[b.status]}</Text><Text style={s.text}>{new Date(b.startsAt).toLocaleString()}</Text><Text style={s.text}>{b.serviceAddress}</Text>{(userRole === 'LABOUR' || userRole === 'CUSTOMER' && b.status === 'ACCEPTED') && <BookingLiveMap booking={b} userRole={userRole} />}<Text style={s.text}>{b.description}</Text>
      {(userRole === 'CUSTOMER' ? b.labourPhone : b.customerPhone) && <Button textColor="#F97300" onPress={() => Linking.openURL(`tel:${(userRole === 'CUSTOMER' ? b.labourPhone : b.customerPhone).replace(/[^\d+]/g, '')}`).catch(() => setError('No se pudo abrir la aplicación de llamadas.'))}>Contactar: {userRole === 'CUSTOMER' ? b.labourPhone : b.customerPhone}</Button>}
      {userRole === 'LABOUR' && b.status === 'PENDING' && <><Action disabled={updating === b.id} loading={updating === b.id} onPress={() => update(b.id, 'ACCEPTED')}>Aceptar solicitud</Action><Button disabled={updating === b.id} textColor="#b42318" onPress={() => update(b.id, 'DECLINED')}>Rechazar</Button></>}
      {userRole === 'LABOUR' && b.status === 'ACCEPTED' && <Action disabled={updating === b.id} loading={updating === b.id} onPress={() => update(b.id, 'COMPLETED')}>Marcar como finalizada</Action>}
      {(b.status === 'PENDING' || b.status === 'ACCEPTED') && <Button disabled={updating === b.id} textColor="#b42318" onPress={() => confirmCancel(b.id)}>Cancelar servicio</Button>}
      {userRole === 'CUSTOMER' && b.status === 'COMPLETED' && <Button textColor="#F97300" onPress={() => navigation.navigate('Review', { booking: b })}>{b.reviewId ? 'Editar mi reseña' : 'Calificar servicio'}</Button>}
      <Button textColor="#b42318" onPress={() => navigation.navigate('Report', { booking: b, targetProfileId: userRole === 'CUSTOMER' ? b.labourId : b.customerId, targetName: userRole === 'CUSTOMER' ? b.labourName : b.customerName })}>Reportar usuario</Button>
    </Card>)}
  </Screen>;
}

export function ReportScreen({ route, navigation }) {
  const { booking, targetProfileId, targetName } = route.params;
  const [issue, setIssue] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit() {
    if (!issue.trim()) return setError('Indica el motivo del reporte.');
    setBusy(true); setError('');
    try { await api.post('/reports', { bookingId: booking.id, targetProfileId, issue: issue.trim(), description: description.trim() }); navigation.goBack(); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <Screen><Card><Title>Reportar a {targetName}</Title><Text style={s.muted}>Reserva del {new Date(booking.startsAt).toLocaleString()}</Text>
    <Field label="Motivo" value={issue} onChangeText={setIssue} maxLength={120} />
    <Field label="Descripción (opcional)" value={description} onChangeText={setDescription} multiline maxLength={3000} />
    <ErrorText>{error}</ErrorText><Action loading={busy} disabled={busy} onPress={submit}>Enviar reporte</Action>
  </Card></Screen>;
}

export function ReviewScreen({ route, navigation }) {
  const { booking } = route.params;
  const [rating, setRating] = useState(5);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(!booking.reviewId);
  useFocusEffect(useCallback(() => {
    if (booking.reviewId) api.get(`/reviews?labourId=${booking.labourId}`).then((reviews) => { const own = reviews.find((r) => r.id === booking.reviewId); if (!own) throw new Error('No se encontró tu reseña.'); setRating(own.rating); setDescription(own.description); setLoaded(true); }).catch((e) => setError(errorMessage(e)));
  }, [booking.reviewId]));
  async function save() {
    if (!description.trim()) return setError('Escribe tu experiencia con el servicio.');
    setBusy(true); setError('');
    try {
      if (booking.reviewId) await api.put(`/reviews/${booking.reviewId}`, { rating, description });
      else await api.post('/reviews', { bookingId: booking.id, rating, description });
      navigation.goBack();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <Screen><Card><Title>Califica su desempeño</Title><Text style={s.text}>{booking.labourName} · {jobLabel(booking.jobRole)}</Text>
    <View style={[s.row, { justifyContent: 'center', marginVertical: 20 }]}>{[1, 2, 3, 4, 5].map((n) => <TouchableOpacity key={n} accessibilityRole="button" accessibilityLabel={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`} accessibilityState={{ selected: rating === n }} onPress={() => setRating(n)} style={{ padding: 5 }}><Ionicons name={n <= rating ? 'star' : 'star-outline'} size={30} color="#FFB300" /></TouchableOpacity>)}</View>
    <Field label="Describe tu experiencia" multiline value={description} onChangeText={setDescription} /><ErrorText>{error}</ErrorText><View style={[s.row, { justifyContent: 'flex-end' }]}><Button disabled={busy} textColor="#F97300" onPress={() => navigation.goBack()}>Cancelar</Button><Button disabled={busy || !loaded} loading={busy} textColor="#F97300" onPress={save}>Guardar</Button></View>
  </Card></Screen>;
}
