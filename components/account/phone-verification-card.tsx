"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MessageSquareText, Send, ShieldCheck } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sendPhoneOtp, verifyPhone } from "@/lib/actions/account";
import { COUNTRIES_PHONE } from "@/lib/data/countries-with-phone";

const DEFAULT_DIAL_CODE = COUNTRIES_PHONE[0]?.dialCode ?? "+967";

const PROVIDER_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  console: "simulated console",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PhoneVerificationCard(_props?: { isDev?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, startTransition] = useTransition();
  const [countryCode, setCountryCode] = useState(DEFAULT_DIAL_CODE);
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  function onSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const data = new FormData();
      data.set("countryCode", countryCode);
      data.set("phone", phone);
      const res = await sendPhoneOtp(data);
      if (!res.ok) {
        toast.error(res.error ?? "Could not send the code.");
        return;
      }
      setProvider(res.provider ?? "console");
      setOtp("");
      setStep(2);
      toast.success(`Verification code sent via ${PROVIDER_LABEL[res.provider ?? "console"]}.`);
    });
  }

  function onVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const data = new FormData();
      data.set("countryCode", countryCode);
      data.set("phone", phone);
      data.set("otp", otp);
      const res = await verifyPhone(data);
      if (!res.ok) {
        toast.error(res.error ?? "Could not verify your phone.");
        return;
      }
      toast.success("Phone number verified.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WhatsappIcon size={18} />
          Verify your phone
        </CardTitle>
        <CardDescription>Add a mobile number so we can reach you and secure your account.</CardDescription>
      </CardHeader>
      <CardContent>
        {step === 1 ? (
          <form onSubmit={onSend} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile number</Label>
              <div className="flex gap-2">
                <select
                  id="countryCode"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="h-11 w-28 shrink-0 rounded-lg border bg-background px-2 text-sm outline-none"
                  aria-label="Country code"
                >
                  {COUNTRIES_PHONE.map((c) => (
                    <option key={c.code} value={c.dialCode}>
                      {c.flag} {c.dialCode}
                    </option>
                  ))}
                </select>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="7xxxxxxxx"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send verification code
            </Button>
          </form>
        ) : (
          <form onSubmit={onVerify} className="space-y-4">
            <div className="rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
              <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                <MessageSquareText className="size-4" />
                Code sent to {countryCode} {phone} via {PROVIDER_LABEL[provider ?? "console"]}
              </div>
              <p className="text-xs">Enter the 6-digit code. It expires in 2 minutes.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="otp">Verification code</Label>
              <Input
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                autoComplete="one-time-code"
                className="h-12 text-center text-lg font-bold tracking-[0.5em]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Verify phone
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setStep(1);
                  setProvider(null);
                  setOtp("");
                }}
              >
                Change number
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
