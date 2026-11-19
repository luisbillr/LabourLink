import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { readRefresh, writeRefresh } from "./refreshStorage";

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api/v1"
).replace(/\/$/, "");
const http = axios.create({ baseURL: API_URL, timeout: 20000 });
let accessToken = null;
let user = null;
let refreshPromise = null;
let epoch = 0;
const listeners = new Set();
export const onSession = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const emit = () => listeners.forEach((listener) => listener(user));

export async function saveSession(session) {
  await writeRefresh(session.refreshToken);
  accessToken = session.accessToken;
  user = session.user;
  emit();
  return user;
}
export async function clearSession() {
  epoch += 1;
  accessToken = null;
  user = null;
  await writeRefresh(null);
  emit();
}
export function errorMessage(error) {
  const body = error.response?.data;
  const details =
    body?.Data && typeof body.Data === "object"
      ? Object.values(body.Data)
          .flat()
          .filter((x) => typeof x === "string")
          .join("\n")
      : "";
  return (
    details ||
    body?.Message ||
    (error.request
      ? "No se pudo conectar con ToReparo. Comprueba la conexión y la dirección de la API."
      : error.message) ||
    "No se pudo completar la operación."
  );
}
export async function renewSession() {
  if (!refreshPromise) {
    const started = epoch;
    refreshPromise = (async () => {
      const refreshToken = await readRefresh();
      if (!refreshToken) return null;
      try {
        const response = await http.post("/auth/refresh", { refreshToken });
        if (!response.data.Success) throw new Error(response.data.Message);
        if (started !== epoch) return null;
        return await saveSession(response.data.Data);
      } catch (error) {
        if (error.response?.status === 401 && started === epoch)
          await clearSession();
        throw error;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
export async function getAccessToken() {
  let expiresAt = 0;
  try {
    expiresAt = jwtDecode(accessToken).exp * 1000;
  } catch {}
  if (!accessToken || expiresAt < Date.now() + 30000) await renewSession();
  return accessToken || "";
}
export async function request(method, path, data, config = {}) {
  const originalToken = accessToken;
  const send = () =>
    http.request({
      method,
      url: path,
      data,
      ...config,
      headers: {
        ...(config.headers || {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
  let response;
  try {
    response = await send();
  } catch (error) {
    if (
      error.response?.status !== 401 ||
      /^\/auth\/(login|refresh|logout|register)(\/|$)/.test(path)
    )
      throw error;
    const restored =
      accessToken && accessToken !== originalToken
        ? user
        : await renewSession();
    if (!restored) {
      await clearSession();
      throw error;
    }
    response = await send();
  }
  if (config.responseType === "arraybuffer" || config.responseType === "blob")
    return response.data;
  if (!response.data?.Success)
    throw new Error(response.data?.Message || "Respuesta inválida de la API.");
  return response.data.Data;
}
export const api = {
  get: (path) => request("GET", path),
  post: (path, data, config) => request("POST", path, data, config),
  put: (path, data) => request("PUT", path, data),
  patch: (path, data) => request("PATCH", path, data),
  delete: (path) => request("DELETE", path),
};
export async function signIn(email, password) {
  return saveSession(
    await api.post("/auth/login", { email: email.trim(), password }),
  );
}
export async function signUp(role, data) {
  return saveSession(
    await api.post(
      `/auth/register/${role === "LABOUR" ? "labour" : "customer"}`,
      data,
    ),
  );
}
export async function signOut() {
  const refreshToken = await readRefresh();
  await clearSession();
  if (refreshToken) {
    try {
      await api.post("/auth/logout", { refreshToken });
    } catch (error) {
      if (__DEV__)
        console.warn(
          "No se pudo revocar la sesión remota; se cerró la sesión local.",
        );
    }
  }
}
export const photoUrl = (id) => (id ? `${API_URL}/files/${id}` : undefined);
