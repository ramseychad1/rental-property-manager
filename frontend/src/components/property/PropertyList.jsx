"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PropertyCard from "@/components/property/PropertyCard";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";

// The server renders the public list (no session cookie reaches the Next
// server when the API is on another domain). Once we know someone is signed
// in, refetch from the browser - where the session cookie is sent - so
// private properties they've been invited to appear too.
export default function PropertyList({ initialProperties, emptyMessage }) {
  const { user } = useAuth();
  const [properties, setProperties] = useState(initialProperties);
  const userId = user?._id ?? null;

  useEffect(() => {
    if (!userId) {
      setProperties(initialProperties);
      return undefined;
    }
    let cancelled = false;
    api
      .listProperties()
      .then((d) => !cancelled && setProperties(d.data ?? []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, initialProperties]);

  if (properties.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-[var(--color-muted-foreground)]">{emptyMessage}</p>
        <p className="mt-2 text-[var(--color-muted-foreground)]" data-testid="invite-only-note">
          {user
            ? "Some properties are available by invite only."
            : "Some properties are available by invite only. Sign in to see properties you have been invited to."}
        </p>
        {!user && (
          <Button asChild className="mt-6" data-testid="empty-sign-in">
            <Link href="/login">Sign In</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {properties.map((property) => (
        <PropertyCard key={property._id} property={property} />
      ))}
    </div>
  );
}
