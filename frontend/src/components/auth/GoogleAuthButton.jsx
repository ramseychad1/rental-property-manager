"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";

// Isolated so the underlying useGoogleLogin hook (which calls Google's
// initCodeClient with client_id on mount, no guard for a missing one) is
// only ever invoked when a real NEXT_PUBLIC_GOOGLE_CLIENT_ID is configured.
// Render this conditionally - never unconditionally alongside plain
// email/password auth.
export function GoogleAuthButton({ setLoading, router, next, loading, className }) {
  const handleGoogleAuth = useGoogleAuth({ setLoading, router, next });

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className={className}
      onClick={() => handleGoogleAuth()}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        "Continue with Google"
      )}
    </Button>
  );
}
