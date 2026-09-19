import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

function FullScreenLoader() {
  return (
    <div className="min-h-screen grid place-items-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Auth-only guard. Use AdminRoute below for admin-strict screens. */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, bootstrapping } = useAuth();
  const location = useLocation();
  if (bootstrapping) return <FullScreenLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

export function AdminRoute({ children }) {
  const { user, isAuthenticated, isAdmin, bootstrapping } = useAuth();
  const location = useLocation();
  if (bootstrapping) return <FullScreenLoader />;
  if (!isAuthenticated)
    return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/login" replace />;
  // Accounts with a temporary password can only reach Settings (the API
  // enforces this too) until they've set their own.
  if (user?.mustChangePassword && location.pathname !== "/settings")
    return <Navigate to="/settings" replace />;
  return children;
}

/** Platform-operator-only screens (Site Content, Users, ...). */
export function SuperAdminRoute({ children }) {
  const { isSuperAdmin } = useAuth();
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  return children;
}
