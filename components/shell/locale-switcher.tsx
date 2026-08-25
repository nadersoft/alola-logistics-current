"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/lib/actions/locale";
import type { Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher({ locale, className }: { locale: Locale; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const pick = (next: Locale) => {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  };

  return (
    <div className={`flex items-center gap-1 rounded-full border bg-background p-0.5 ${className ?? ""}`}>
      {(["en", "ar"] as Locale[]).map((l) => (
        <Button
          key={l}
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          aria-pressed={locale === l}
          onClick={() => pick(l)}
          className={`h-6 rounded-full px-2.5 text-xs font-medium ${locale === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          {l === "ar" ? "ع" : "EN"}
        </Button>
      ))}
    </div>
  );
}
