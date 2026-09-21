"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";

// Landing page for an owner's invitation link. Signed-out visitors are sent to
// create an account / sign in and come straight back here (via ?next=), at
// which point the invitation is claimed automatically.
export default function InvitePage({ params }) {
  const { token } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [invite, setInvite] = useState(null); // { ownerName, email }
  const [state, setState] = useState("loading"); // loading | ready | claiming | invalid | error
  const [message, setMessage] = useState("");
  const claimed = useRef(false);

  useEffect(() => {
    let cancelled = false;
    api
      .previewInvite(token)
      .then((d) => {
        if (cancelled) return;
        setInvite(d.data);
        setState("ready");
      })
      .catch(() => {
        // Already claimed by this same signed-in user? Claiming again is
        // idempotent, so let the claim effect below decide.
        if (!cancelled) setState("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (authLoading || !user || claimed.current) return;
    if (state !== "ready" && state !== "invalid") return;
    claimed.current = true;
    setState("claiming");
    api
      .claimInvite(token)
      .then((d) => {
        toast.success(`You now have access to ${d.data?.ownerName || "the owner"}'s private properties.`);
        router.replace("/properties");
      })
      .catch((err) => {
        setMessage(err.message || "This invitation is no longer valid.");
        setState("error");
      });
  }, [authLoading, user, state, token, router]);

  const next = encodeURIComponent(`/invite/${token}`);
  const emailParam = invite?.email ? `&email=${encodeURIComponent(invite.email)}` : "";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center px-5 py-16" data-testid="invite-page">
      <div className="w-full rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center shadow-sm">
        {(state === "loading" || state === "claiming" || authLoading) && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {state === "claiming" ? "Accepting your invitation…" : "Loading your invitation…"}
            </p>
          </div>
        )}

        {state === "ready" && !authLoading && !user && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)]">
              <MailCheck className="h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl font-bold">You&apos;re invited</h1>
            <p className="mt-3 text-[var(--color-muted-foreground)]">
              <strong>{invite.ownerName}</strong> has invited you to view and request stays at their private
              properties. Create an account, or sign in if you already have one, to accept.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button asChild size="lg" data-testid="invite-signup">
                <Link href={`/signup?next=${next}${emailParam}`}>Create an account</Link>
              </Button>
              <Button asChild size="lg" variant="outline" data-testid="invite-login">
                <Link href={`/login?next=${next}`}>I already have an account</Link>
              </Button>
            </div>
          </>
        )}

        {(state === "invalid" && !authLoading && !user) || state === "error" ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)]">
              <ShieldX className="h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl font-bold">Invitation unavailable</h1>
            <p className="mt-3 text-[var(--color-muted-foreground)]">
              {message || "This invitation has expired, was cancelled, or has already been used."} Ask the owner
              to send you a new one.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link href="/properties">Browse properties</Link>
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
