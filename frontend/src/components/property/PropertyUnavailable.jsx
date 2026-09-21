"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

// Shown when a property can't be viewed - it doesn't exist, is inactive, or is
// private and this visitor has no invitation. Deliberately identical for all
// of those so nobody can tell whether a private property exists.
export default function PropertyUnavailable() {
  const { user, loading } = useAuth();
  const next = typeof window !== "undefined" ? window.location.pathname : "/properties";

  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center" data-testid="property-unavailable">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[var(--color-primary)]">
        <Lock className="h-7 w-7" />
      </div>
      <h1 className="font-display text-3xl font-bold">This listing isn&apos;t available</h1>
      <p className="mt-3 text-[var(--color-muted-foreground)]">
        It may have been removed, or it may be a private listing shared by invitation only.
        {!user && !loading
          ? " If you were invited, sign in with the account you used to accept the invitation."
          : " If you were invited, open the invitation link from your email again, or ask the owner to resend it."}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        {!user && !loading && (
          <Button asChild size="lg">
            <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
          </Button>
        )}
        <Button asChild size="lg" variant={!user && !loading ? "outline" : "default"}>
          <Link href="/properties">Browse properties</Link>
        </Button>
      </div>
    </div>
  );
}
