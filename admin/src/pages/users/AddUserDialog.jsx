import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usersApi } from "@/lib/api";

const EMPTY = { name: "", email: "", role: "Owner" };

export default function AddUserDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const close = (v) => {
    if (!v) setForm(EMPTY);
    onOpenChange(v);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await usersApi.create({ ...form, email: form.email.trim() });
      setForm(EMPTY);
      onCreated(result);
    } catch (err) {
      toast.error(err.normalizedMessage || "Could not create user");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent data-testid="add-user-dialog" className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              You'll get a temporary password to send them. They must change it when they first sign in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="new-user-name">Name</Label>
            <Input id="new-user-name" required value={form.name} onChange={(e) => set("name")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-email">Email (their User ID)</Label>
            <Input id="new-user-email" type="email" required value={form.email}
              onChange={(e) => set("email")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={set("role")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Owner">Owner — manages only their own properties</SelectItem>
                <SelectItem value="SuperAdmin">Super Admin — full access to everything</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Create user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
