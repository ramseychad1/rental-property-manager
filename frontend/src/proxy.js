import { NextResponse } from "next/server";

// Two jobs, both about telling the backend which complex a request is for
// (see backend/src/middleware/site.js):
//
// 1. Pass along the public hostname the browser used (x-site-host). The /api
//    rewrite in next.config.mjs forwards request headers set here.
// 2. Preview mode: on a shared host, /c/<slug> remembers a complex in a cookie
//    and redirects to the normal URL, so one address can show several
//    complexes. /c/_exit clears it. The backend applies the same host rule
//    (SITE_PREVIEW_HOSTS) before honoring it.
const PREVIEW_COOKIE = "rpm_preview";
const PREVIEW_DAYS = 7;

const hostOnly = (h) => (h || "").trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");

function isPreviewHost(host) {
  const h = hostOnly(host);
  if (!h) return false;
  if (h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost")) return true;
  return (process.env.SITE_PREVIEW_HOSTS || "")
    .split(",")
    .map(hostOnly)
    .filter(Boolean)
    .includes(h);
}

export function proxy(request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const preview = isPreviewHost(host);
  const { pathname } = request.nextUrl;

  const entry = pathname.match(/^\/c\/([^/]+)(\/.*)?$/);
  if (entry && preview) {
    const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
    const response = NextResponse.redirect(new URL(entry[2] || "/", `${proto}://${host}`));
    if (entry[1] === "_exit") {
      response.cookies.delete(PREVIEW_COOKIE);
    } else {
      response.cookies.set(PREVIEW_COOKIE, entry[1].toLowerCase(), {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: proto === "https",
        maxAge: PREVIEW_DAYS * 86_400,
      });
    }
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  if (host) requestHeaders.set("x-site-host", host);
  else requestHeaders.delete("x-site-host");

  // Never trust a slug sent by the client; only the preview cookie sets it.
  requestHeaders.delete("x-site-slug");
  const slug = preview ? request.cookies.get(PREVIEW_COOKIE)?.value : null;
  if (slug) requestHeaders.set("x-site-slug", slug);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Pages and API calls; not static files.
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)"],
};
