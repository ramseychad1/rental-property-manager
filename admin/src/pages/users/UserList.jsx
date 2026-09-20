import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, KeyRound, Loader2, Plus, ShieldCheck, UserCheck, UserX, Users } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import DataToolbar, { SearchInput } from "@/components/common/DataToolbar";
import Pagination from "@/components/common/Pagination";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { usersApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { fmtDate } from "@/lib/formatters";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import UserBookings from "./UserBookings";
import AddUserDialog from "./AddUserDialog";
import CredentialsDialog from "./CredentialsDialog";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";

const STAFF = ["SuperAdmin", "Owner"];
const ROLE_LABEL = { SuperAdmin: "Super Admin", Owner: "Owner", Guest: "Guest" };

const LIMIT = 10;

export default function UserListPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [active, setActive] = useState(null);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search);
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [creds, setCreds] = useState(null); // { credentials, name, reset }
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const refreshUsers = () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["owners"] });
  };

  const setActiveFlag = async (u, isActive) => {
    setBusy(true);
    try {
      const updated = await usersApi.update(u.id, { isActive });
      setActive(updated);
      refreshUsers();
      toast.success(isActive ? "User reactivated" : "User deactivated");
    } catch (err) {
      toast.error(err.normalizedMessage || "Could not update user");
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (u) => {
    setConfirmReset(false);
    setBusy(true);
    try {
      const result = await usersApi.resetPassword(u.id);
      setCreds({ credentials: result.credentials, name: u.name, userId: u.id, reset: true });
      refreshUsers();
    } catch (err) {
      toast.error(err.normalizedMessage || "Could not reset password");
    } finally {
      setBusy(false);
    }
  };

  const userParams = useMemo(
    () => ({
      page,
      limit: LIMIT,
      ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
      ...(role !== "all" && { role }),
    }),
    [page, debouncedSearch, role],
  );

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.users(userParams),
    queryFn: () => usersApi.list(userParams),
    placeholderData: (previous) => previous,
    staleTime: 20_000,
  });
  
  const users = data?.users || [];
  const pagination = data?.pagination || {};
  const totalCount = pagination.totalCount || 0;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle={`${totalCount} accounts across guests, owners, and super admins.`}
        actions={
          <Button onClick={() => setAddOpen(true)} data-testid="add-user-btn">
            <Plus className="w-4 h-4" /> Add user
          </Button>
        }
      />

      <DataToolbar>
        <SearchInput
          testid="users-search"
          value={search}
          onChange={setSearch}
          placeholder="Search name or email…"
        />

        <Select value={role} onValueChange={setRole}>
          <SelectTrigger
            data-testid="users-role-filter"
            className="w-full md:w-44 h-10"
          >
            <SelectValue placeholder="Role" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="SuperAdmin">Super Admin</SelectItem>
            <SelectItem value="Owner">Owner</SelectItem>
            <SelectItem value="User">Guest</SelectItem>
          </SelectContent>
        </Select>
      </DataToolbar>

      <Card className="rounded-xl overflow-hidden p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="overline">Avatar</TableHead>
              <TableHead className="overline">Name</TableHead>
              <TableHead className="overline">Email</TableHead>
              <TableHead className="overline">Role</TableHead>
              <TableHead className="overline">Source</TableHead>
              <TableHead className="overline">Joined</TableHead>
              <TableHead className="overline text-right">Open</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    icon={Users}
                    title="No users found"
                    description="Try clearing filters."
                  />
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow
                  key={u.id}
                  data-testid={`user-row-${u.id}`}
                  className="cursor-pointer"
                  onClick={() => setActive(u)}
                >
                  <TableCell>
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={u.picture} alt={u.name} />
                      <AvatarFallback>{u.name?.[0]}</AvatarFallback>
                    </Avatar>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm font-medium">{u.name}</div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      {u.email}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={STAFF.includes(u.role) ? "default" : "outline"}
                      className="text-xs gap-1"
                    >
                      {u.role === "SuperAdmin" && (
                        <ShieldCheck className="w-3 h-3" />
                      )}
                      {ROLE_LABEL[u.role] || u.role}
                    </Badge>
                    {u.isActive === false && (
                      <Badge variant="outline" className="ml-1 text-xs text-destructive border-destructive/40">
                        Deactivated
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="text-xs font-mono">
                      {u.createdWith || "—"}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground font-mono whitespace-nowrap">
                    {fmtDate(u.createdAt)}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      data-testid={`user-view-${u.id}`}
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActive(u);
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

      <Sheet open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <SheetContent
          data-testid="user-detail-sheet"
          className="sm:max-w-md w-full overflow-y-auto"
        >
          {active && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display">User profile</SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  {active._id}
                </SheetDescription>
              </SheetHeader>

              <Card className="mt-6 p-5 rounded-xl">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={active.picture} />
                    <AvatarFallback>{active.name?.[0]}</AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="font-display text-lg font-semibold">
                      {active.name}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {active.email}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <Badge
                        variant={STAFF.includes(active.role) ? "default" : "outline"}
                        className="gap-1"
                      >
                        {active.role === "SuperAdmin" && (
                          <ShieldCheck className="w-3 h-3" />
                        )}
                        {ROLE_LABEL[active.role] || active.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="mt-3 p-5 rounded-xl space-y-2">
                <div className="overline">Account</div>

                <div className="text-sm flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-mono">{active.createdWith || "—"}</span>
                </div>

                <div className="text-sm flex justify-between">
                  <span className="text-muted-foreground">Joined</span>
                  <span className="font-mono">{fmtDate(active.createdAt)}</span>
                </div>
              </Card>

              {STAFF.includes(active.role) && (
                <Card className="mt-3 p-5 rounded-xl space-y-3">
                  <div className="overline">Manage account</div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={busy}
                      onClick={() => setConfirmReset(true)} data-testid="user-reset-password">
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                      Reset password
                    </Button>
                    {active.id !== me?.id && (
                      <Button size="sm" variant="outline" disabled={busy}
                        onClick={() => setActiveFlag(active, active.isActive === false)}
                        data-testid="user-toggle-active">
                        {active.isActive === false
                          ? <><UserCheck className="w-4 h-4" /> Reactivate</>
                          : <><UserX className="w-4 h-4" /> Deactivate</>}
                      </Button>
                    )}
                  </div>
                  {active.mustChangePassword && (
                    <p className="text-xs text-muted-foreground">
                      Hasn't set their own password yet (still on the temporary one).
                    </p>
                  )}
                </Card>
              )}

              <div className="mt-3">
                <UserBookings userId={active._id} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(result) => {
          setAddOpen(false);
          setCreds({ credentials: result.credentials, name: result.user.name, userId: result.user.id, reset: false });
          refreshUsers();
        }}
      />
      <CredentialsDialog
        key={creds?.credentials?.tempPassword}
        open={!!creds}
        onOpenChange={(v) => !v && setCreds(null)}
        credentials={creds?.credentials}
        name={creds?.name}
        userId={creds?.userId}
        reset={creds?.reset}
      />
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset password?"
        description={`${active?.name || "This user"}'s current password stops working immediately. You'll get a new temporary password to send them, and they'll set their own at next sign-in.`}
        confirmLabel="Reset password"
        onConfirm={() => resetPassword(active)}
      />
    </div>
  );
}