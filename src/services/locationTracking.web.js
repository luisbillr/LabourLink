import * as Location from "expo-location";
import { api } from "./api";

let watch = null;
let activeIds = [];

export async function syncWorkerLocationTracking(bookings) {
  activeIds = bookings.filter((booking) => booking.status === "ACCEPTED").map((booking) => booking.id);
  if (!activeIds.length) {
    if (watch != null) watch.remove();
    watch = null;
    return { enabled: false, reason: "No hay reservas aceptadas." };
  }
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") return { enabled: false, reason: "Permite la ubicación para compartir el GPS del servicio." };
  if (watch == null) {
    watch = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 }, async (location) => {
      await Promise.all(activeIds.map((id) => api.put(`/bookings/${id}/location`, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }).catch(() => {})));
    });
  }
  return { enabled: true };
}
