import axios from "axios";

// API setup
const DEFAULT_API_URL = "https://api.rentalpropertymanager.com/api";

function normalizeApiUrl(value) {
  const url = String(value ?? "").trim();

  if (!url || url === "undefined" || url === "null") {
    return DEFAULT_API_URL;
  }

  return url.replace(/\/+$/, "");
}

const API_URL = normalizeApiUrl(
  typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_URL : "",
);

const http = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  withCredentials: true,
  headers: { "X-Client": "rental-property-manager-admin-panel" },
});

// Error handler
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Something went wrong. Please try again.";

    return Promise.reject({ ...err, normalizedMessage: msg });
  },
);

// Auth APIs
export const authApi = {
  login: async ({ email, password }) => {
    const { data } = await http.post("/auth/login", { email, password });
    return data;
  },

  forgotPassword: async ({ email }) => {
    const { data } = await http.post("/auth/forgotPassword", { email });
    return data;
  },

  resetPassword: async ({ token, email, password }) => {
    const { data } = await http.post("/auth/resetPassword", {
      token,
      email,
      password,
    });
    return data;
  },

  me: async () => {
    const { data } = await http.get("/user/");
    return data?.data;
  },

  logout: async () => {
    const { data } = await http.post("/user/logout");
    return data;
  },

  updateProfile: async (formData) => {
    const { data } = await http.post("/user/updateProfile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  updatePassword: async (body) => {
    const { data } = await http.patch("/user/updatePassword", body);
    return data;
  },
};

// Property APIs
export const itemsApi = {
  list: async (params = {}) => {
    const { data } = await http.get("/property/", { params });
    return data?.data || [];
  },

  get: async (id) => {
    const { data } = await http.get(`/property/${id}?user=admin`);
    return data?.data;
  },

  create: async (formData) => {
    const { data } = await http.post("/property/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.data;
  },

  update: async (id, formData) => {
    const { data } = await http.patch(`/property/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.data;
  },

  remove: async (id) => {
    const { data } = await http.delete(`/property/${id}`);
    return data;
  },

  bookedDates: async (id) => {
    const { data } = await http.get(`/property/${id}/booked-dates`);
    return data?.data || [];
  },

  checkAvailability: async (id, params) => {
    const { data } = await http.get(`/property/${id}/check-availability`, {
      params,
    });
    return data?.data;
  },
};

// Pricing APIs
export const pricingApi = {
  list: async (propertyId) => {
    const { data } = await http.get(`/season/${propertyId}`);
    return data?.data || [];
  },

  create: async (propertyId, body) => {
    const { data } = await http.post(`/season/${propertyId}`, body);
    return data?.data;
  },

  update: async (seasonId, propertyId, body) => {
    const { data } = await http.patch(
      `/season/${seasonId}/${propertyId}`,
      body,
    );
    return data?.data;
  },

  remove: async (seasonId, propertyId) => {
    const { data } = await http.delete(`/season/${seasonId}/${propertyId}`);
    return data;
  },
};

// Booking APIs
export const bookingsApi = {
  list: async (params = {}) => {
    const { data } = await http.get("/booking/", { params });
    return data?.data || [];
  },

  get: async (bookingId) => {
    const { data } = await http.get(`/booking/${bookingId}`);
    return data?.data;
  },

  accept: async (bookingId) => {
    const { data } = await http.patch(`/booking/${bookingId}/accept`);
    return data?.data;
  },

  reject: async (bookingId) => {
    const { data } = await http.patch(`/booking/${bookingId}/reject`);
    return data?.data;
  },

  cancel: async (bookingId, cancelledBy = "host", cancellationReason) => {
    const { data } = await http.patch(`/booking/${bookingId}/cancel`, {
      cancelledBy,
      cancellationReason,
    });
    return data?.data;
  },

  setPayment: async (bookingId, paymentStatus) => {
    const { data } = await http.patch(`/booking/${bookingId}/payment-status`, {
      paymentStatus,
    });
    return data?.data;
  },
};

export const dashboardApi = {
  analytics: async (params = {}) => {
    const { data } = await http.get("/booking/analytics", { params });
    return data?.data;
  },
};

// User APIs
export const usersApi = {
  list: async (params = {}) => {
    const { data } = await http.get("/user/all-users", { params });
    return data?.data || [];
  },

  getUserBookings: async (userId, params = {}) => {
    const { data } = await http.get(`/user/${userId}/bookings`, { params });
    return data?.data || { bookings: [], pagination: {} };
  },
};

// ThingsToDo APIs
export const thingsToDoApi = {
  list: async (params = {}) => {
    const { data } = await http.get("/thingtodo", { params });
    return data?.data || [];
  },

  get: async (id) => {
    const { data } = await http.get(`/thingtodo/${id}`);
    return data?.data;
  },

  create: async (formData) => {
    const { data } = await http.post("/thingtodo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.data;
  },

  update: async (id, formData) => {
    const { data } = await http.patch(`/thingtodo/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.data;
  },

  remove: async (id) => {
    const { data } = await http.delete(`/thingtodo/${id}`);
    return data;
  },
};

// Blog APIs
export const blogsApi = {
  list: async (params = {}) => {
    const { data } = await http.get("/blog", { params });
    return data?.data || [];
  },

  get: async (id) => {
    const { data } = await http.get(`/blog/${id}`);
    return data?.data;
  },

  create: async (formData) => {
    const { data } = await http.post("/blog", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.data;
  },

  update: async (id, formData) => {
    const { data } = await http.patch(`/blog/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.data;
  },

  remove: async (id) => {
    const { data } = await http.delete(`/blog/${id}`);
    return data;
  },
};

// Error log APIs
export const errorLogsApi = {
  list: async (params = {}) => {
    const { data } = await http.get("/errors", { params });
    return data?.data || { errors: [], pagination: {} };
  },

  get: async (id) => {
    const { data } = await http.get(`/errors/${id}`);
    return data?.data;
  },

  remove: async (id) => {
    const { data } = await http.delete(`/errors/${id}`);
    return data;
  },

  removeMany: async (body) => {
    const { data } = await http.delete("/errors", { data: body });
    return data?.data || { deletedCount: 0 };
  },
};

export default http;
