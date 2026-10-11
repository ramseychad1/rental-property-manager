import { NextResponse } from "next/server";

// Tells the backend which public hostname the browser used, so it can pick the
// right complex (see backend/src/middleware/site.js). The /api rewrite in
// next.config.mjs forwards request headers set here to the backend. Without
// this the backend only sees the frontend's own server as the caller.
export function proxy(request) {
  const requestHeaders = new Headers(request.headers);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) requestHeaders.set("x-site-host", host);
  else requestHeaders.delete("x-site-host");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: "/api/:path*",
};
