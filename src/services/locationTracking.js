import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { api } from "./api";

const taskName = "toreparo-accepted-booking-location";
const bookingsKey = "toreparo.location.bookingIds";

if (!TaskManager.isTaskDefined(taskName)) {
  TaskManager.defineTask(taskName, async ({ data, error }) => {
    if (error) return;
    const points = data?.locations || [];
    const location = points[points.length - 1];
    if (!location?.coords) return;
    const bookingIds = JSON.parse((await AsyncStorage.getItem(bookingsKey)) || "[]");
    const invalid = [];
    await Promise.all(bookingIds.map(async (bookingId) => {
      try {
        await api.put(`/bookings/${bookingId}/location`, {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (e) {
        if ([404, 409].includes(e.response?.status)) invalid.push(bookingId);
      }
    }));
    if (invalid.length) {
      const remaining = bookingIds.filter((id) => !invalid.includes(id));
      await AsyncStorage.setItem(bookingsKey, JSON.stringify(remaining));
      if (!remaining.length && await Location.hasStartedLocationUpdatesAsync(taskName))
        await Location.stopLocationUpdatesAsync(taskName);
    }
  });
}

export async function syncWorkerLocationTracking(bookings) {
  const acceptedIds = bookings.filter((booking) => booking.status === "ACCEPTED").map((booking) => booking.id);
  if (!acceptedIds.length) {
    await AsyncStorage.removeItem(bookingsKey);
    if (await Location.hasStartedLocationUpdatesAsync(taskName)) await Location.stopLocationUpdatesAsync(taskName);
    return { enabled: false, reason: "No hay reservas aceptadas." };
  }
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    await stopTracking();
    return { enabled: false, reason: "Permite la ubicación para compartir el GPS del servicio." };
  }
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") {
    await stopTracking();
    return { enabled: false, reason: "Permite ubicación en segundo plano para mantener el mapa actualizado." };
  }
  await AsyncStorage.setItem(bookingsKey, JSON.stringify(acceptedIds));
  if (!await Location.hasStartedLocationUpdatesAsync(taskName)) {
    await Location.startLocationUpdatesAsync(taskName, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
      distanceInterval: 10,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: "Compartiendo ubicación del servicio",
        notificationBody: "El cliente puede seguir tu ubicación mientras la reserva está aceptada.",
        notificationColor: "#F97300",
        killServiceOnDestroy: false,
      },
    });
  }
  return { enabled: true };
}

async function stopTracking() {
  await AsyncStorage.removeItem(bookingsKey);
  if (await Location.hasStartedLocationUpdatesAsync(taskName)) await Location.stopLocationUpdatesAsync(taskName);
}
