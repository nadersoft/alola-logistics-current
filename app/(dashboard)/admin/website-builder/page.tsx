import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPartners, getTestimonials, getFaqs } from "@/lib/actions/website-content";
import { WebsiteBuilder } from "@/components/admin/website-builder";

export const dynamic = "force-dynamic";

export default async function WebsiteBuilderPage() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "MANAGER", "SUPPORT"].includes(session.user.role)) redirect("/dashboard");

  const [partners, testimonials, faqs] = await Promise.all([
    getPartners(),
    getTestimonials(),
    getFaqs(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Website Builder</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the public website content: partners, testimonials, FAQ. CMS page content is under the CMS tab.
        </p>
      </div>
      <WebsiteBuilder partners={partners} testimonials={testimonials} faqs={faqs} />
    </div>
  );
}
