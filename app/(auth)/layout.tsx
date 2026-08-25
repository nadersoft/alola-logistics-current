import { getAllSettings } from "@/lib/settings";
import { getString, toSettingMap } from "@/lib/theme";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { PhoneCallIcon } from "@/components/icons/phone-call";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getAllSettings();
  const map = toSettingMap(settings);
  const phone = getString(map, "content.contact.phone", "+966 11 000 0000");
  const whatsappNumber = getString(map, "floating_whatsapp_number", "") || getString(map, "appearance.floatingWhatsappNumber", "");
  const whatsappMessage = getString(map, "floating_whatsapp_message", "Hello Alola, I have a shipping inquiry.") || getString(map, "appearance.floatingWhatsappMessage", "Hello Alola, I have a shipping inquiry.");
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`
    : null;
  const phoneHref = phone ? `tel:${phone.replace(/\s/g, "")}` : null;

  return (
    <main className="hero-bg relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 -top-16 size-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 right-0 size-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 size-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
      </div>
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6">
        {children}
        {(phoneHref || whatsappHref) && (
          <footer className="flex items-center gap-3">
            {phoneHref && (
              <a
                href={phoneHref}
                aria-label="Call us"
                title={phone}
                className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <PhoneCallIcon size={20} />
              </a>
            )}
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat on WhatsApp"
                title="WhatsApp"
                className="flex size-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <WhatsappIcon size={20} />
              </a>
            )}
          </footer>
        )}
      </div>
    </main>
  );
}
