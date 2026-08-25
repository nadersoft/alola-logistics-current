import Link from "next/link";
import { cookies } from "next/headers";
import { Clock, Mail, MapPin, Phone, ShieldCheck, Star } from "lucide-react";
import { getAllSettings } from "@/lib/settings";
import { getString, getJson, toSettingMap } from "@/lib/theme";
import { normalizeLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/landing/navbar";
import { TrackForm } from "@/components/landing/track-form";
import { ServicesSection } from "@/components/sections/services-section";
import { Faq } from "@/components/landing/faq";
import { ContactForm } from "@/components/landing/contact-form";
import { Reveal } from "@/components/landing/reveal";
import { serviceIcon } from "@/components/landing/icons";
import { getSectionWithItems } from "@/lib/actions/cms";
import { formatNumber } from "@/lib/format";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { PhoneCallIcon } from "@/components/icons/phone-call";

export const dynamic = "force-dynamic";

type WhyUsItem = { icon: string; title: string; desc: string };

export default async function HomePage() {
  const settings = await getAllSettings();
  const map = toSettingMap(settings);

  const cookieLocale = cookies().get("alola_locale")?.value;
  const locale = normalizeLocale(cookieLocale ?? getString(map, "defaults.language", "en"));
  const companyName = getString(map, "company.name", "Alola Logistics");
  const companyAddress = getString(map, "company.address", "");
  const heroTitle = getString(map, "content.hero.title", "Global Trade Simplified");
  const heroSubtitle = getString(map, "content.hero.subtitle", "Fast, transparent freight forwarding powered by live rates.");
  const heroCta = getString(map, "content.hero.cta", "Get a Quote");
  const heroBadge = getString(map, "content.hero.badge", "Live Operations Active");
  const trackingPlaceholder = getString(
    map,
    "content.hero.trackingPlaceholder",
    "Enter container number, B/L, or booking reference..."
  );
  const trackingTitle = getString(map, "content.tracking.title", "Track Your Shipment");
  const phone = getString(map, "content.contact.phone", "+966 11 000 0000");
  const email = getString(map, "content.contact.email", "hello@alola.com");
  const whatsappNumber = getString(map, "floating_whatsapp_number", "") || getString(map, "appearance.floatingWhatsappNumber", "");
  const whatsappMessage = getString(map, "floating_whatsapp_message", "Hello Alola, I have a shipping inquiry.") || getString(map, "appearance.floatingWhatsappMessage", "Hello Alola, I have a shipping inquiry.");
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`
    : null;
  const phoneHref = phone ? `tel:${phone.replace(/\s/g, "")}` : null;

  const heroStats = getJson<{ value: string; label: string }[]>(map, "content.hero.stats", []);
  const whyUs = getJson<WhyUsItem[]>(map, "content.whyus", []);

  const [servicesSection, inTransit, partners, testimonials, faqs] = await Promise.all([
    getSectionWithItems("services_list"),
    prisma.shipment.count({
      where: { status: { in: ["CREATED", "PICKED_UP", "IN_TRANSIT", "CUSTOMS"] as never } },
    }),
    prisma.partner.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.testimonial.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.faq.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const serviceLinks = (servicesSection?.items ?? []).map((i) => ({ id: i.slug, title: i.titleEn }));

  const heroWords = heroTitle.split(" ");

  return (
    <main className="min-h-screen bg-[var(--alola-slate)] text-gray-800 antialiased">
      <Navbar companyName={companyName} cta={heroCta} locale={locale} />

      {/* ================= HERO ================= */}
      <section id="home" className="hero-bg relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute left-10 top-20 size-72 animate-pulse rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-20 right-10 size-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 size-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
          <div className="absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-32 text-center sm:px-6 lg:px-8">
          <div className="reveal is-visible">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-sm font-medium text-white/90">
                {heroBadge} — {formatNumber(inTransit)} Shipments in Transit
              </span>
            </div>

            <h1 className="mb-6 text-5xl font-bold tracking-tight text-white sm:text-7xl lg:text-8xl">
              {heroWords.length > 2 ? (
                <>
                  {heroWords.slice(0, -1).join(" ")}
                  <br />
                  <span className="bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
                    {heroWords.slice(-1).join(" ")}
                  </span>
                </>
              ) : (
                <>
                  {heroWords[0] ?? heroTitle}
                  <br />
                  <span className="bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
                    {heroWords.slice(1).join(" ") || "Simplified."}
                  </span>
                </>
              )}
            </h1>

            <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">{heroSubtitle}</p>

            <TrackForm placeholder={trackingPlaceholder} light />

            <div className="mt-16 flex flex-wrap justify-center gap-8 sm:gap-16">
              {heroStats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold text-white sm:text-4xl">{stat.value}</div>
                  <div className="mt-1 text-sm text-white/50">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="animate-float-y absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
          <div className="flex h-10 w-6 justify-center rounded-full border-2 border-white/30 pt-2">
            <div className="size-1.5 rounded-full bg-white" />
          </div>
        </div>
      </section>

      {/* ================= SERVICES ================= */}
      <section id="services" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-16 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-[var(--primary)]">Our Services</span>
            <h2 className="mt-3 text-4xl font-bold text-[var(--alola-dark)] sm:text-5xl">Multi-Modal Solutions</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-500">
              Comprehensive logistics services tailored to your cargo requirements, from single containers to full vessel charters.
            </p>
          </Reveal>
          <Reveal>
            <ServicesSection section={servicesSection} />
          </Reveal>
        </div>
      </section>

      {/* ================= LIVE TRACKING ================= */}
      <section id="tracking" className="bg-[var(--alola-slate)] py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-12 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-[var(--primary)]">Visibility</span>
            <h2 className="mt-3 text-4xl font-bold text-[var(--alola-dark)] sm:text-5xl">{trackingTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-500">
              Real-time shipment visibility across every milestone of your cargo journey.
            </p>
          </Reveal>
          <Reveal>
            <TrackForm placeholder={trackingPlaceholder} />
          </Reveal>
        </div>
      </section>

      {/* ================= WHY US ================= */}
      <section id="whyus" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-16 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-[var(--primary)]">Why Alola</span>
            <h2 className="mt-3 text-4xl font-bold text-[var(--alola-dark)] sm:text-5xl">The Logistics Partner You Can Trust</h2>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {whyUs.map((reason, i) => {
              const Icon = serviceIcon(reason.icon);
              return (
                <Reveal
                  key={i}
                  delay={i * 60}
                  className="group rounded-3xl bg-[var(--alola-slate)] p-8 transition-all duration-500 hover:bg-[var(--primary)]"
                >
                  <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10 transition-colors group-hover:bg-white/20">
                    <Icon className="size-7 text-[var(--primary)] transition-colors group-hover:text-white" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-[var(--alola-dark)] transition-colors group-hover:text-white">
                    {reason.title}
                  </h3>
                  <p className="leading-relaxed text-gray-600 transition-colors group-hover:text-white/80">{reason.desc}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= PARTNERS MARQUEE ================= */}
      {partners.length > 0 && (
        <section className="border-y bg-[var(--alola-slate)] py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="mb-8 text-center">
              <span className="text-sm font-semibold uppercase tracking-widest text-gray-500">Trusted Carriers &amp; Partners</span>
            </Reveal>
            <div className="marquee-mask overflow-hidden">
              <div className="animate-marquee flex w-max items-center gap-12">
                {[...partners, ...partners].map((p, i) =>
                  p.logoUrl ? (
                    <img
                      key={`${p.id}-${i}`}
                      src={p.logoUrl}
                      alt={p.name}
                      className="h-10 w-auto object-contain opacity-70 grayscale hover:opacity-100"
                    />
                  ) : (
                    <span key={`${p.id}-${i}`} className="text-xl font-bold tracking-tight text-gray-400">
                      {p.name}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= TESTIMONIALS ================= */}
      {testimonials.length > 0 && (
        <section className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="mb-16 text-center">
              <span className="text-sm font-semibold uppercase tracking-widest text-[var(--primary)]">Testimonials</span>
              <h2 className="mt-3 text-4xl font-bold text-[var(--alola-dark)] sm:text-5xl">What Our Clients Say</h2>
            </Reveal>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {testimonials.map((t, i) => (
                <Reveal key={t.id} delay={i * 60} className="card-hover flex flex-col rounded-3xl border bg-white p-6 shadow-sm">
                  <div className="mb-4 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={`size-4 ${s < t.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                      />
                    ))}
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-gray-600">&ldquo;{t.content}&rdquo;</p>
                  <div className="mt-5 border-t pt-4">
                    <div className="font-semibold text-[var(--alola-dark)]">{t.name}</div>
                    {t.company && <div className="text-xs text-gray-500">{t.company}</div>}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= FAQ ================= */}
      {faqs.length > 0 && (
        <section id="faq" className="bg-[var(--alola-slate)] py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="mb-12 text-center">
              <span className="text-sm font-semibold uppercase tracking-widest text-[var(--primary)]">FAQ</span>
              <h2 className="mt-3 text-4xl font-bold text-[var(--alola-dark)] sm:text-5xl">Frequently Asked Questions</h2>
            </Reveal>
            <Reveal>
              <Faq items={faqs} />
            </Reveal>
          </div>
        </section>
      )}

      {/* ================= CONTACT ================= */}
      <section id="contact" className="bg-[var(--alola-slate)] pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-16 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-[var(--primary)]">Contact</span>
            <h2 className="mt-3 text-4xl font-bold text-[var(--alola-dark)] sm:text-5xl">Get in Touch</h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-500">
              Our operations team is available 24/7 to handle your logistics inquiries.
            </p>
          </Reveal>
          <div className="grid gap-8 lg:grid-cols-2">
            <Reveal className="rounded-3xl border bg-white p-8 shadow-xl sm:p-10">
              <h3 className="mb-6 text-2xl font-bold text-[var(--alola-dark)]">Send a Message</h3>
              <ContactForm />
            </Reveal>
            <div className="space-y-4">
              {[
                { icon: Mail, title: "Email Us", lines: [email] },
                { icon: Phone, title: "Call Us", lines: [phone] },
                { icon: MapPin, title: "Visit Us", lines: companyAddress ? [companyAddress] : [companyName] },
                { icon: Clock, title: "Working Hours", lines: ["Operations: 24/7/365"] },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <Reveal
                    key={i}
                    delay={i * 60}
                    className="flex items-start gap-4 rounded-2xl border bg-white p-6"
                  >
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                      <Icon className="size-6 text-[var(--primary)]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[var(--alola-dark)]">{item.title}</h4>
                      {item.lines.map((line, j) => (
                        <p key={j} className="text-sm text-gray-500">
                          {line}
                        </p>
                      ))}
                    </div>
                  </Reveal>
                );
              })}
              <Reveal delay={240} className="rounded-2xl border border-[var(--primary)]/20 bg-white p-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="size-6 text-[var(--primary)]" />
                  <p className="text-sm text-gray-600">
                    Licensed freight forwarder. Need an instant rate?{" "}
                    <Link href="/quote" className="font-semibold text-[var(--primary)] hover:underline">
                      Get a quote
                    </Link>
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-[var(--alola-dark)] py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--primary)]">
                  <ShieldCheck className="size-6 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold">{companyName.toUpperCase().split(" ")[0] ?? "ALOLA"}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/50">Logistics</div>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-white/60">
                Global digital freight forwarding solutions. Connecting businesses to the world through innovative logistics technology.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Services</h4>
              <ul className="space-y-2 text-sm text-white/60">
                {serviceLinks.map((s) => (
                  <li key={s.id}>
                    <a href="#services" className="hover:text-white">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Company</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li>
                  <a href="#whyus" className="hover:text-white">
                    Why Alola
                  </a>
                </li>
                <li>
                  <a href="#tracking" className="hover:text-white">
                    Live Tracking
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-white">
                    Contact
                  </a>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white">
                    Client Portal
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Connect</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li>{phone}</li>
                <li>{email}</li>
                {companyAddress && <li>{companyAddress}</li>}
                {(phoneHref || whatsappHref) && (
                  <li className="flex gap-3 pt-2">
                    {phoneHref && (
                      <a
                        href={phoneHref}
                        aria-label="Call us"
                        title={phone}
                        className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-[var(--primary)]"
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
                        className="flex size-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                      >
                        <WhatsappIcon size={20} />
                      </a>
                    )}
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
            <p className="text-sm text-white/40">© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-white/40">
              <Link href="/quote" className="hover:text-white">
                Instant Quote
              </Link>
              <Link href="/login" className="hover:text-white">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
