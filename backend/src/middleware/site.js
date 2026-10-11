import { resolveSiteForHosts } from "../lib/siteResolver.js";

// Sets req.site to the complex the request is for.
//
// Host candidates, in order:
//  1. X-Site-Host - the public hostname the browser used. The frontend's proxy
//     sets it for browser calls, and its server-side fetches set it explicitly.
//     A client can send it directly too; that only selects which complex's
//     *public* data it sees. Authorization never trusts it (it comes from the
//     user's membership).
//  2. Origin - the calling site's host (admin panel, direct browser calls).
//
// Soft mode: with no match, req.site is the default complex and
// req.siteMatched is false. Strict handling of unknown hosts comes with
// scoping.
export async function resolveSite(req, _res, next) {
  try {
    const origin = req.get("origin");
    const { site, matched } = await resolveSiteForHosts([req.get("x-site-host"), origin]);
    req.site = site;
    req.siteMatched = matched;
    next();
  } catch (err) {
    next(err);
  }
}
