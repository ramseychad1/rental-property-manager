import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AdminRoute, SuperAdminRoute } from "@/router/ProtectedRoute";
import AppShell from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { vertical } from "@/config/vertical";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorBoundary from "@/components/common/ErrorBoundary";

const LoginPage = lazy(() => import("@/pages/auth/Login"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const DashboardPage = lazy(() => import("@/pages/dashboard/Dashboard"));
const ItemListPage = lazy(() => import("@/pages/items/ItemList"));
const ItemFormPage = lazy(() => import("@/pages/items/ItemForm"));
const ItemDetailPage = lazy(() => import("@/pages/items/ItemDetail"));
const BookingListPage = lazy(() => import("@/pages/bookings/BookingList"));
const UserListPage = lazy(() => import("@/pages/users/UserList"));
const SettingsPage = lazy(() => import("@/pages/settings/Settings"));
const SiteContentPage = lazy(() => import("@/pages/siteContent/SiteContent"));
const TrustedRentersPage = lazy(() => import("@/pages/trustedRenters/TrustedRenters"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const ThingsToDoList = lazy(() => import("@/pages/ThingsToDo/ThingsToDoList"));
const ThingsToDoDetail = lazy(() => import("@/pages/ThingsToDo/ThingsToDoDetail"));
const ThingsToDoForm = lazy(() => import("@/pages/ThingsToDo/ThingsToDoForm"));

function RouteFallback() {
  return (
    <div className="space-y-6 p-5 md:p-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-[420px] w-full rounded-xl" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />

                  <Route element={<AdminRoute><AppShell /></AdminRoute>}>
                    <Route index element={<DashboardPage />} />
                    <Route path={vertical.item.slug}>
                      <Route index element={<ItemListPage />} />
                      <Route path="new" element={<ItemFormPage mode="create" />} />
                      <Route path=":id" element={<ItemDetailPage />} />
                      <Route path=":id/edit" element={<ItemFormPage mode="edit" />} />
                    </Route>
                    <Route path="things-to-do" element={<SuperAdminRoute><Outlet /></SuperAdminRoute>}>
                      <Route index element={<ThingsToDoList />} />
                      <Route path="new" element={<ThingsToDoForm mode="create" />} />
                      <Route path=":id" element={<ThingsToDoDetail />} />
                      <Route path=":id/edit" element={<ThingsToDoForm mode="edit" />} />
                    </Route>
                    <Route path="trusted-renters" element={<TrustedRentersPage />} />
                    <Route path="bookings" element={<BookingListPage />} />
                    <Route path="pricing" element={<Navigate to={`/${vertical.item.slug}`} replace />} />
                    <Route path="users" element={<SuperAdminRoute><UserListPage /></SuperAdminRoute>} />
                    <Route path="site-content" element={<SuperAdminRoute><SiteContentPage /></SuperAdminRoute>} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>

                  <Route path="/404" element={<NotFound />} />
                  <Route path="*" element={<Navigate to="/404" replace />} />
                </Routes>
              </Suspense>
              <Toaster position="top-right" richColors closeButton />
            </BrowserRouter>
          </ErrorBoundary>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
