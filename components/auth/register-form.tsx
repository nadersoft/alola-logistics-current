"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail, MessageSquareText, Send, ShieldCheck, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sendOtp, verifyOtpAndRegister } from "@/lib/auth";
import { COUNTRIES_PHONE, DEFAULT_COUNTRY_CODE } from "@/lib/data/countries-with-phone";

const PROVIDER_LABEL: Record<string, string> = {
  email: "email",
  console: "simulated console",
};

export type RegisterFieldConfig = {
  fieldKey: string;
  labelAr: string;
  labelEn: string;
  placeholderAr: string | null;
  placeholderEn: string | null;
  isRequired: boolean;
  isVisible: boolean;
};

export type RegisterPageConfig = {
  pageTitleAr: string;
  pageTitleEn: string;
  pageSubtitleAr: string | null;
  pageSubtitleEn: string | null;
  submitButtonAr: string;
  submitButtonEn: string;
  footerLoginTextAr: string | null;
  footerLoginTextEn: string | null;
  alreadyHaveAccountAr: string | null;
  alreadyHaveAccountEn: string | null;
};

type Details = {
  name: string;
  email: string;
  password: string;
  phone: string;
  countryCode: string;
};

/** Map a config fieldKey to the auth payload field name (lib/auth.ts expects `name`). */
function inputName(fieldKey: string): string {
  if (fieldKey === "fullName") return "name";
  return fieldKey;
}

export function RegisterForm({
  companyName,
  pageConfig,
  fields,
}: {
  companyName: string;
  isDev?: boolean;
  pageConfig?: RegisterPageConfig | null;
  fields?: RegisterFieldConfig[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const fromCalculator = from === "calculator";
  const fromQuote = from === "quote";

  const visibleFields = useMemo(
    () => (fields ?? []).filter((f) => f.isVisible),
    [fields]
  );
  const hasPhoneField = visibleFields.some((f) => f.fieldKey === "phone");

  const [step, setStep] = useState<1 | 2>(1);
  const [pending, startTransition] = useTransition();
  const [details, setDetails] = useState<Details | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);

  const title = pageConfig?.pageTitleEn ?? "Create your account";
  const subtitle =
    pageConfig?.pageSubtitleEn ??
    (fromQuote
      ? "Your quote is ready — complete signup to book it."
      : fromCalculator
        ? "Your quote is saved — complete signup to book it."
        : `${companyName} client portal`);
  const submitLabel = pageConfig?.submitButtonEn ?? "Send code by email";

  function fieldLabel(f: RegisterFieldConfig): string {
    return f.labelEn || inputName(f.fieldKey);
  }

  function fieldPlaceholder(f: RegisterFieldConfig): string | undefined {
    return f.placeholderEn || undefined;
  }

  function fieldInput(f: RegisterFieldConfig, props: { name: string; required: boolean }) {
    switch (f.fieldKey) {
      case "email":
        return <Input id={f.fieldKey} name={props.name} type="email" required={props.required} placeholder={fieldPlaceholder(f)} autoComplete="email" className="bg-white text-slate-900 border-slate-300 focus:border-blue-500" />;
      case "password":
        return <Input id={f.fieldKey} name={props.name} type="password" required={props.required} minLength={props.required ? 8 : undefined} placeholder={fieldPlaceholder(f)} autoComplete="new-password" className="bg-white text-slate-900 border-slate-300 focus:border-blue-500" />;
      case "phone":
        return (
          <div className="flex gap-2">
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger className="w-28 bg-white text-slate-900 border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES_PHONE.map((c) => (
                  <SelectItem key={c.code} value={c.dialCode}>
                    {c.flag} {c.dialCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input id={f.fieldKey} name={props.name} type="tel" required={props.required} inputMode="tel" placeholder={fieldPlaceholder(f)} autoComplete="tel" className="bg-white text-slate-900 border-slate-300 focus:border-blue-500" />
          </div>
        );
      default:
        return <Input id={f.fieldKey} name={props.name} required={props.required} placeholder={fieldPlaceholder(f)} className="bg-white text-slate-900 border-slate-300 focus:border-blue-500" />;
    }
  }

  function onSendOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next: Details = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      password: String(fd.get("password") ?? ""),
      phone: hasPhoneField ? String(fd.get("phone") ?? "").trim() : "",
      countryCode: hasPhoneField ? countryCode : "",
    };
    if (!next.email) {
      toast.error("Enter your email address.");
      return;
    }
    setDetails(next);

    startTransition(async () => {
      const data = new FormData();
      data.set("email", next.email);
      if (next.phone) {
        data.set("phone", next.phone);
        data.set("countryCode", next.countryCode);
      }
      const sendRes = await sendOtp(data);
      if (!sendRes.ok) {
        toast.error(sendRes.error ?? "Could not send the verification code.");
        return;
      }
      setProvider(sendRes.provider ?? "console");
      setOtp("");
      setStep(2);
      toast.success(`Verification code sent via ${PROVIDER_LABEL[sendRes.provider ?? "console"]}.`);
      setCountdown(120);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    });
  }

  function onVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!details) {
      setStep(1);
      return;
    }
    const otp = String(new FormData(e.currentTarget).get("otp") ?? "");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", details.name);
      fd.set("email", details.email);
      fd.set("password", details.password);
      fd.set("otp", otp);
      if (details.phone) {
        fd.set("phone", details.phone);
        fd.set("countryCode", details.countryCode);
      }
      const res = await verifyOtpAndRegister(fd);
      if (!res.ok) {
        toast.error(res.error ?? "Could not create your account.");
        return;
      }
      toast.success(`Welcome to ${companyName}!`);
      router.push(fromQuote ? "/quote" : "/dashboard");
      router.refresh();
    });
  }

  const contactHint = details?.phone ? (
    <p className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <Phone className="size-3.5 shrink-0" />
      We will send a 6-digit code to your phone number.
    </p>
  ) : (
    <p className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <Mail className="size-3.5 shrink-0" />
      We will email you a 6-digit code to confirm this address.
    </p>
  );

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-lg font-bold text-white shadow-lg shadow-[var(--primary)]/30">
          A
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      </div>

      {step === 1 ? (
        <form onSubmit={onSendOtp} className="space-y-4">
          {visibleFields.length > 0 ? (
            visibleFields.map((f) => (
              <div key={f.fieldKey} className="space-y-2">
                <Label htmlFor={f.fieldKey} className="text-slate-800">
                  {fieldLabel(f)}
                  {!f.isRequired ? <span className="ml-1 text-xs text-slate-400">(optional)</span> : null}
                </Label>
                {fieldInput(f, { name: inputName(f.fieldKey), required: f.isRequired })}
              </div>
            ))
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-800">Full name</Label>
                <Input id="name" name="name" required placeholder="Ahmed Al-Saud" autoComplete="name" className="bg-white text-slate-900 border-slate-300 focus:border-blue-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-800">Email</Label>
                <Input id="email" name="email" type="email" required placeholder="you@company.com" autoComplete="email" className="bg-white text-slate-900 border-slate-300 focus:border-blue-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-800">Password</Label>
                <Input id="password" name="password" type="password" required minLength={8} placeholder="At least 8 characters" autoComplete="new-password" className="bg-white text-slate-900 border-slate-300 focus:border-blue-500" />
              </div>
            </>
          )}
          {contactHint}
          <Button type="submit" disabled={pending} className="w-full bg-[var(--primary)] py-2.5 text-white hover:bg-[var(--accent)]">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {submitLabel}
          </Button>
        </form>
      ) : (
        <form onSubmit={onVerify} className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="mb-2 flex items-center gap-2 font-medium text-slate-900">
              <MessageSquareText className="size-4" />
              <>Code sent to {details?.phone || details?.email} via {PROVIDER_LABEL[provider ?? "console"]}</>
            </div>
            <p className="text-slate-600">Enter the 6-digit code. It expires in 2 minutes.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-slate-800">Verification code</Label>
            <Input
              id="otp"
              name="otp"
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="000000"
              autoComplete="one-time-code"
              className="h-12 bg-white text-center text-lg font-bold tracking-[0.5em] text-slate-900 border-slate-300 focus:border-blue-500"
            />
          </div>
          {countdown > 0 ? (
            <p className="text-center text-xs text-slate-500">Resend available in {countdown}s</p>
          ) : (
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setProvider(null);
                setOtp("");
              }}
              className="mx-auto block text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900"
            >
              Change contact / resend code
            </button>
          )}
          <Button type="submit" disabled={pending} className="w-full bg-[var(--primary)] py-2.5 text-white hover:bg-[var(--accent)]">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Verify &amp; create account
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-600">
        {pageConfig?.footerLoginTextEn ?? "Already have an account?"}{" "}
        <Link href="/login" className="font-semibold text-blue-600 underline underline-offset-4 hover:text-blue-700">
          {pageConfig?.alreadyHaveAccountEn ?? "Sign in"}
        </Link>
      </p>
      <Link href="/" className="mt-4 flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-700">
        <ArrowLeft className="size-3" />
        Back to home
      </Link>
    </div>
  );
}
