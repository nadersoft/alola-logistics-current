import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getAllSettings } from "@/lib/settings";
import { getString, toSettingMap } from "@/lib/theme";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params?.callbackUrl || "/dashboard";

  const session = await auth();
  if (session?.user) redirect(callbackUrl);

  const settings = await getAllSettings();
  const map = toSettingMap(settings);
  const companyName = getString(map, "company.name", "Alola Logistics");

  const isBookingFlow = callbackUrl.includes("restorePending");

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-lg font-bold text-white shadow-lg shadow-[var(--primary)]/30">
          A
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600">{companyName} client portal</p>
      </div>

      {isBookingFlow && (
        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          Please sign in to complete your booking. Your quote is saved and will be restored after login.
        </div>
      )}

      <LoginForm companyName={companyName} redirectTo={callbackUrl} />

      <p className="mt-6 text-center text-sm text-slate-600">
        New customer?{" "}
        <Link href="/auth/register" className="font-semibold text-blue-600 underline underline-offset-4 hover:text-blue-700">
          Create an account
        </Link>
      </p>
      <Link href="/" className="mt-4 flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-700">
        <ArrowLeft className="size-3" />
        Back to home
      </Link>
    </div>
  );
}
