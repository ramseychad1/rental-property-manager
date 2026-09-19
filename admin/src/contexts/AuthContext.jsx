import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authApi } from "@/lib/api";

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  isSuperAdmin: false,
  bootstrapping: true,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me || null);
      return me;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setBootstrapping(false);
    })();
  }, [refresh]);

  const login = useCallback(async (creds) => {
    const res = await authApi.login(creds);
    // After login, fetch /user/ to get fresh shape (or use returned data in mock)
    const me = (await authApi.me()) || res?.data;
    if (!me) throw new Error("Login failed.");
    if (me.role !== "SuperAdmin" && me.role !== "Owner") {
      // Staff-only — sign out guests
      await authApi.logout().catch(() => {});
      throw new Error("This console is restricted to staff accounts.");
    }
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* noop */
    }
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      // isAdmin = any staff role (SuperAdmin or Owner); isSuperAdmin = platform operator only.
      isAdmin: user?.role === "SuperAdmin" || user?.role === "Owner",
      isSuperAdmin: user?.role === "SuperAdmin",
      bootstrapping,
      login,
      logout,
      refresh,
      updateUser,
    }),
    [user, bootstrapping, login, logout, refresh, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
