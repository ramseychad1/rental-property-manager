import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  ShieldCheck,
  Database,
} from "lucide-react";
import { motion } from "motion/react";
import { vertical } from "@/config/vertical";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(4, "At least 4 characters"),
});

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data) => {
    setError("");
    try {
      await login(data);
      toast.success("Welcome back");
      navigate(from, { replace: true });
    } catch (e) {
      setError(e?.normalizedMessage || e?.message || "Sign-in failed.");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <img
        src="/login-page.png"
        alt="Luxury Property"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-md px-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-3xl overflow-hidden border border-[#2A2A2A] bg-[#111111]/90 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <div className="py-5 mb-4 flex items-center justify-center bg-[#F5F5F5]">
            <img src="/logo.png" alt="" />
          </div>

          <div className="pb-6 px-6">
            <div className="mb-6">
              

              <h1 className="text-3xl font-bold text-[#F8F8F8] text-center">Sign in</h1>

         
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#E5E5E5]">
                  Email
                </Label>

                <Input
                  id="email"
                  type="email"
                  className="h-11 bg-[#1A1A1A] border-[#2D2D2D] text-[#F5F5F5] placeholder:text-[#777] focus-visible:ring-0 focus-visible:border-[#C8A46B]"
                  placeholder="you@example.com"
                  {...register("email")}
                />

                {errors.email && (
                  <p className="text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#E5E5E5]">
                  Password
                </Label>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    className="h-11 bg-[#1A1A1A] border-[#2D2D2D] text-[#F5F5F5] placeholder:text-[#777] focus-visible:ring-0 focus-visible:border-[#C8A46B]"
                    {...register("password")}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888]"
                  >
                    {showPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {errors.password && (
                  <p className="text-xs text-red-400">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {error && (
                <div className="text-sm px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 text-sm font-semibold bg-[#f5f5f5] hover:bg-[#e0e0e0] text-black"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
