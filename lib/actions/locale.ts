"use server";
import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { Category } from "@prisma/client";
import { auth } from "@/auth";
import { setSetting } from "@/lib/settings";
import type { Locale } from "@/lib/i18n";

export async function setLocaleAction(locale: Locale) {
  cookies().set("alola_locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  const session = await auth();
  if (session?.user) {
    await setSetting({
      key: "defaults.language",
      value: locale,
      category: Category.DEFAULTS,
      updatedById: session.user.id,
    });
  }
  revalidateTag("settings");
  revalidatePath("/", "layout");
  return { ok: true as const, locale };
}
