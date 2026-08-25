"use server";

import { Category } from "@prisma/client";
import { auth } from "@/lib/auth";
import { setSetting } from "@/lib/settings";
import { revalidatePath } from "next/cache";

export type SaveSettingsItem = {
  key: string;
  value: unknown;
  category: Category;
  description?: string | null;
};

export async function saveSettingsAction(items: SaveSettingsItem[]) {
  const session = await auth();
  const actorId = session?.user?.id ?? null;

  for (const item of items) {
    await setSetting({
      key: item.key,
      value: item.value,
      category: item.category,
      description: item.description ?? null,
      updatedById: actorId,
    });
  }

  revalidatePath("/", "layout");
  return { ok: true as const, count: items.length };
}
