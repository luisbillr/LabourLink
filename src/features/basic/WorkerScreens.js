import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, Text, View } from "react-native";
import { ActivityIndicator, Avatar, Button, Chip } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { api, errorMessage } from "../../services/api";
import MapView, { Callout, Marker } from "../../components/PlatformMap";
import { Action, Card, ErrorText, Field, Screen, Title, jobLabel, s } from "./ui";
import { avatarSource, WorkerCard, styles } from "./LegacyScreens";
import LabourProfileComponent from "../../components/LabourProfileComponent";
import ServiceBoxBar from "../../components/ServiceBoxBar";
import { syncWorkerLocationTracking } from "../../services/locationTracking";

export function WorkersScreen({ route, navigation }) {
  const [categories, setCategories] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [job, setJob] = useState(route.params?.job || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deviceRegion, setDeviceRegion] = useState(null);
  const [locationMessage, setLocationMessage] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [codes, list] = await Promise.all([
        api.get("/categories"),
        api.get(`/labours${job ? `?jobRole=${encodeURIComponent(job)}` : ""}`),
      ]);
      setCategories(codes);
      setWorkers(list);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [job]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const located = workers.filter(
    (w) => w.latitude != null && w.longitude != null,
  );
  useEffect(() => {
    if (located.length) return undefined;
    let active = true;
    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          if (active) setLocationMessage("Permite la ubicación para centrar el mapa. Los pines de trabajadores aparecen cuando comparten su ubicación.");
          return;
        }
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (active) {
          setDeviceRegion({ latitude: current.coords.latitude, longitude: current.coords.longitude, latitudeDelta: 0.15, longitudeDelta: 0.15 });
          setLocationMessage("");
        }
      } catch {
        if (active) setLocationMessage("No se pudo obtener tu ubicación. Los pines aparecen cuando los trabajadores comparten su ubicación.");
      }
    })();
    return () => { active = false; };
  }, [located.length]);
  const mapCenter = located.length
    ? { latitude: located[0].latitude, longitude: located[0].longitude, latitudeDelta: 0.15, longitudeDelta: 0.15 }
    : deviceRegion || { latitude: -16.5, longitude: -68.15, latitudeDelta: 0.15, longitudeDelta: 0.15 };
  return (
    <Screen
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}
    >
      <Title>{job ? jobLabel(job) : "Trabajadores disponibles"}</Title>
      <View style={[s.row, { marginBottom: 20 }]}>
        <Chip selected={!job} onPress={() => setJob(null)}>
          Todos
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c.code}
            selected={job === c.code}
            onPress={() => setJob(c.code)}
          >
            {c.name}
          </Chip>
        ))}
      </View>
      <ErrorText>{error}</ErrorText>
      {!!error && <Button onPress={load}>Reintentar</Button>}
      {mapCenter && (
        <View
          style={{
            height: 300,
            marginBottom: 20,
            overflow: "hidden",
            borderRadius: 16,
          }}
        >
          <MapView
            style={{ flex: 1 }}
            initialRegion={mapCenter}
          >
            {!located.length && deviceRegion && <Marker title="Mi ubicación" pinColor="#1769aa" coordinate={{ latitude: deviceRegion.latitude, longitude: deviceRegion.longitude }} />}
            {located.map((w) => (
              <Marker
                key={w.id}
                title={w.name}
                coordinate={{ latitude: w.latitude, longitude: w.longitude }}
              >
                <Callout
                  onPress={() =>
                    navigation.navigate("WorkerDetail", { id: w.id })
                  }
                >
                  <Text>{w.name} · Ver perfil</Text>
                </Callout>
              </Marker>
            ))}
          </MapView>
        </View>
      )}
      {!!locationMessage && <Text style={s.muted}>{locationMessage}</Text>}
      {!located.length && !!deviceRegion && <Text style={s.muted}>Aún no hay trabajadores con ubicación compartida en esta búsqueda.</Text>}
      {busy && !workers.length && <ActivityIndicator />}
      {!busy && !error && !workers.length && (
        <Text style={s.muted}>
          Aún no hay trabajadores para esta categoría.
        </Text>
      )}
      {workers.map((w) => (
        <WorkerCard
          key={w.id}
          worker={w}
          onPress={() => navigation.navigate("WorkerDetail", { id: w.id })}
        />
      ))}
    </Screen>
  );
}

export function WorkerDetailScreen({ route, navigation }) {
  const [worker, setWorker] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const load = useCallback(async () => {
    setError("");
    try {
      const [w, r] = await Promise.all([
        api.get(`/labours/${route.params.id}`),
        api.get(`/reviews?labourId=${route.params.id}`),
      ]);
      setWorker(w);
      setReviews(r);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [route.params.id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  return (
    <Screen>
      <ErrorText>{error}</ErrorText>
      {!!error && <Button onPress={load}>Reintentar</Button>}
      {!worker && !error && <ActivityIndicator />}
      {worker && (
        <>
          <LabourProfileComponent
            profileImage={avatarSource(worker.profileImageId)}
            name={worker.name}
            jobTitle={worker.jobRoles.map(jobLabel).join(" · ")}
            rating={worker.rating}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              marginVertical: 20,
            }}
          >
            <ServiceBoxBar
              Cardtext="Servicios terminados"
              Cardno={worker.completedServices}
            />
            <ServiceBoxBar
              Cardtext="Calificación"
              Cardno={worker.rating.toFixed(1)}
            />
          </View>
          <Title>Información del trabajador</Title>
          <Text style={s.text}>Nombre: {worker.name}</Text>
          <Text style={s.text}>
            Género: {worker.gender || "Sin especificar"}
          </Text>
          <Text style={s.text}>
            Idiomas: {worker.languages.join(", ") || "Sin especificar"}
          </Text>
          <Text style={[s.text, { marginTop: 12, marginBottom: 24 }]}>
            Acerca de mí:{" "}
            {worker.aboutMe || "Este trabajador aún no agregó una descripción."}
          </Text>
          <Title>Reseñas</Title>
          {!reviews.length && (
            <Text style={s.muted}>Todavía no tiene reseñas.</Text>
          )}
          {reviews.map((r) => (
            <Card key={r.id}>
              <Text style={s.text}>
                {r.customerName} · {"★".repeat(r.rating)}
              </Text>
              <Text style={s.text}>{r.description}</Text>
            </Card>
          ))}
          <Action
            onPress={() => navigation.navigate("CreateBooking", { worker })}
          >
            Reservar ahora
          </Action>
          <Action
            buttonColor="#00204A"
            loading={chatBusy}
            disabled={chatBusy}
            onPress={async () => {
              setChatBusy(true);
              try {
                const conversation = await api.post("/conversations", { labourId: worker.id });
                navigation.navigate("Messages", { conversationId: conversation.id, otherName: worker.name });
              } catch (e) { setError(errorMessage(e)); }
              finally { setChatBusy(false); }
            }}
          >
            Iniciar chat
          </Action>
        </>
      )}
    </Screen>
  );
}

export function WorkerHomeScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [trackingNotice, setTrackingNotice] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const [p, b] = await Promise.all([
        api.get("/labours/me"),
        api.get("/bookings"),
      ]);
      setProfile(p);
      setBookings(b);
      try {
        const tracking = await syncWorkerLocationTracking(b);
        setTrackingNotice(b.some((item) => item.status === "ACCEPTED") && !tracking.enabled ? tracking.reason : "");
      } catch {
        if (b.some((item) => item.status === "ACCEPTED")) setTrackingNotice("No se pudo iniciar el GPS en segundo plano. Revisa los permisos de ubicación.");
      }
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  async function locate() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        return setError(
          "Permite el acceso a la ubicación para aparecer en el mapa. Tu perfil seguirá disponible en el listado.",
        );
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setProfile(
        await api.put("/labours/me/location", {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }),
      );
      setMessage(
        "Ubicación actualizada. Los clientes pueden verla en el mapa.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <ErrorText>{error}</ErrorText>
      {!!trackingNotice && <Text style={s.muted}>{trackingNotice}</Text>}
      {!!error && <Button onPress={load}>Reintentar</Button>}
      {!profile && !error && <ActivityIndicator color="#F97300" />}
      {profile && (
        <>
          {!profile.isApproved && <Card><Text style={styles.name}>Perfil pendiente de aprobación</Text><Text style={s.text}>Tu perfil y tus oficios no aparecerán en las búsquedas hasta que revisemos tu documento.</Text></Card>}
          <View style={{ alignItems: "center", marginBottom: 22 }}>
            <Avatar.Image
              size={150}
              source={avatarSource(profile.publicProfile.profileImageId)}
            />
            <Text style={[styles.name, { marginTop: 10 }]}>
              {profile.publicProfile.name}
            </Text>
            <Text style={[s.muted, { textAlign: "center", marginVertical: 8 }]}>
              {profile.publicProfile.jobRoles.map(jobLabel).join(" · ")}
            </Text>
            <View style={[s.row, { marginTop: 10, gap: 30 }]}>
              <View>
                <Text style={{ textAlign: "center", color: "#464255" }}>
                  {profile.publicProfile.completedServices}
                </Text>
                <Text style={s.muted}>Servicios terminados</Text>
              </View>
              <View>
                <Text style={{ textAlign: "center", color: "#464255" }}>
                  {profile.publicProfile.rating.toFixed(1)}
                </Text>
                <Text style={s.muted}>Calificación</Text>
              </View>
            </View>
          </View>
          <Card>
            <View style={styles.sectionHeading}>
              <Text style={styles.orangeTitle}>Acerca de mí</Text>
              <Button
                icon="pencil-outline"
                onPress={() => navigation.navigate("EditProfile")}
              >
                Editar
              </Button>
            </View>
            <Text style={s.text}>
              {profile.publicProfile.aboutMe ||
                "Completa tu descripción profesional."}
            </Text>
            <Text style={styles.orangeTitle}>Datos de contacto</Text>
            <Text style={s.text}>{profile.mobileNumber}</Text>
            <Text style={s.muted}>
              {profile.publicProfile.languages.join(", ")}
            </Text>
          </Card>
          {["PENDING", "ACCEPTED", "COMPLETED"].map((status) => (
            <Card key={status}>
              <View style={styles.sectionHeading}>
                <Text style={styles.orangeTitle}>
                  {
                    {
                      PENDING: "Solicitudes pendientes",
                      ACCEPTED: "Próximos servicios",
                      COMPLETED: "Historial de trabajos",
                    }[status]
                  }
                </Text>
                <Button
                  onPress={() => navigation.navigate("Requests", { status })}
                >
                  Ver todo
                </Button>
              </View>
              {bookings.filter((b) => b.status === status).length ? (
                bookings
                  .filter((b) => b.status === status)
                  .slice(0, 3)
                  .map((b) => (
                    <View key={b.id} style={styles.booking}>
                      <Text style={styles.name}>{b.customerName}</Text>
                      <Text style={s.muted}>
                        {jobLabel(b.jobRole)} ·{" "}
                        {new Date(b.startsAt).toLocaleString()}
                      </Text>
                    </View>
                  ))
              ) : (
                <Text style={s.muted}>No hay servicios en esta sección.</Text>
              )}
            </Card>
          ))}
        </>
      )}
      <Card>
        <Title>Horario de trabajo</Title>
        <Text style={s.text}>Configura tus días y horas para que los clientes puedan consultar espacios disponibles.</Text>
        <Action onPress={() => navigation.navigate("Availability")}>Editar disponibilidad</Action>
      </Card>
      <Card>
        <Title>Ubicación en el mapa</Title>
        <Text style={s.text}>
          Comparte tu ubicación actual para aparecer en el mapa. En reservas aceptadas se comparte automáticamente mientras el servicio está activo.
        </Text>
        <Action loading={busy} disabled={busy} onPress={locate}>
          Compartir ubicación actual
        </Action>
        {!!message && <Text style={s.text}>{message}</Text>}
      </Card>
    </Screen>
  );
}

const weekdayLabels = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const emptyWeek = () => weekdayLabels.map(() => ({ enabled: false, windows: [{ startTime: "09:00", endTime: "17:00" }] }));

export function WorkerAvailabilityScreen() {
  const [days, setDays] = useState(emptyWeek);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api.get("/labours/me/availability");
      const next = emptyWeek();
      for (const window of data.windows) {
        if (!next[window.dayOfWeek].enabled) next[window.dayOfWeek] = { enabled: true, windows: [] };
        next[window.dayOfWeek].windows.push({ startTime: window.startTime.slice(0, 5), endTime: window.endTime.slice(0, 5) });
      }
      setDays(next);
    } catch (e) { setError(errorMessage(e)); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  function change(dayIndex, windowIndex, key, value) {
    setDays((previous) => previous.map((day, i) => i !== dayIndex ? day : { ...day, windows: day.windows.map((window, j) => j !== windowIndex ? window : { ...window, [key]: value }) }));
  }
  async function save() {
    setBusy(true); setError(""); setMessage("");
    try {
      const windows = days.flatMap((day, dayOfWeek) => day.enabled ? day.windows.map((window) => ({ dayOfWeek, ...window })) : []);
      await api.put("/labours/me/availability", { timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", windows });
      setMessage("Disponibilidad guardada.");
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <Screen><Title>Disponibilidad semanal</Title><Text style={[s.muted, { marginBottom: 14 }]}>Los servicios ocupan 60 minutos. Los horarios usan la zona horaria de este dispositivo.</Text>
    <ErrorText>{error}</ErrorText>{!!message && <Text style={s.text}>{message}</Text>}
    {days.map((day, dayIndex) => <Card key={dayIndex}><View style={s.row}><Chip selected={day.enabled} onPress={() => setDays((previous) => previous.map((item, i) => i === dayIndex ? { ...item, enabled: !item.enabled } : item))}>{weekdayLabels[dayIndex]} · {day.enabled ? "Disponible" : "No disponible"}</Chip></View>
      {day.enabled && day.windows.map((window, windowIndex) => <View key={`${dayIndex}-${windowIndex}`} style={s.row}><Field label="Desde (HH:mm)" value={window.startTime} onChangeText={(v) => change(dayIndex, windowIndex, "startTime", v)} /><Field label="Hasta (HH:mm)" value={window.endTime} onChangeText={(v) => change(dayIndex, windowIndex, "endTime", v)} /></View>)}
      {day.enabled && <View style={s.row}><Button onPress={() => setDays((previous) => previous.map((item, i) => i === dayIndex ? { ...item, windows: [...item.windows, { startTime: "09:00", endTime: "17:00" }] } : item))}>Añadir intervalo</Button>{day.windows.length > 1 && <Button textColor="#b42318" onPress={() => setDays((previous) => previous.map((item, i) => i === dayIndex ? { ...item, windows: item.windows.slice(0, -1) } : item))}>Quitar intervalo</Button>}</View>}
    </Card>)}
    <Action loading={busy} disabled={busy} onPress={save}>Guardar disponibilidad</Action>
  </Screen>;
}
