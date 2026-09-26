import axios from "axios";

// Deliberately relative (not VITE_API_URL): the browser must hit this app's
// own origin so the backend's session cookie is set as first-party. Vite's
// dev/preview server proxies "/api" to the real backend (see vite.config.js).
// A direct cross-origin call here works on desktop but silently drops the
// cookie on iOS, where every browser runs on WebKit and blocks third-party
// cookies by default (login appears to succeed, then the next request 401s).
const API_URL = "/api";

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

  // Upcoming held bookings as ranges: { blockedRanges: [{ startDate, endDate, nights, guestName, bookingId, status }] }
  bookedDates: async (id) => {
    const { data } = await http.get(`/property/${id}/booked-ranges`);
    return data?.data || { blockedRanges: [] };
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

  // Payment-schedule installments (only present on bookings whose property
  // has payment terms configured - see itemsApi's paymentTerms field).
  markInstallmentPaid: async (bookingId, installmentId, paid) => {
    const { data } = await http.patch(`/booking/${bookingId}/installments/${installmentId}`, { paid });
    return data?.data;
  },

  // Locked (409) once the first installment has been marked paid - see
  // updateBookingAddOns in the backend.
  updateAddOns: async (bookingId, addOnIds) => {
    const { data } = await http.patch(`/booking/${bookingId}/add-ons`, { addOnIds });
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

  // SuperAdmin user management. create/resetPassword return
  // { user, credentials: { loginUrl, email, tempPassword } } - shown once.
  create: async (body) => {
    const { data } = await http.post("/user", body);
    return data?.data;
  },

  update: async (userId, body) => {
    const { data } = await http.patch(`/user/${userId}`, body);
    return data?.data;
  },

  resetPassword: async (userId) => {
    const { data } = await http.post(`/user/${userId}/reset-password`);
    return data?.data;
  },

  remove: async (userId) => {
    const { data } = await http.delete(`/user/${userId}`);
    return data;
  },

  emailCredentials: async (userId, body) => {
    const { data } = await http.post(`/user/${userId}/email-credentials`, body);
    return data?.data;
  },

  getUserBookings: async (userId, params = {}) => {
    const { data } = await http.get(`/user/${userId}/bookings`, { params });
    return data?.data || { bookings: [], pagination: {} };
  },
};

// Trusted renters (private-property invitations and grants)
export const invitesApi = {
  // Returns the invitation plus its one-time `inviteUrl`.
  create: async (body) => {
    const { data } = await http.post("/invite", body);
    return data?.data;
  },
  listInvites: async () => {
    const { data } = await http.get("/invite");
    return data?.data || [];
  },
  cancelInvite: async (id) => {
    const { data } = await http.delete(`/invite/${id}`);
    return data;
  },
  listGrants: async () => {
    const { data } = await http.get("/invite/grants");
    return data?.data || [];
  },
  revokeGrant: async (id) => {
    const { data } = await http.delete(`/invite/grants/${id}`);
    return data;
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

export default http;


// Email (Gmail connection) APIs
export const emailApi = {
  status: async () => {
    const { data } = await http.get("/email/status");
    return data?.data;
  },
  // Returns the Google consent URL to send the browser to.
  startGoogle: async () => {
    const { data } = await http.post("/email/google/start");
    return data?.data?.url;
  },
  test: async () => {
    const { data } = await http.post("/email/test");
    return data?.data;
  },
  disconnect: async () => {
    const { data } = await http.delete("/email/connection");
    return data;
  },
};

// Homepage content APIs
export const siteContentApi = {
  get: async () => {
    const { data } = await http.get("/site-content");
    return data?.data;
  },
  save: async (section, body) => {
    const { data } = await http.put(`/site-content/${section}`, body);
    return data?.data;
  },
  reset: async (section) => {
    const { data } = await http.delete(`/site-content/${section}`);
    return data?.data;
  },
  uploadImage: async (file) => {
    const fd = new FormData();
    fd.append("image", file);
    const { data } = await http.post("/site-content/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.data?.url;
  },
};
