// The complex a Super Admin is working in (null = all complexes). Sent to the
// API as X-Site-Id; the API ignores it for everyone else.
const KEY = "rpm_active_site";

export function getActiveSiteId() {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

export function setActiveSiteId(id) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: selection just won't persist */
  }
}
