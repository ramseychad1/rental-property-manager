import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";

const schema = z.object({ email: z.string().email("Enter a valid email") });

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }) => {
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
    } catch {
      setSent(true); // backend returns success regardless to prevent enumeration
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
        </Link>
        <div className="overline mb-2">Account recovery</div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Forgot password?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your admin email — we'll send a reset link.
        </p>

        {sent ? (
          <div className="mt-8 flex flex-col items-center gap-3 text-center rounded-xl border border-border p-8 bg-card">
            <div className="grid place-items-center w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h2 className="font-display text-lg font-semibold">Check your inbox</h2>
            <p className="text-sm text-muted-foreground">
              If <span className="font-mono">{getValues("email")}</span> is on file, a reset link is on its way.
            </p>
            <Button asChild variant="outline" className="mt-2">
              <Link to="/login">Return to sign in</Link>
            </Button>
          </div>
        ) : (
          <form data-testid="forgot-form" onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Admin email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  data-testid="forgot-email-input"
                  type="email"
                  className="h-11 pl-9"
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <Button
              type="submit"
              data-testid="forgot-submit"
              disabled={isSubmitting}
              className="w-full h-11"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send reset link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
