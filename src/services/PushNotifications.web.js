// Mobile push registration is unavailable in the browser. Notifications from
// the backend continue to use the existing polling and WebSocket handlers.
export default function registerNNPushToken() {}

export async function registerIndieID() {}

export async function unregisterIndieDevice() {}

export function addNotificationReceivedListener() {
  return { remove() {} };
}
