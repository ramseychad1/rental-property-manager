import { useState } from "react";
import { Check, Copy, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { usersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

function Row({ label, value, mono = true }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await copyText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy - select the text and copy it manually");
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
      <div className="min-w-0">
        <div className="overline">{label}</div>
        <div className={`text-sm break-all select-all ${mono ? "font-mono" : ""}`}>{value || "—"}</div>
      </div>
      <Button type="button" size="icon" variant="ghost" onClick={copy} aria-label={`Copy ${label}`}>
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}

/**
 * Shows a new/reset account's sign-in details once, since no email is sent.
 * "Copy all" puts a ready-to-paste message on the clipboard.
 */
export default function CredentialsDialog({ open, onOpenChange, credentials, name, userId, reset = false }) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailedTo, setEmailedTo] = useState(null);
  if (!credentials) return null;

  const message = [
    "Your Rental Property Manager admin account" + (reset ? " has a new temporary password." : " is ready."),
    "",
    `Login URL: ${credentials.loginUrl}`,
    `User ID: ${credentials.email}`,
    `Temporary password: ${credentials.tempPassword}`,
    "",
    "You'll be asked to choose your own password the first time you sign in.",
  ].join("\n");

  const emailIt = async () => {
    setEmailing(true);
    try {
      const result = await usersApi.emailCredentials(userId, { tempPassword: credentials.tempPassword, reset });
      setEmailedTo(result.sentTo);
      toast.success(`Emailed to ${result.sentTo}`);
    } catch (err) {
      toast.error(err.normalizedMessage || "Couldn't send the email");
    } finally {
      setEmailing(false);
    }
  };

  const copyAll = async () => {
    try {
      await copyText(message);
      setCopiedAll(true);
      toast.success("Copied - paste it into an email");
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      toast.error("Couldn't copy - select the text and copy it manually");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="credentials-dialog" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{reset ? "Password reset" : "User created"}{name ? ` — ${name}` : ""}</DialogTitle>
          <DialogDescription>
            Nothing is sent automatically. Copy these details, or use <strong className="text-foreground">Email to user</strong> to send them from your connected Gmail.
            <strong className="text-foreground"> The password is shown only once</strong> — close this
            and it can't be retrieved (you can reset it again from the user's profile).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Row label="Login URL" value={credentials.loginUrl} />
          <Row label="User ID (email)" value={credentials.email} />
          <Row label="Temporary password" value={credentials.tempPassword} />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" onClick={copyAll} data-testid="credentials-copy-all">
            {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copy all
          </Button>
          {userId && (
            <Button type="button" variant="outline" onClick={emailIt} disabled={emailing} data-testid="credentials-email">
              {emailing ? <Loader2 className="w-4 h-4 animate-spin" /> : emailedTo ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
              {emailedTo ? "Emailed - send again" : "Email to user"}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
