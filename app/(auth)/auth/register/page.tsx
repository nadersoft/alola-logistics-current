import { redirect } from "next/navigation";
//import { auth } from "@/lib/auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAllSettings } from "@/lib/settings";
import { getString, toSettingMap } from "@/lib/theme";
import { RegisterForm } from "@/components/auth/register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const [settings, pageConfig, fields] = await Promise.all([
    getAllSettings(),
    prisma.registrationPageConfig.findUnique({ where: { id: "default" } }),
    prisma.registrationFieldConfig.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    }),
  ]);
  const map = toSettingMap(settings);
  const companyName = getString(map, "company.name", "Alola Logistics");

  return (
    <RegisterForm
      companyName={companyName}
      isDev={process.env.NODE_ENV === "development"}
      pageConfig={
        pageConfig
          ? {
              pageTitleAr: pageConfig.pageTitleAr,
              pageTitleEn: pageConfig.pageTitleEn,
              pageSubtitleAr: pageConfig.pageSubtitleAr,
              pageSubtitleEn: pageConfig.pageSubtitleEn,
              submitButtonAr: pageConfig.submitButtonAr,
              submitButtonEn: pageConfig.submitButtonEn,
              footerLoginTextAr: pageConfig.footerLoginTextAr,
              footerLoginTextEn: pageConfig.footerLoginTextEn,
              alreadyHaveAccountAr: pageConfig.alreadyHaveAccountAr,
              alreadyHaveAccountEn: pageConfig.alreadyHaveAccountEn,
            }
          : null
      }
      fields={fields.map((f) => ({
        fieldKey: f.fieldKey,
        labelAr: f.labelAr,
        labelEn: f.labelEn,
        placeholderAr: f.placeholderAr,
        placeholderEn: f.placeholderEn,
        isRequired: f.isRequired,
        isVisible: f.isVisible,
      }))}
    />
  );
}
