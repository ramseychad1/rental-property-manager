"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";

export const PENDING_INVITE_KEY = "pending_invite";

// The invite page remembers its token while the visitor signs up / signs in.
// Whichever page they land on afterwards (signup and login redirect in
// different ways), this claims it as soon as there is a signed-in user, so an
// invitation is never lost to a redirect.
export default function PendingInviteClaimer() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const userId = user?._id ?? null;

  useEffect(() => {
    // The invite page claims for itself.
    if (!userId || pathname?.startsWith("/invite/")) return;
    let token = null;
    try {
      token = sessionStorage.getItem(PENDING_INVITE_KEY);
    } catch {}
    if (!token) return;
    try {
      sessionStorage.removeItem(PENDING_INVITE_KEY);
    } catch {}

    api
      .claimInvite(token)
      .then((d) => {
        toast.success(`You now have access to ${d.data?.ownerName || "the owner"}'s private properties.`);
        router.replace("/properties");
      })
      .catch((err) => {
        // Not actually signed in (e.g. cookies blocked): keep the token so the
        // next real sign-in can still claim it.
        if (err.status === 401) {
          try {
            sessionStorage.setItem(PENDING_INVITE_KEY, token);
          } catch {}
          toast.error("We couldn't confirm your sign-in. If you're in a private window, allow cookies for this site and sign in again.");
          return;
        }
        // Owner opening their own link, or an expired/used link: nothing to do
        // beyond telling the person once.
        if (err.details?.code !== "OWN_INVITE") toast.error(err.message || "That invitation is no longer valid.");
      });
  }, [userId, pathname, router]);

  return null;
}
