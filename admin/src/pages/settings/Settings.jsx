import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

const profileSchema = z.object({
  name: z.string().min(2, "Required"),
});
const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[a-z]/, "Add a lowercase letter")
      .regex(/[A-Z]/, "Add an uppercase letter")
      .regex(/[0-9]/, "Add a number")
      .regex(/[^A-Za-z0-9]/, "Add a special character"),
    confirm: z.string().min(8, "Confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // new states
  const [avatarPreview, setAvatarPreview] = useState(user?.picture || null);
  const fileInputRef = useRef(null);

  const profile = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || "" },
  });
  const password = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirm: "" },
  });

  // avatar change function
  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG, or WebP images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile image must be less than 5MB");
      return;
    }

    // Local preview
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);

    // Upload immediately
    setSavingProfile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", user?.name);
      const res = await authApi.updateProfile(fd);
      updateUser({ picture: res?.data?.picture || res?.picture });
      toast.success("Profile picture updated");
    } catch (e) {
      toast.error(e?.normalizedMessage || "Failed to upload picture");
      setAvatarPreview(user?.picture || null); // revert on error
    } finally {
      setSavingProfile(false);
    }
  };

  const onProfile = async ({ name }) => {
    setSavingProfile(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      const res = await authApi.updateProfile(fd);
      updateUser({ name });
      toast.success(res?.message || "Profile updated");
    } catch (e) {
      toast.error(e?.normalizedMessage || "Failed to save");
    } finally {
      setSavingProfile(false);
    }
  };

  const onPassword = async ({ oldPassword, newPassword }) => {
    setSavingPassword(true);
    try {
      await authApi.updatePassword({ oldPassword, newPassword });
      toast.success("Password updated");
      password.reset();
    } catch (e) {
      toast.error(e?.normalizedMessage || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, security, and workspace preferences."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Profile */}
        <Card className="p-6 rounded-xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="overline">Profile</span>
              <h3 className="font-display text-lg font-semibold">
                Personal details
              </h3>
            </div>
            {user?.role === "Admin" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-foreground text-background">
                <ShieldCheck className="w-3 h-3" /> Admin
              </span>
            )}
          </div>

          {/* Avatar - clickable */}
          <div className="flex items-center gap-4">
            <div
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar className="w-16 h-16">
                <AvatarImage src={avatarPreview} />
                <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
              </Avatar>
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-[10px] font-medium text-center leading-tight px-1">
                  Change
                </span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onAvatarChange}
            />
            <div className="text-xs text-muted-foreground">
              <div className="font-medium text-foreground text-sm">
                {user?.email}
              </div>
              Click avatar to change profile picture.
            </div>
          </div>

          <form
            onSubmit={profile.handleSubmit(onProfile)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                data-testid="settings-name"
                {...profile.register("name")}
              />
              {profile.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {profile.formState.errors.name.message}
                </p>
              )}
            </div>
            <Button
              data-testid="settings-save"
              type="submit"
              disabled={savingProfile}
            >
              {savingProfile ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save changes
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Password */}
        <Card className="p-6 rounded-xl space-y-5">
          <div>
            <span className="overline">Security</span>
            <h3 className="font-display text-lg font-semibold">
              Change password
            </h3>
          </div>
          <form
            onSubmit={password.handleSubmit(onPassword)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Current password</Label>
              <Input
                data-testid="settings-old-password"
                type="password"
                {...password.register("oldPassword")}
              />
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <Input
                data-testid="settings-new-password"
                type="password"
                {...password.register("newPassword")}
              />
              {password.formState.errors.newPassword && (
                <p className="text-xs text-destructive">
                  {password.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Confirm new password</Label>
              <Input
                data-testid="settings-confirm-password"
                type="password"
                {...password.register("confirm")}
              />
              {password.formState.errors.confirm && (
                <p className="text-xs text-destructive">
                  {password.formState.errors.confirm.message}
                </p>
              )}
            </div>
            <Button
              data-testid="settings-update-password"
              type="submit"
              disabled={savingPassword}
            >
              {savingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        </Card>

        {/* Theme */}
        <Card className="p-6 rounded-xl space-y-5">
          <div>
            <span className="overline">Appearance</span>
            <h3 className="font-display text-lg font-semibold">Theme</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Dark mode</div>
              <div className="text-xs text-muted-foreground">
                Toggle between light & dark UI.
              </div>
            </div>
            <Switch
              data-testid="settings-dark-mode"
              checked={theme === "dark"}
              onCheckedChange={toggleTheme}
            />
          </div>
        </Card>

       
      </div>
    </div>
  );
}
