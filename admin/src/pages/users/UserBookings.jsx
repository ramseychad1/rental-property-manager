import { useQuery } from "@tanstack/react-query";
import { Calendar, DollarSign, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/common/StatusBadge";
import { usersApi } from "@/lib/api";
import { fmtCurrency, fmtDate, fmtNights } from "@/lib/formatters";

export default function UserBookings({ userId }) {
  const { data, isLoading } = useQuery({
    queryKey: ["user-bookings", userId],
    queryFn: () => usersApi.getUserBookings(userId),
    enabled: !!userId,
  });
  const bookings = data?.bookings || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No bookings found for this user.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {bookings.map((b) => (
          <Card key={b._id} className="p-4 rounded-xl space-y-3">
            {/* Top row: booking ID + statuses */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                {b.bookingId}
              </span>
              <div className="flex items-center gap-1.5">
                <StatusBadge status={b.bookingStatus} />
                <StatusBadge status={b.paymentStatus} />
              </div>
            </div>

            {/* Property */}
            {b.propertyId?.title && (
              <div className="text-sm font-medium truncate">
                {b.propertyId.title}
              </div>
            )}

            {/* Dates + amount */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span className="font-mono">
                  {fmtDate(b.checkIn, "MMM d")} →{" "}
                  {fmtDate(b.checkOut, "MMM d, yyyy")}
                </span>
                <span>· {fmtNights(b.totalNights)}</span>
              </div>
              <div className="flex items-center gap-1 font-mono font-semibold text-foreground">
                <DollarSign className="w-3 h-3" />
                {fmtCurrency(b.totalAmount)}
              </div>
            </div>

            {/* Cancelled reason if any */}
            {b.bookingStatus === "cancelled" && b.cancellationReason && (
              <div className="text-xs space-y-2 bg-muted rounded-lg px-3 py-2 text-muted-foreground">
                {b.cancelledBy && (
                  <p>
                    <span className="font-medium text-foreground">
                      Cancelled By:
                    </span>
                    <span className="ml-1"> {b.cancelledBy}</span>
                  </p>
                )}

                {b.cancellationReason && (
                  <p>
                    <span className="font-medium text-foreground">
                      Reason:{" "}
                    </span>
                    <span className="ml-1"> {b.cancellationReason}</span>
                  </p>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
