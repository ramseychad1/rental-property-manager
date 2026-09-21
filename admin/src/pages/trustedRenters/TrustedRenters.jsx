import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2, Send, UserCheck, UserMinus, X } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { invitesApi } from "@/lib/api";
import { fmtDate } from "@/lib/formatters";
import { useAuth } from "@/contexts/AuthContext";

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for non-secure contexts where the Clipboard API is unavailable.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (!ok) throw new Error("copy failed");
  }
}

const KEYS = { invites: ["invites"], grants: ["grants"] };

export default function TrustedRentersPage() {
  const { isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [created, setCreated] = useState(null); // { email, inviteUrl }
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(null);

  const invites = useQuery({ queryKey: KEYS.invites, queryFn: invitesApi.listInvites });
  const grants = useQuery({ queryKey: KEYS.grants, queryFn: invitesApi.listGrants });

  const invite = useMutation({
    mutationFn: () => invitesApi.create({ email, name }),
    onSuccess: (data) => {
      setCreated({ email: data.email, inviteUrl: data.inviteUrl });
      setCopied(false);
      setEmail("");
      setName("");
      qc.invalidateQueries({ queryKey: KEYS.invites });
    },
    onError: (err) => toast.error(err.normalizedMessage || "Could not create the invitation"),
  });

  const cancel = useMutation({
    mutationFn: (id) => invitesApi.cancelInvite(id),
    onSuccess: () => {
      toast.success("Invitation cancelled");
      qc.invalidateQueries({ queryKey: KEYS.invites });
    },
    onError: (err) => toast.error(err.normalizedMessage || "Could not cancel the invitation"),
  });

  const revoke = useMutation({
    mutationFn: (id) => invitesApi.revokeGrant(id),
    onSuccess: () => {
      toast.success("Access revoked");
      qc.invalidateQueries({ queryKey: KEYS.grants });
    },
    onError: (err) => toast.error(err.normalizedMessage || "Could not revoke access"),
  });

  const submit = (e) => {
    e.preventDefault();
    if (email.trim()) invite.mutate();
  };

  const copyLink = async () => {
    try {
      await copyText(created.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy - select the link and copy it manually");
    }
  };

  const grantList = grants.data || [];
  const inviteList = invites.data || [];

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto" data-testid="trusted-renters-page">
      <PageHeader
        title="Trusted Renters"
        subtitle="Invite people you're happy to rent to. Once they accept, they can see your private listings (mark a listing Private on its edit page) and request stays any time, with no code needed."
      />

      <Card className="p-5 rounded-xl mb-6">
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="guest@example.com"
              data-testid="invite-email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Name (optional)</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Used in the greeting"
              data-testid="invite-name"
            />
          </div>
          <Button type="submit" disabled={invite.isPending} data-testid="invite-submit">
            {invite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send invitation
          </Button>
        </form>
      </Card>

      <h2 className="font-display text-lg font-semibold mb-3">Trusted renters</h2>
      <Card className="rounded-xl mb-8 overflow-hidden">
        {grants.isLoading ? (
          <Skeleton className="h-24 m-4" />
        ) : grantList.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No trusted renters yet"
            description="People who accept your invitation will appear here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                {isSuperAdmin && <TableHead>Owner</TableHead>}
                <TableHead>Since</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {grantList.map((g) => (
                <TableRow key={g._id} data-testid="grant-row">
                  <TableCell className="font-medium">{g.guest.name}</TableCell>
                  <TableCell>{g.guest.email}</TableCell>
                  {isSuperAdmin && <TableCell>{g.owner?.name}</TableCell>}
                  <TableCell>{fmtDate(g.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmRevoke(g)}
                      data-testid="revoke-grant"
                    >
                      <UserMinus className="w-4 h-4" /> Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <h2 className="font-display text-lg font-semibold mb-3">Pending invitations</h2>
      <Card className="rounded-xl overflow-hidden">
        {invites.isLoading ? (
          <Skeleton className="h-24 m-4" />
        ) : inviteList.length === 0 ? (
          <EmptyState title="No pending invitations" description="Invitations you've sent that haven't been accepted yet show up here." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                {isSuperAdmin && <TableHead>Owner</TableHead>}
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {inviteList.map((i) => (
                <TableRow key={i._id} data-testid="invite-row">
                  <TableCell className="font-medium">{i.email}</TableCell>
                  {isSuperAdmin && <TableCell>{i.owner?.name}</TableCell>}
                  <TableCell>{fmtDate(i.createdAt)}</TableCell>
                  <TableCell>
                    {i.expired ? <Badge variant="secondary">Expired</Badge> : fmtDate(i.expiresAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={cancel.isPending}
                      onClick={() => cancel.mutate(i._id)}
                      data-testid="cancel-invite"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!created} onOpenChange={(o) => !o && setCreated(null)}>
        <DialogContent data-testid="invite-created-dialog">
          <DialogHeader>
            <DialogTitle>Invitation created</DialogTitle>
            <DialogDescription>
              We emailed <strong>{created?.email}</strong> from your connected Gmail (Settings, Email). If you haven&apos;t
              connected one, send them this link yourself. It works once, expires in 14 days, and can&apos;t be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <div className="min-w-0 flex-1 break-all font-mono text-sm select-all" data-testid="invite-link">
              {created?.inviteUrl}
            </div>
            <Button type="button" size="icon" variant="ghost" onClick={copyLink} aria-label="Copy invitation link">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreated(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmRevoke}
        onOpenChange={(o) => !o && setConfirmRevoke(null)}
        title="Revoke access?"
        description={`${confirmRevoke?.guest?.name || "This person"} will no longer see your private listings or be able to request them. You can invite them again later.`}
        confirmLabel="Revoke access"
        destructive
        onConfirm={() => {
          revoke.mutate(confirmRevoke._id);
          setConfirmRevoke(null);
        }}
      />
    </div>
  );
}
