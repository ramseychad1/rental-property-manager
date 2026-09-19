import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        if (status >= 400 && status < 500) {
          return false;
        }
        return failureCount < 1;
      },
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: { retry: 0 },
  },
});

export const queryKeys = {
  me: ["me"],
  items: (params) => ["items", params],
  item: (id) => ["item", id],
  bookings: (params) => ["bookings", params],
  booking: (id) => ["booking", id],
  dashboardAnalytics: (params) => ["dashboardAnalytics", params],
  users: (params) => ["users", params],
  pricing: (propertyId) => ["pricing", propertyId],
  bookedDates: (propertyId) => ["bookedDates", propertyId],
  errorLogs: (params) => ["errorLogs", params],
  errorLog: (id) => ["errorLog", id],
};
