import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RegistrationBuilder } from "@/components/admin/registration-builder";

export const dynamic = "force-dynamic";

export default async function RegistrationBuilderPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) redirect("/dashboard");

  const pageConfig = await prisma.registrationPageConfig.findUnique({ where: { id: "default" } });
  const fields = await prisma.registrationFieldConfig.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Registration Builder</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the sign-up page copy (Arabic/English) and the fields shown on /register.
        </p>
      </div>
      <RegistrationBuilder
        pageConfig={
          pageConfig
            ? {
                id: pageConfig.id,
                pageTitleAr: pageConfig.pageTitleAr,
                pageTitleEn: pageConfig.pageTitleEn,
                pageSubtitleAr: pageConfig.pageSubtitleAr,
                pageSubtitleEn: pageConfig.pageSubtitleEn,
                submitButtonAr: pageConfig.submitButtonAr,
                submitButtonEn: pageConfig.submitButtonEn,
                successToastAr: pageConfig.successToastAr,
                successToastEn: pageConfig.successToastEn,
                errorGeneralAr: pageConfig.errorGeneralAr,
                errorGeneralEn: pageConfig.errorGeneralEn,
                footerLoginTextAr: pageConfig.footerLoginTextAr,
                footerLoginTextEn: pageConfig.footerLoginTextEn,
                alreadyHaveAccountAr: pageConfig.alreadyHaveAccountAr,
                alreadyHaveAccountEn: pageConfig.alreadyHaveAccountEn,
                isActive: pageConfig.isActive,
              }
            : null
        }
        fields={fields.map((f) => ({
          fieldKey: f.fieldKey,
          labelAr: f.labelAr,
          labelEn: f.labelEn,
          placeholderAr: f.placeholderAr,
          placeholderEn: f.placeholderEn,
          helpTextAr: f.helpTextAr,
          helpTextEn: f.helpTextEn,
          tooltipAr: f.tooltipAr,
          tooltipEn: f.tooltipEn,
          errorRequiredAr: f.errorRequiredAr,
          errorRequiredEn: f.errorRequiredEn,
          errorInvalidAr: f.errorInvalidAr,
          errorInvalidEn: f.errorInvalidEn,
          validationRegex: f.validationRegex,
          minLength: f.minLength,
          maxLength: f.maxLength,
          allowNumbers: f.allowNumbers,
          allowSpecialChars: f.allowSpecialChars,
          isActive: f.isActive,
          isVisible: f.isVisible,
          isRequired: f.isRequired,
          order: f.order,
        }))}
      />
    </div>
  );
}
