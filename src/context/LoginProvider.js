import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, errorMessage, onSession, renewSession, signOut } from '../services/api';
import { readActiveRole, writeActiveRole } from '../services/refreshStorage';
import { syncWorkerLocationTracking } from '../services/locationTracking';

const LoginContext = createContext(null);
export default function LoginProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeRole, setActiveRoleState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  async function restore() {
    setLoading(true);
    setSessionError('');
    try { await renewSession(); }
    catch (error) { setSessionError(errorMessage(error)); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const unsubscribe = onSession(async (value) => {
      setUser(value);
      const roles = value?.roles?.length ? value.roles : value?.role ? [value.role] : [];
      if (!roles.length) { setActiveRoleState(null); await writeActiveRole(null); }
      else if (roles.length === 1) { setActiveRoleState(roles[0]); await writeActiveRole(roles[0]); }
      else {
        const remembered = await readActiveRole();
        setActiveRoleState((current) => current && roles.includes(current) ? current : roles.includes(remembered) ? remembered : null);
      }
      setSessionError('');
    });
    restore();
    return unsubscribe;
  }, []);
  const reloadProfile = async () => {
    const updated = await api.get('/auth/me');
    setUser(updated);
    return updated;
  };
  const setActiveRole = (role) => {
    const roles = user?.roles?.length ? user.roles : user?.role ? [user.role] : [];
    if (roles.includes(role)) { setActiveRoleState(role); writeActiveRole(role); }
  };
  const roles = user?.roles?.length ? user.roles : user?.role ? [user.role] : [];
  const userRole = activeRole || (roles.length === 1 ? roles[0] : null);
  const logout = async () => { try { await syncWorkerLocationTracking([]); } catch {} await signOut(); };
  return <LoginContext.Provider value={{ user, userRole, activeRole, setActiveRole, isLoggedIn: !!user, loading, sessionError, restore, reloadProfile, signOut: logout }}>{children}</LoginContext.Provider>;
}
export const useLogin = () => useContext(LoginContext);
