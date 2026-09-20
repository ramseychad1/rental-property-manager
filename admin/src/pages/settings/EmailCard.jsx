import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, Mail, Send, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { emailApi } from "@/lib/api";

// Shown after Google sends the browser back to /settings?email=<result>.
const RETURN_MESSAGES = {
  connected: ["success", "Gmail connected."],
  denied: ["error", "Gmail wasn't connected - you cancelled on Google's screen."],
  missing_permission: ["error", "Gmail wasn't connected - please tick the box allowing us to send email."],
  error: ["error", "Something went wrong connecting Gmail. Please try again."],
};

export default function EmailCard() {
  const { isSuperAdmin, user } = useAuth();
  // The API blocks everything but the password change until the temporary
  // password has been replaced, so don't even ask for the status yet.
  const mustChangePassword = Boolean(user?.mustChangePassword);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null); // "connect" | "test" | "disconnect"

  const { data, isLoading, isError } = useQuery({
    queryKey: ["email-status"],
    queryFn: emailApi.status,
    enabled: !mustChangePassword,
  });

  // Report the result of the Google round trip once, then tidy the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("email");
    if (!result) return;
    const [kind, message] = RETURN_MESSAGES[result] || RETURN_MESSAGES.error;
    toast[kind](message);
    params.delete("email");
    const qs = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    queryClient.invalidateQueries({ queryKey: ["email-status"] });
  }, [queryClient]);

  const run = (name, fn) => async () => {
    setBusy(name);
    try {
      await fn();
    } catch (err) {
      toast.error(err.normalizedMessage || "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const connect = run("connect", async () => {
    const url = await emailApi.startGoogle();
    window.location.assign(url); // off to Google; it returns to /settings?email=...
  });

  const sendTest = run("test", async () => {
    const result = await emailApi.test();
    toast.success(`Test email sent to ${result.sentTo}`);
  });

  const disconnect = run("disconnect", async () => {
    if (!window.confirm("Disconnect your Gmail? Emails will stop going out from your address.")) return;
    await emailApi.disconnect();
    await queryClient.invalidateQueries({ queryKey: ["email-status"] });
    toast.success("Gmail disconnected");
  });

  const conn = data?.connection;
  const needsReconnect = conn?.status === "needs_reconnect";

  return (
    <Card className="p-6 rounded-xl space-y-5" data-testid="email-card">
      <div>
        <span className="overline">Email</span>
        <h3 className="font-display text-lg font-semibold">
          {isSuperAdmin ? "System sender (Gmail)" : "Send email from your Gmail"}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isSuperAdmin
            ? "This Gmail sends signup codes, password resets and contact-form messages, and covers any owner who hasn't connected their own."
            : "Guests get booking emails from your own Gmail address, and their replies land in your inbox. You'll see each message in your Gmail Sent folder."}
        </p>
      </div>

      {mustChangePassword ? (
        <div className="text-sm text-muted-foreground flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          Set your own password first (the Change password card), then you can connect Gmail here.
        </div>
      ) : isLoading ? (
        <div className="text-sm text-muted-foreground">Checking…</div>
      ) : isError ? (
        <div className="text-sm text-muted-foreground flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          Couldn't load your email settings. Refresh the page to try again.
        </div>
      ) : !data?.configured ? (
        <div className="text-sm text-muted-foreground flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          Gmail connection isn't set up on the server yet.
        </div>
      ) : conn ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2 text-sm">
            {needsReconnect ? (
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
            )}
            <div>
              {needsReconnect ? (
                <>
                  <strong>Reconnect needed</strong> — Google stopped accepting the saved access for{" "}
                  <span className="font-mono">{conn.email}</span>. Emails are going out from the system sender until you reconnect.
                </>
              ) : (
                <>
                  Connected as <span className="font-mono">{conn.email}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {needsReconnect ? (
              <Button onClick={connect} disabled={!!busy} data-testid="email-reconnect">
                {busy === "connect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Reconnect Gmail
              </Button>
            ) : (
              <Button variant="outline" onClick={sendTest} disabled={!!busy} data-testid="email-test">
                {busy === "test" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send test email
              </Button>
            )}
            <Button variant="ghost" onClick={disconnect} disabled={!!busy} data-testid="email-disconnect">
              {busy === "disconnect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />}
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Button onClick={connect} disabled={!!busy} data-testid="email-connect">
            {busy === "connect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Connect Gmail
          </Button>
          <p className="text-xs text-muted-foreground">
            You'll sign in on Google and click Allow. We can only send email — we can't read your inbox.
            {!isSuperAdmin &&
              (data.systemSenderAvailable
                ? " Until you connect, guest emails go out from the platform's address with your address as the reply-to."
                : " Until you connect, guests won't receive email.")}
          </p>
        </div>
      )}
    </Card>
  );
}
