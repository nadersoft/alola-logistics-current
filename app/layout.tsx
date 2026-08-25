import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, Manrope, Poppins, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { getAllSettings } from "@/lib/settings";
import { buildTheme, getString, toSettingMap } from "@/lib/theme";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { FloatingActions } from "@/components/FloatingActions";
import { normalizeLocale } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins", display: "swap" });
const notoArabic = Noto_Sans_Arabic({ variable: "--font-arabic", display: "swap", subsets: ["arabic"] });

const BUNDLED_FONTS: Record<string, string> = {
  Inter: "var(--font-inter)",
  Manrope: "var(--font-manrope)",
  Poppins: "var(--font-poppins)",
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAllSettings();
  const map = toSettingMap(settings);
  const companyName = getString(map, "company.name", "Alola Logistics");
  return {
    title: { default: companyName, template: `%s · ${companyName}` },
    description: "Digital Freight Forwarding Platform",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getAllSettings();
  const theme = buildTheme(settings);
  const map = toSettingMap(settings);
  const cookieLocale = cookies().get("alola_locale")?.value;
  const locale = normalizeLocale(cookieLocale ?? getString(map, "defaults.language", "en"));

  const bundledFont = BUNDLED_FONTS[theme.fontFamily] ?? "var(--font-inter)";
  const fontStack =
    locale === "ar"
      ? `${notoArabic.style.fontFamily}, ${bundledFont}, ${inter.style.fontFamily}`
      : `${bundledFont}, ${inter.style.fontFamily}`;

  const floating = getFloatingProps(map);

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      suppressHydrationWarning
      style={
        {
          "--font-sans": fontStack,
          fontSize: `${theme.fontBaseSize}px`,
        } as React.CSSProperties
      }
    >
      <body className={`${inter.variable} ${manrope.variable} ${poppins.variable} ${notoArabic.variable} antialiased`}>
        <style dangerouslySetInnerHTML={{ __html: theme.css }} />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {floating.enabled && <FloatingActions {...floating} />}
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

function getFloatingProps(map: Record<string, unknown>): React.ComponentProps<typeof FloatingActions> {
  const bool = (key: string, legacy: string, fb: boolean) => {
    const v = map[key] ?? map[legacy];
    return typeof v === "boolean" ? v : fb;
  };
  const str = (key: string, legacy: string, fb: string) => {
    const v = map[key] ?? map[legacy];
    return typeof v === "string" && v.length > 0 ? v : fb;
  };
  return {
    enabled: bool("floating_enabled", "appearance.floatingEnabled", true),
    showWhatsapp: bool("show_whatsapp", "appearance.showWhatsapp", true),
    showCall: bool("show_call", "appearance.showCall", true),
    showLivechat: bool("show_livechat", "appearance.showLivechat", true),
    whatsappNumber: str("floating_whatsapp_number", "appearance.floatingWhatsappNumber", ""),
    callNumber: str("floating_call_number", "appearance.floatingCallNumber", ""),
    livechatUrl: str("floating_livechat_url", "appearance.floatingLivechatUrl", "/login"),
    whatsappMessage: str("floating_whatsapp_message", "appearance.floatingWhatsappMessage", "Hello Alola Logistics, I need a quote."),
    position: (str("floating_position", "appearance.floatingPosition", "right") as "left" | "right") === "left" ? "left" : "right",
    color: str("floating_color", "appearance.floatingColor", "#004fba"),
  };
}
