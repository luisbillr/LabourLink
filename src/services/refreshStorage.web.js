const key = 'toreparo.refresh';
const roleKey = 'toreparo.activeRole';
export const readRefresh = async () => typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(key);
export const writeRefresh = async (value) => {
  if (typeof sessionStorage !== 'undefined') value ? sessionStorage.setItem(key, value) : sessionStorage.removeItem(key);
};
export const readActiveRole = async () => typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(roleKey);
export const writeActiveRole = async (value) => {
  if (typeof sessionStorage !== 'undefined') value ? sessionStorage.setItem(roleKey, value) : sessionStorage.removeItem(roleKey);
};
