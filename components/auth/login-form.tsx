"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon } from "lucide-react";

export function LoginForm({
  companyName,
  redirectTo = "/dashboard",
  onSuccess,
}: {
  companyName: string;
  redirectTo?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    startTransition(async () => {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError("Invalid email or password.");
        return;
      }
      toast.success(`Welcome back to ${companyName}`);
      onSuccess?.();
      router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-800">Email</Label>
        <Input id="email" name="email" type="email" placeholder="admin@alola.com" autoComplete="email" required className="bg-white text-slate-900 border-slate-300 focus:border-blue-500" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-800">Password</Label>
        <Input id="password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" required className="bg-white text-slate-900 border-slate-300 focus:border-blue-500" />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
        Sign in
      </Button>
    </form>
  );
}
