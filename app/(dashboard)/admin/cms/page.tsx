import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPageBySlug, getCmsPages } from "@/lib/actions/cms";
import { CmsBuilder } from "@/components/admin/cms-builder";

export const dynamic = "force-dynamic";

export default async function CmsPage() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "MANAGER", "SUPPORT"].includes(session.user.role)) redirect("/dashboard");

  const pages = await getCmsPages();
  const details = [];
  for (const page of pages) {
    const detail = await getPageBySlug(page.slug);
    if (detail) details.push(detail);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Website Builder</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the marketing site: pages, sections and items (Arabic/English). Changes appear on the public site immediately.
        </p>
      </div>
      <CmsBuilder pages={details} />
    </div>
  );
}
