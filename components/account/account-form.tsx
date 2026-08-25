"use client";

import { useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, KeyRound, Loader2, Save, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfile, changePassword } from "@/lib/actions/account";
import { PhoneVerificationCard } from "@/components/account/phone-verification-card";

export function AccountForm({
  initialName,
  initialEmail,
  phone,
  countryCode,
  phoneVerified,
  isDev,
}: {
  initialName: string;
  initialEmail: string;
  phone: string | null;
  countryCode: string | null;
  phoneVerified: boolean;
  isDev?: boolean;
}) {
  const router = useRouter();
  const [profilePending, startProfile] = useTransition();
  const [passwordPending, startPassword] = useTransition();

  function onProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startProfile(async () => {
      const res = await updateProfile(new FormData(e.currentTarget));
      if (res.ok) {
        toast.success("Profile updated.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not update your profile.");
      }
    });
  }

  function onPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startPassword(async () => {
      const res = await changePassword(fd);
      if (res.ok) {
        toast.success("Password changed.");
        (e.currentTarget as HTMLFormElement).reset();
      } else {
        toast.error(res.error ?? "Could not change your password.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="size-4" />
            Profile
          </CardTitle>
          <CardDescription>Your name and email are used across your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" required minLength={2} maxLength={80} defaultValue={initialName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required defaultValue={initialEmail} />
            </div>
            <div className="space-y-2">
              <Label>Verified phone</Label>
              {phoneVerified ? (
                <>
                  <div className="flex h-10 items-center gap-2 rounded-lg border bg-muted px-3 text-sm text-muted-foreground">
                    <BadgeCheck className="size-4 text-emerald-500" />
                    <span>{phone ? `${countryCode ?? ""} ${phone}` : "No phone number"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">The phone number you verified cannot be changed here.</p>
                </>
              ) : (
                <p className="rounded-lg border border-dashed bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  No verified phone yet — use the card below to add and verify one.
                </p>
              )}
            </div>
            <Button type="submit" disabled={profilePending}>
              {profilePending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            Password
          </CardTitle>
          <CardDescription>Use at least 8 characters with a mix of letters and numbers.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
            </div>
            <Button type="submit" disabled={passwordPending} variant="secondary">
              {passwordPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              Change password
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>

      {!phoneVerified ? <PhoneVerificationCard isDev={isDev} /> : null}
    </div>
  );
}
