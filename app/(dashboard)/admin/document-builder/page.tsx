import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCompanyInfoSafe } from "@/lib/actions/company-info";
import { getDocumentTemplates } from "@/lib/actions/doc-templates";
import { DocumentBuilder } from "@/components/admin/document-builder";

export const dynamic = "force-dynamic";

export default async function DocumentBuilderPage() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "MANAGER"].includes(session.user.role)) redirect("/dashboard");

  const [companyInfo, templates] = await Promise.all([
    getCompanyInfoSafe(),
    getDocumentTemplates(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Document Builder</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure company info, document headers and footers for all printed documents (quotes, invoices, BOL, etc.)
        </p>
      </div>
      <DocumentBuilder companyInfo={companyInfo} templates={templates} />
    </div>
  );
}
