"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "@/components/auth/login-form";

/**
 * Auth Gate (Phase 2): when a signed-out visitor tries to book a quote, this
 * modal gates the action behind a sign-in prompt with an embedded login form.
 */
export function AuthGateDialog({
  open,
  onOpenChange,
  companyName,
  pendingTier,
  onAuthed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  pendingTier?: string | null;
  onAuthed: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
            <Lock className="size-5 text-primary" />
          </div>
          <DialogTitle>Sign in to book your quote</DialogTitle>
          <DialogDescription>
            {pendingTier ? (
              <>
                Your <span className="font-semibold">{pendingTier.toLowerCase()}</span> quote is ready. Sign in
                with your {companyName} account to lock the price and open a booking request.
              </>
            ) : (
              <>Sign in with your {companyName} account to continue.</>
            )}
          </DialogDescription>
        </DialogHeader>
        <LoginForm companyName={companyName} redirectTo="/quote" onSuccess={onAuthed} />
        <p className="text-center text-xs text-muted-foreground">
          New customer?{" "}
          <Link href="/auth/register?from=quote" className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80">
            Create an account
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
