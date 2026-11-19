import React, { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { HubConnectionBuilder } from "@microsoft/signalr";
import { api, API_URL, errorMessage, getAccessToken } from "../../services/api";
import MapView, { Marker } from "../../components/PlatformMap";
import { s } from "./ui";

export default function BookingLiveMap({ booking, userRole }) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setLocation(await api.get(`/bookings/${booking.id}/location`));
      setError("");
    } catch (e) {
      if (e.response?.status === 404) setLocation(null);
      else setError(errorMessage(e));
    }
  }, [booking.id]);

  useEffect(() => {
    if (userRole !== "CUSTOMER" || booking.status !== "ACCEPTED") return undefined;
    let active = true;
    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/location`, { accessTokenFactory: getAccessToken })
      .withAutomaticReconnect()
      .build();
    const refresh = async () => { if (active) await load(); };
    connection.on("LocationUpdated", (value) => { if (active && value.bookingId === booking.id) setLocation(value); });
    connection.on("TrackingEnded", (value) => { if (active && value.bookingId === booking.id) setLocation(null); });
    connection.onreconnected(async () => {
      try { await connection.invoke("JoinBooking", booking.id); } catch {}
      await refresh();
    });
    load();
    connection.start().then(() => connection.invoke("JoinBooking", booking.id)).catch((e) => {
      if (active) setError("Conexión en vivo interrumpida; se mostrará la última ubicación disponible.");
    });
    const fallback = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(fallback);
      connection.stop().catch(() => {});
    };
  }, [booking.id, booking.status, userRole, load]);

  if (userRole === "LABOUR") {
    if (booking.latitude == null || booking.longitude == null) return <Text style={s.muted}>El cliente no compartió GPS. Usa la dirección guardada.</Text>;
    return <View style={{ height: 180, overflow: "hidden", borderRadius: 14 }}><MapView style={{ flex: 1 }} initialRegion={{ latitude: booking.latitude, longitude: booking.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }}><Marker coordinate={{ latitude: booking.latitude, longitude: booking.longitude }} title="Ubicación del servicio" description={booking.serviceAddress} /></MapView></View>;
  }

  if (location?.latitude == null || location?.longitude == null) return <Text style={s.muted}>{error || "Esperando la ubicación en vivo del trabajador…"}</Text>;
  return <>
    <View style={{ height: 180, overflow: "hidden", borderRadius: 14 }}><MapView style={{ flex: 1 }} initialRegion={{ latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }}><Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} title="Trabajador" /></MapView></View>
    <Text style={s.muted}>Última ubicación: {location.updatedAt ? new Date(location.updatedAt).toLocaleString() : "recibiendo GPS"}</Text>
    {!!error && <Text style={s.muted}>{error}</Text>}
  </>;
}
