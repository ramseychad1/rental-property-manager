import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Eye,
  FilterX,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/common/PageHeader";
import DataToolbar, { SearchInput } from "@/components/common/DataToolbar";
import EmptyState from "@/components/common/EmptyState";
import Pagination from "@/components/common/Pagination";
import ConfirmDialog from "@/components/common/ConfirmDialog";

import { Badge } from "@/components/ui/badge";
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
import { errorLogsApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { fmtDate, fmtRelative } from "@/lib/formatters";

const LIMIT = 20;

const severityClass = {
  info: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  warning:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  error: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  critical:
    "border-red-600/30 bg-red-600/10 text-red-700 dark:text-red-300",
};

const statusClass = (statusCode) => {
  if (statusCode >= 500) return "destructive";
  if (statusCode >= 400) return "secondary";
  return "outline";
};

const compactJson = (value) => {
  if (!value || (typeof value === "object" && Object.keys(value).length === 0)) {
    return "None";
  }

  return JSON.stringify(value, null, 2);
};

function ErrorLogSkeleton() {
  return Array.from({ length: 8 }).map((_, row) => (
    <TableRow key={row}>
      {Array.from({ length: 8 }).map((_, cell) => (
        <TableCell key={cell}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

export default function ErrorLogsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [path, setPath] = useState("");
  const [severity, setSeverity] = useState("all");
  const [method, setMethod] = useState("all");
  const [statusCode, setStatusCode] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteFilteredOpen, setDeleteFilteredOpen] = useState(false);

  const params = useMemo(
    () => ({
      page,
      limit: LIMIT,
      ...(path.trim() && { path: path.trim() }),
      ...(severity !== "all" && { severity }),
      ...(method !== "all" && { method }),
      ...(statusCode.trim() && { statusCode: statusCode.trim() }),
    }),
    [method, page, path, severity, statusCode],
  );

  const { data, isFetching, isLoading, refetch } = useQuery({
    queryKey: queryKeys.errorLogs(params),
    queryFn: () => errorLogsApi.list(params),
    staleTime: 20_000,
    placeholderData: (previous) => previous,
  });

  const { data: activeLog, isFetching: isFetchingActive } = useQuery({
    queryKey: queryKeys.errorLog(activeId),
    queryFn: () => errorLogsApi.get(activeId),
    enabled: !!activeId,
    staleTime: 60_000,
  });

  const logs = data?.errors || [];
  const pagination = data?.pagination || {};

  useEffect(() => {
    setPage(1);
  }, [path, severity, method, statusCode]);

  const remove = useMutation({
    mutationFn: (id) => errorLogsApi.remove(id),
    onSuccess: () => {
      toast.success("Error log deleted");
      setDeleteTarget(null);
      setActiveId(null);
      qc.invalidateQueries({ queryKey: ["errorLogs"] });
    },
    onError: (error) => {
      toast.error(error?.normalizedMessage || "Failed to delete error log");
    },
  });

  const removeFiltered = useMutation({
    mutationFn: () => {
      const body = {
        ...(severity !== "all" && { severity }),
        ...(statusCode.trim() && { statusCode: statusCode.trim() }),
      };

      return errorLogsApi.removeMany(body);
    },
    onSuccess: (result) => {
      toast.success(`${result.deletedCount || 0} error logs deleted`);
      setDeleteFilteredOpen(false);
      qc.invalidateQueries({ queryKey: ["errorLogs"] });
    },
    onError: (error) => {
      toast.error(error?.normalizedMessage || "Failed to delete error logs");
    },
  });

  const resetFilters = () => {
    setPath("");
    setSeverity("all");
    setMethod("all");
    setStatusCode("");
  };

  const canDeleteFiltered = severity !== "all" || statusCode.trim();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Error Logs"
        subtitle="Read, filter, inspect, and clean backend error records."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh
            </Button>
            <Button
              variant="destructive"
              disabled={!canDeleteFiltered || removeFiltered.isPending}
              onClick={() => setDeleteFilteredOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              Delete filtered
            </Button>
          </div>
        }
      />

      <DataToolbar>
        <SearchInput
          testid="error-logs-path-filter"
          value={path}
          onChange={setPath}
          placeholder="Filter request path..."
        />
        <Input
          data-testid="error-logs-status-filter"
          value={statusCode}
          onChange={(event) => setStatusCode(event.target.value.replace(/\D/g, ""))}
          placeholder="Status code"
          inputMode="numeric"
          className="h-10 md:w-36"
        />
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="h-10 w-full md:w-40">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severity</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="h-10 w-full md:w-36">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={resetFilters}>
          <FilterX className="w-4 h-4" />
          Clear
        </Button>
      </DataToolbar>

      <Card className="rounded-xl overflow-x-auto p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="overline">Time</TableHead>
              <TableHead className="overline">Status</TableHead>
              <TableHead className="overline">Severity</TableHead>
              <TableHead className="overline">Method</TableHead>
              <TableHead className="overline">Path</TableHead>
              <TableHead className="overline">Message</TableHead>
              <TableHead className="overline">User</TableHead>
              <TableHead className="overline text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <ErrorLogSkeleton />
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    icon={AlertTriangle}
                    title="No error logs found"
                    description="Try changing filters or refresh after new backend errors occur."
                  />
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow
                  key={log._id}
                  className="cursor-pointer"
                  data-testid={`error-log-row-${log._id}`}
                  onClick={() => setActiveId(log._id)}
                >
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm font-medium">
                      {fmtRelative(log.createdAt)}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {fmtDate(log.createdAt, "MMM d, h:mm a")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusClass(log.statusCode)}>
                      {log.statusCode}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={severityClass[log.severity] || severityClass.error}
                    >
                      {log.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.request?.method || "-"}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate font-mono text-xs">
                    {log.request?.path || log.request?.originalUrl || "-"}
                  </TableCell>
                  <TableCell className="max-w-[360px] truncate">
                    {log.message}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                    {log.user?.email || "Anonymous"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveId(log._id);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget(log);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination
        pagination={pagination}
        page={page}
        onPageChange={setPage}
      />

      <Sheet open={!!activeId} onOpenChange={(open) => !open && setActiveId(null)}>
        <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
          {isFetchingActive ? (
            <div className="grid place-items-center min-h-[45vh]">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeLog ? (
            <>
              <SheetHeader>
                <SheetTitle className="font-display">Error detail</SheetTitle>
                <SheetDescription className="font-mono text-xs break-all">
                  {activeLog._id}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <Card className="p-4 rounded-xl space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={statusClass(activeLog.statusCode)}>
                      {activeLog.statusCode} {activeLog.statusText}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        severityClass[activeLog.severity] || severityClass.error
                      }
                    >
                      {activeLog.severity}
                    </Badge>
                    {activeLog.code && (
                      <Badge variant="outline">{activeLog.code}</Badge>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{activeLog.message}</p>
                </Card>

                <Card className="p-4 rounded-xl">
                  <div className="overline mb-3">Request</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Method</span>
                      <div className="font-mono">{activeLog.request?.method}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Path</span>
                      <div className="font-mono break-all">
                        {activeLog.request?.originalUrl}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">IP</span>
                      <div className="font-mono">{activeLog.request?.ip || "-"}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">User</span>
                      <div className="font-mono break-all">
                        {activeLog.user?.email || "Anonymous"}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 rounded-xl">
                  <div className="overline mb-3">Payload</div>
                  <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs">
                    {compactJson({
                      params: activeLog.request?.params,
                      query: activeLog.request?.query,
                      body: activeLog.request?.body,
                      details: activeLog.details,
                    })}
                  </pre>
                </Card>

                <Card className="p-4 rounded-xl">
                  <div className="overline mb-3">Stack</div>
                  <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">
                    {activeLog.stack || "No stack trace recorded."}
                  </pre>
                </Card>

                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setDeleteTarget(activeLog)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete this error log
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this error log?"
        description={deleteTarget?.message || "This log will be permanently removed."}
        destructive
        confirmLabel={remove.isPending ? "Deleting..." : "Delete"}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget._id)}
      />

      <ConfirmDialog
        open={deleteFilteredOpen}
        onOpenChange={setDeleteFilteredOpen}
        title="Delete filtered error logs?"
        description="Only logs matching the selected severity or status code filter will be removed."
        destructive
        confirmLabel={removeFiltered.isPending ? "Deleting..." : "Delete filtered"}
        onConfirm={() => removeFiltered.mutate()}
      />
    </div>
  );
}
