import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  Home,
  RefreshCw,
  Users as UsersIcon,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import DataToolbar from "@/components/common/DataToolbar";
import KpiCard from "@/components/common/KpiCard";
import PageHeader from "@/components/common/PageHeader";
import StatusBadge from "@/components/common/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dashboardApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { vertical } from "@/config/vertical";
import { fmtCurrency, fmtDate, fmtNumber } from "@/lib/formatters";

const PIE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const currentMonth = () => new Date().toISOString().slice(0, 7);
const currentYear = () => String(new Date().getFullYear());

export default function DashboardPage() {
  const [range, setRange] = useState("last_8_months");
  const [month, setMonth] = useState(currentMonth());
  const [year, setYear] = useState(currentYear());

  const params = useMemo(
    () => ({
      range,
      ...(range === "month" && { month }),
      ...(range === "year" && { year }),
    }),
    [month, range, year],
  );

  const analytics = useQuery({
    queryKey: queryKeys.dashboardAnalytics(params),
    queryFn: () => dashboardApi.analytics(params),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const data = analytics.data;
  const summary = data?.summary || {};
  const series = data?.charts?.series || [];
  const statusDist = data?.charts?.bookingStatus || [];
  const recentBookings = data?.recentBookings || [];
  const loading = analytics.isLoading;
  const periodLabel = data?.filters?.label || "Selected period";

  const totalChartRevenue = series.reduce((sum, row) => sum + row.revenue, 0);
  const totalChartBookings = series.reduce((sum, row) => sum + row.bookings, 0);

  return (
    <div data-testid="dashboard-page" className="space-y-7">
      <PageHeader
        title="Panel Overview"
        subtitle={`Real booking analytics for ${periodLabel.toLowerCase()}.`}
        actions={
          <Button
            variant="outline"
            onClick={() => analytics.refetch()}
            disabled={analytics.isFetching}
          >
            <RefreshCw
              className={analytics.isFetching ? "w-4 h-4 animate-spin" : "w-4 h-4"}
            />
            Refresh
          </Button>
        }
      />

      <DataToolbar>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="h-10 w-full md:w-56">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_8_months">Last 8 months</SelectItem>
            <SelectItem value="this_month">This month</SelectItem>
            <SelectItem value="last_month">Last month</SelectItem>
            <SelectItem value="month">Specific month</SelectItem>
            <SelectItem value="this_year">This year</SelectItem>
            <SelectItem value="last_year">Last year</SelectItem>
            <SelectItem value="year">Specific year</SelectItem>
          </SelectContent>
        </Select>

        {range === "month" && (
          <Input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="h-10 w-full md:w-44"
          />
        )}

        {range === "year" && (
          <Input
            type="number"
            min="2000"
            max="2100"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="h-10 w-full md:w-32"
          />
        )}
      </DataToolbar>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          testid="kpi-items"
          label={`Total ${vertical.item.plural}`}
          value={loading ? "-" : fmtNumber(summary.totalProperties)}
          icon={Home}
          hint={`${fmtNumber(summary.activeProperties)} active listings`}
        />
        <KpiCard
          testid="kpi-bookings"
          label={`Period ${vertical.copy.bookings}`}
          value={loading ? "-" : fmtNumber(summary.totalBookings)}
          icon={CalendarCheck2}
          hint={`${fmtNumber(summary.pendingBookings)} pending review`}
        />
        <KpiCard
          testid="kpi-users"
          label="Total Users"
          value={loading ? "-" : fmtNumber(summary.totalUsers)}
          icon={UsersIcon}
          hint="Registered accounts"
        />
        <KpiCard
          testid="kpi-revenue"
          label="Paid Revenue"
          value={loading ? "-" : fmtCurrency(summary.totalRevenue)}
          icon={Wallet}
          accent
          hint="Only paid bookings included"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 rounded-xl">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="overline">Revenue</span>
              <h3 className="font-display text-lg font-semibold">
                {periodLabel}
              </h3>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl font-bold">
                {fmtCurrency(totalChartRevenue)}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Paid revenue
              </div>
            </div>
          </div>
          <div className="h-[260px]">
            {loading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ left: -10, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--color-brand)"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--color-brand)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(value) => fmtCurrency(value)} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-brand)"
                    strokeWidth={2.5}
                    fill="url(#rev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5 rounded-xl">
          <div className="mb-4">
            <span className="overline">{vertical.copy.bookings} status</span>
            <h3 className="font-display text-lg font-semibold">Distribution</h3>
          </div>
          {loading ? (
            <Skeleton className="h-[240px] w-full rounded-lg" />
          ) : statusDist.length !== 0 ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDist}
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {statusDist.map((_, index) => (
                      <Cell
                        key={index}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={28} iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[240px] grid place-items-center text-sm text-muted-foreground">
              No bookings found
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5 rounded-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="overline">{vertical.copy.bookings}</span>
            <h3 className="font-display text-lg font-semibold">
              Booking volume
            </h3>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-bold">
              {fmtNumber(totalChartBookings)}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Total bookings
            </div>
          </div>
        </div>
        <div className="h-[230px]">
          {loading ? (
            <Skeleton className="h-full w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar
                  dataKey="bookings"
                  fill="var(--color-foreground)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <span className="overline">Activity</span>
            <h3 className="font-display text-lg font-semibold">
              Recent {vertical.copy.bookings.toLowerCase()}
            </h3>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/bookings" className="gap-1 text-xs">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="overline">User</TableHead>
              <TableHead className="overline">{vertical.item.singular}</TableHead>
              <TableHead className="overline">
                <CalendarDays className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                Check-in
              </TableHead>
              <TableHead className="overline">Total</TableHead>
              <TableHead className="overline">Booking</TableHead>
              <TableHead className="overline">Payment</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, row) => (
                <TableRow key={row}>
                  {Array.from({ length: 6 }).map((_, cell) => (
                    <TableCell key={cell}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : recentBookings.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No recent bookings in this period
                </TableCell>
              </TableRow>
            ) : (
              recentBookings.map((booking) => (
                <TableRow
                  key={booking._id}
                  data-testid={`recent-booking-${booking._id}`}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarImage
                          src={booking.userId?.picture}
                          alt={booking.userId?.name || "User"}
                        />
                        <AvatarFallback>
                          {booking.userId?.name?.[0] ||
                            booking.guestInfo?.name?.[0] ||
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          {booking.userId?.name ||
                            booking.guestInfo?.name ||
                            "Guest"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {booking.userId?.email ||
                            booking.guestInfo?.email ||
                            "-"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {booking.propertyId?.title || "-"}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                    {fmtDate(booking.checkIn)}
                  </TableCell>
                  <TableCell className="text-sm font-semibold font-mono">
                    {fmtCurrency(booking.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={booking.bookingStatus} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={booking.paymentStatus} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
