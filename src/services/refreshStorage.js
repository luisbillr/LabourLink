import * as SecureStore from 'expo-secure-store';
const key = 'toreparo.refresh';
const roleKey = 'toreparo.activeRole';
export const readRefresh = () => SecureStore.getItemAsync(key);
export const writeRefresh = (value) => value ? SecureStore.setItemAsync(key, value) : SecureStore.deleteItemAsync(key);
export const readActiveRole = () => SecureStore.getItemAsync(roleKey);
export const writeActiveRole = (value) => value ? SecureStore.setItemAsync(roleKey, value) : SecureStore.deleteItemAsync(roleKey);
