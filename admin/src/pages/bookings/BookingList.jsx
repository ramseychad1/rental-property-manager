import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  Eye,
  Loader2,
  RefreshCw,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/common/PageHeader";
import StatusBadge from "@/components/common/StatusBadge";
import EmptyState from "@/components/common/EmptyState";
import DataToolbar, { SearchInput } from "@/components/common/DataToolbar";
import Pagination from "@/components/common/Pagination";
import CancelBookingDialog from "@/components/Models/CancelBookingDialog";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bookingsApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { vertical } from "@/config/vertical";
import { fmtCurrency, fmtDate, fmtNights } from "@/lib/formatters";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const LIMIT = 10;

function BookingSkeleton() {
  return Array.from({ length: 6 }).map((_, row) => (
    <TableRow key={row}>
      {Array.from({ length: 8 }).map((_, cell) => (
        <TableCell key={cell}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

export default function BookingListPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [active, setActive] = useState(null);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const bookingParams = useMemo(
    () => ({
      page,
      limit: LIMIT,
      ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
      ...(bookingStatus !== "all" && { bookingStatus }),
      ...(paymentStatus !== "all" && { paymentStatus }),
    }),
    [bookingStatus, debouncedSearch, page, paymentStatus],
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: queryKeys.bookings(bookingParams),
    queryFn: () => bookingsApi.list(bookingParams),
    placeholderData: (previous) => previous,
    staleTime: 20_000,
  });
console.log(data)
  const bookings = data?.bookings || [];
  const pagination = data?.pagination || {};
  const totalCount = pagination.totalCount || 0;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, bookingStatus, paymentStatus]);

  const updateCachedActive = (booking) => {
    setActive((current) => (current ? { ...current, ...booking } : current));
  };

  const mutationOptions = (successMessage) => ({
    onSuccess: (booking) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      updateCachedActive(booking);
      toast.success(successMessage);
    },
    onError: (error) => {
      toast.error(error?.normalizedMessage || "Booking action failed");
    },
  });

  const accept = useMutation({
    mutationFn: (id) => bookingsApi.accept(id),
    ...mutationOptions("Booking accepted"),
  });

  const reject = useMutation({
    mutationFn: (id) => bookingsApi.reject(id),
    ...mutationOptions("Booking rejected"),
  });

  const pay = useMutation({
    mutationFn: ({ id, status }) => bookingsApi.setPayment(id, status),
    ...mutationOptions("Payment status updated"),
  });

  const cancel = useMutation({
    mutationFn: ({ id, cancelledBy, cancellationReason }) =>
      bookingsApi.cancel(id, cancelledBy, cancellationReason),
    onSuccess: (booking) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      updateCachedActive(booking);
      setCancelDialog(false);
      setCancelTargetId(null);
      toast.success("Booking cancelled");
    },
    onError: (error) => {
      toast.error(error?.normalizedMessage || "Failed to cancel booking");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={vertical.copy.bookings}
        subtitle={`${totalCount} ${vertical.copy.bookings.toLowerCase()} across all ${vertical.item.plural.toLowerCase()}.`}
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
        }
      />

      <DataToolbar>
        <SearchInput
          testid="bookings-search"
          value={search}
          onChange={setSearch}
          placeholder="Search guest, email, booking ID, or property..."
        />
        <Select value={bookingStatus} onValueChange={setBookingStatus}>
          <SelectTrigger
            data-testid="bookings-status-filter"
            className="w-full md:w-44 h-10"
          >
            <SelectValue placeholder="Booking status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All bookings</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
          <SelectTrigger
            data-testid="bookings-payment-filter"
            className="w-full md:w-44 h-10"
          >
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </DataToolbar>

      <Card className="rounded-xl overflow-x-auto p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="overline">Booking</TableHead>
              <TableHead className="overline">User</TableHead>
              <TableHead className="overline">{vertical.item.singular}</TableHead>
              <TableHead className="overline">Stay</TableHead>
              <TableHead className="overline">Total</TableHead>
              <TableHead className="overline">Booking</TableHead>
              <TableHead className="overline">Payment</TableHead>
              <TableHead className="overline text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <BookingSkeleton />
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    icon={Calendar}
                    title="No bookings found"
                    description="Try clearing filters."
                  />
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow
                  key={booking._id}
                  data-testid={`booking-row-${booking._id}`}
                  onClick={() => setActive(booking)}
                  className="cursor-pointer whitespace-nowrap"
                >
                  <TableCell>
                    <span className="font-mono text-xs font-semibold">
                      {booking.bookingId}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={booking.userId?.picture}
                          alt={booking.userId?.name || "Guest"}
                        />
                        <AvatarFallback>
                          {booking.userId?.name?.[0] || booking.guestInfo?.name?.[0] || "G"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          {booking.userId?.name || booking.guestInfo?.name || "Guest"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {booking.userId?.email || booking.guestInfo?.email || "-"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {booking.propertyId?.title || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-mono">
                      {fmtDate(booking.checkIn, "MMM d")} to{" "}
                      {fmtDate(booking.checkOut, "MMM d")}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {fmtNights(booking.totalNights)} - {booking.guests} guests
                    </div>
                  </TableCell>
                  <TableCell className="font-mono font-semibold">
                    {fmtCurrency(booking.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={booking.bookingStatus} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={booking.paymentStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      data-testid={`booking-view-${booking._id}`}
                      size="icon"
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActive(booking);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination pagination={pagination} page={page} onPageChange={setPage} />

      <Sheet open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <SheetContent
          data-testid="booking-detail-sheet"
          className="sm:max-w-lg w-full overflow-y-auto"
        >
          {active && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 font-display">
                  <span className="font-mono text-base">{active.bookingId}</span>
                </SheetTitle>
                <SheetDescription className="text-left">
                  Created {fmtDate(active.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <Card className="p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage
                        src={active.userId?.picture}
                        alt={active.userId?.name || "Guest"}
                      />
                      <AvatarFallback>
                        {active.userId?.name?.[0] || active.guestInfo?.name?.[0] || "G"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-semibold">
                        {active.userId?.name || active.guestInfo?.name || "Guest"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {active.userId?.email || active.guestInfo?.email || "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {active.guestInfo?.phone || "-"} - {active.guestInfo?.country || "-"}
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-4 rounded-xl">
                    <div className="overline flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Check-in
                    </div>
                    <div className="mt-1 font-mono font-semibold text-sm">
                      {fmtDate(active.checkIn)}
                    </div>
                  </Card>
                  <Card className="p-4 rounded-xl">
                    <div className="overline flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Check-out
                    </div>
                    <div className="mt-1 font-mono font-semibold text-sm">
                      {fmtDate(active.checkOut)}
                    </div>
                  </Card>
                  <Card className="p-4 rounded-xl">
                    <div className="overline flex items-center gap-1">
                      <UserIcon className="w-3 h-3" /> Guests
                    </div>
                    <div className="mt-1 font-semibold text-sm">{active.guests}</div>
                  </Card>
                  <Card className="p-4 rounded-xl">
                    <div className="overline flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Total
                    </div>
                    <div className="mt-1 font-mono font-semibold text-sm">
                      {fmtCurrency(active.totalAmount)}
                    </div>
                  </Card>
                </div>

                {active.specialRequests && (
                  <Card className="p-4 rounded-xl">
                    <div className="overline mb-1">Special requests</div>
                    <p className="text-sm">{active.specialRequests}</p>
                  </Card>
                )}

                <Card className="p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="overline">Booking</span>
                    <StatusBadge status={active.bookingStatus} />
                  </div>

                  {active.bookingStatus === "pending" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => accept.mutate(active._id)}
                        disabled={accept.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Accept
                      </Button>
                      <Button
                        onClick={() => reject.mutate(active._id)}
                        disabled={reject.isPending}
                        variant="outline"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </Button>
                    </div>
                  )}

                  {(active.bookingStatus === "accepted" ||
                    active.bookingStatus === "booked") && (
                    <Button
                      onClick={() => {
                        setCancelTargetId(active._id);
                        setCancelDialog(true);
                      }}
                      variant="destructive"
                      className="w-full"
                    >
                      Cancel booking
                    </Button>
                  )}
                </Card>

                {active.bookingStatus !== "pending" &&
                  active.bookingStatus !== "rejected" && (
                    <Card className="p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="overline">Payment</span>
                        <StatusBadge status={active.paymentStatus} />
                      </div>

                      {active.paymentStatus === "pending" &&
                        active.bookingStatus !== "cancelled" && (
                          <Button
                            onClick={() =>
                              pay.mutate({ id: active._id, status: "paid" })
                            }
                            disabled={pay.isPending}
                            className="w-full"
                          >
                            Mark as Paid
                          </Button>
                        )}

                      {active.paymentStatus === "paid" && (
                        <Button
                          onClick={() =>
                            pay.mutate({ id: active._id, status: "refunded" })
                          }
                          disabled={pay.isPending}
                          variant="outline"
                          className="w-full"
                        >
                          Refund Payment
                        </Button>
                      )}
                    </Card>
                  )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <CancelBookingDialog
        open={cancelDialog}
        onOpenChange={(open) => {
          setCancelDialog(open);
          if (!open) setCancelTargetId(null);
        }}
        isPending={cancel.isPending}
        onConfirm={({ cancelledBy, cancellationReason }) => {
          cancel.mutate({
            id: cancelTargetId,
            cancelledBy,
            cancellationReason,
          });
        }}
      />
    </div>
  );
}
