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
  isSiteAdmin: false,
  isComplexAdmin: false,
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
    if (!["SuperAdmin", "SiteAdmin", "Owner"].includes(me.role)) {
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
      // isAdmin = any staff role; isSuperAdmin = platform operator only;
      // isComplexAdmin = may run a complex (SuperAdmin or its Site Admin).
      isAdmin: ["SuperAdmin", "SiteAdmin", "Owner"].includes(user?.role),
      isSuperAdmin: user?.role === "SuperAdmin",
      isSiteAdmin: user?.role === "SiteAdmin",
      isComplexAdmin: user?.role === "SuperAdmin" || user?.role === "SiteAdmin",
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
