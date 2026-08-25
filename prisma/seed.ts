import { PrismaClient } from "@prisma/client";
import { Category, Mode, PortType, Role, Tier } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SettingSeed = {
  key: string;
  value: unknown;
  category: Category;
  description?: string;
};

const SYSTEM_SETTINGS: SettingSeed[] = [
  // ---------- DEFAULTS ----------
  { key: "defaults.currency", value: "SAR", category: Category.DEFAULTS, description: "Display currency (ISO code)" },
  { key: "defaults.currencySymbol", value: "﷼", category: Category.DEFAULTS, description: "Display currency symbol" },
  { key: "defaults.language", value: "en", category: Category.DEFAULTS, description: "Default locale (en | ar)" },
  { key: "defaults.originPortCode", value: "JED", category: Category.DEFAULTS, description: "Default origin port code" },

  // ---------- COMPANY (CONTENT) ----------
  { key: "company.name", value: "Alola Logistics", category: Category.CONTENT, description: "Company display name" },
  { key: "company.cr", value: "1010-0000000", category: Category.CONTENT, description: "Commercial Registration (CR)" },
  { key: "company.address", value: "Riyadh, Saudi Arabia", category: Category.CONTENT, description: "Company address" },
  { key: "company.logoLight", value: "", category: Category.CONTENT, description: "Logo URL (light background)" },
  { key: "company.logoDark", value: "", category: Category.CONTENT, description: "Logo URL (dark background)" },
  { key: "company.favicon", value: "", category: Category.CONTENT, description: "Favicon URL" },

  // ---------- APPEARANCE ----------
  { key: "appearance.primary", value: "#004fba", category: Category.APPEARANCE, description: "Primary brand color" },
  { key: "appearance.accent", value: "#0055ff", category: Category.APPEARANCE, description: "Accent color" },
  { key: "appearance.background", value: "#f4f6fa", category: Category.APPEARANCE, description: "Page background color" },
  { key: "appearance.foreground", value: "#0f172a", category: Category.APPEARANCE, description: "Text color" },
  { key: "appearance.radius", value: "0.625rem", category: Category.APPEARANCE, description: "Border radius" },
  { key: "appearance.fontFamily", value: "Inter", category: Category.APPEARANCE, description: "UI font family" },
  { key: "appearance.fontBaseSize", value: 16, category: Category.APPEARANCE, description: "Base font size (px)" },

  // ---------- UX Kit tokens (Hero + Glass + Pulse) ----------
  { key: "appearance.heroGradientFrom", value: "#0a1628", category: Category.APPEARANCE, description: "Hero gradient — start color" },
  { key: "appearance.heroGradientMid", value: "#004fba", category: Category.APPEARANCE, description: "Hero gradient — middle color" },
  { key: "appearance.heroGradientTo", value: "#0055ff", category: Category.APPEARANCE, description: "Hero gradient — end color" },
  { key: "appearance.heroGradientAngle", value: 135, category: Category.APPEARANCE, description: "Hero gradient angle (deg)" },
  { key: "appearance.textGradientFrom", value: "#004fba", category: Category.APPEARANCE, description: "Gradient headline — start color" },
  { key: "appearance.textGradientTo", value: "#0055ff", category: Category.APPEARANCE, description: "Gradient headline — end color" },
  { key: "appearance.glassBg", value: "#ffffff", category: Category.APPEARANCE, description: "Glass panel base color" },
  { key: "appearance.glassBgOpacity", value: 85, category: Category.APPEARANCE, description: "Glass panel opacity (0–100%)" },
  { key: "appearance.glassBlur", value: 20, category: Category.APPEARANCE, description: "Glass panel blur (px)" },
  { key: "appearance.cardShadowColor", value: "#004fba", category: Category.APPEARANCE, description: "Card hover shadow color" },
  { key: "appearance.cardShadowOpacity", value: 25, category: Category.APPEARANCE, description: "Card hover shadow opacity (0–100%)" },
  { key: "appearance.cardLift", value: 4, category: Category.APPEARANCE, description: "Card hover lift (px)" },
  { key: "appearance.pulseColor", value: "#10b981", category: Category.APPEARANCE, description: "Live pulse ring color" },
  { key: "appearance.pulseDuration", value: 2, category: Category.APPEARANCE, description: "Pulse ring duration (s)" },
  { key: "appearance.marqueeDuration", value: 28, category: Category.APPEARANCE, description: "Partners marquee speed (s)" },
  { key: "floating_enabled", value: true, category: Category.APPEARANCE, description: "Master switch for floating action buttons" },
  { key: "show_whatsapp", value: true, category: Category.APPEARANCE, description: "Show floating WhatsApp button" },
  { key: "show_call", value: true, category: Category.APPEARANCE, description: "Show floating Call button" },
  { key: "show_livechat", value: true, category: Category.APPEARANCE, description: "Show floating Live Chat button" },
  { key: "floating_whatsapp_number", value: "966500000000", category: Category.APPEARANCE, description: "WhatsApp number for floating button (intl, digits only)" },
  { key: "floating_call_number", value: "+966 11 000 0000", category: Category.APPEARANCE, description: "Call number for floating button" },
  { key: "floating_livechat_url", value: "/login", category: Category.APPEARANCE, description: "Live Chat target URL" },
  { key: "floating_whatsapp_message", value: "Hello Alola Logistics, I need a quote.", category: Category.APPEARANCE, description: "Prefilled WhatsApp message" },
  { key: "floating_position", value: "right", category: Category.APPEARANCE, description: "Floating buttons side (left|right)" },
  { key: "floating_color", value: "#004fba", category: Category.APPEARANCE, description: "Floating buttons background color" },
  { key: "appearance.showWhatsapp", value: true, category: Category.APPEARANCE, description: "Show floating WhatsApp button (legacy key)" },
  { key: "appearance.showCall", value: true, category: Category.APPEARANCE, description: "Show floating Call button (legacy key)" },
  { key: "appearance.showLivechat", value: true, category: Category.APPEARANCE, description: "Show floating Live Chat button (legacy key)" },
  { key: "appearance.floatingWhatsappNumber", value: "966500000000", category: Category.APPEARANCE, description: "WhatsApp number (legacy key)" },
  { key: "appearance.floatingCallNumber", value: "+966 11 000 0000", category: Category.APPEARANCE, description: "Call number (legacy key)" },
  { key: "appearance.floatingLivechatUrl", value: "/login", category: Category.APPEARANCE, description: "Live Chat target URL (legacy key)" },
  { key: "appearance.floatingWhatsappMessage", value: "Hello Alola Logistics, I need a quote.", category: Category.APPEARANCE, description: "Prefilled WhatsApp message (legacy key)" },
  { key: "appearance.floatingPosition", value: "right", category: Category.APPEARANCE, description: "Floating buttons side (legacy key)" },
  { key: "appearance.floatingColor", value: "#004fba", category: Category.APPEARANCE, description: "Floating buttons background color (legacy key)" },
  { key: "limits.trackingPerMinute", value: 20, category: Category.DEFAULTS, description: "Tracking rate limit per minute per IP" },
  { key: "limits.contactPerMinute", value: 5, category: Category.DEFAULTS, description: "Contact form rate limit per minute per IP" },
  { key: "limits.quotePerMinute", value: 10, category: Category.DEFAULTS, description: "Instant quote rate limit per minute per IP" },

  // ---------- PRICING ----------
  {
    key: "pricing.surcharges",
    value: { baf: 150, thcOrigin: 100, thcDestination: 100, fuelPct: 8, insurancePct: 0.5, profitMarginPct: 5 },
    category: Category.PRICING,
    description: "Global surcharges applied on top of base rate",
  },
  { key: "pricing.currencyBase", value: "USD", category: Category.PRICING, description: "Currency that base rates are stored in" },
  { key: "pricing.quoteValidityHours", value: 24, category: Category.PRICING, description: "Quotation validity window (hours)" },

  // ---------- CONTENT (hero, tracking, contact) ----------
  { key: "content.hero.title", value: "Global Trade Simplified", category: Category.CONTENT, description: "Hero title" },
  { key: "content.hero.subtitle", value: "Fast, transparent freight forwarding powered by live rates.", category: Category.CONTENT, description: "Hero subtitle" },
  { key: "content.hero.cta", value: "Get a Quote", category: Category.CONTENT, description: "Hero call-to-action label" },
  { key: "content.tracking.title", value: "Track Your Shipment", category: Category.CONTENT, description: "Tracking section title" },
  { key: "content.contact.phone", value: "+966 11 000 0000", category: Category.CONTENT, description: "Contact phone" },
  { key: "content.contact.email", value: "hello@alola.com", category: Category.CONTENT, description: "Contact email" },
  { key: "content.hero.badge", value: "Live Operations Active", category: Category.CONTENT, description: "Hero live badge label" },
  { key: "content.hero.trackingPlaceholder", value: "Enter container number, B/L, or booking reference…", category: Category.CONTENT, description: "Hero tracking input placeholder" },
  {
    key: "content.hero.stats",
    value: [
      { value: "180+", label: "Countries" },
      { value: "12M+", label: "TEU Annually" },
      { value: "99.2%", label: "On-time Rate" },
      { value: "24/7", label: "Support" },
    ],
    category: Category.CONTENT,
    description: "Hero statistics (value + label)",
  },
  {
    key: "content.services",
    value: [
      { id: "fcl", title: "FCL Shipping", subtitle: "Full Container Load", icon: "container", description: "Exclusive 20' and 40' container management with guaranteed space allocation across major trade lanes.", specs: [{ label: "20' GP", value: "33.2 CBM", detail: "Max payload: 28,200 kg" }, { label: "40' GP", value: "67.7 CBM", detail: "Max payload: 26,680 kg" }, { label: "40' HC", value: "76.3 CBM", detail: "Max payload: 26,380 kg" }], features: ["Door-to-door tracking", "Customs pre-clearance", "Reefer & special cargo", "Real-time EDI updates"] },
      { id: "lcl", title: "LCL Shipping", subtitle: "Less than Container Load", icon: "boxes", description: "Consolidated cargo solutions with CBM-optimized loading and weekly sailings to 180+ destinations.", specs: [{ label: "Min Charge", value: "1 CBM", detail: "Equivalent to 1,000 kg" }, { label: "Max Height", value: "2.35m", detail: "Standard pallet height" }, { label: "Consolidation", value: "48h", detail: "Average warehouse dwell time" }], features: ["Weekly consolidation", "CFS to CFS delivery", "Cargo insurance", "Dangerous goods handling"] },
      { id: "bulk", title: "Bulk Shipping", subtitle: "Vessel Chartering", icon: "ship", description: "Dry bulk, breakbulk, and project cargo via chartered vessels with voyage and time charter options.", specs: [{ label: "Handysize", value: "30,000 DWT", detail: "Draft: 10.5m" }, { label: "Panamax", value: "80,000 DWT", detail: "Draft: 12.8m" }, { label: "Capesize", value: "180,000 DWT", detail: "Draft: 18.0m" }], features: ["Voyage chartering", "Port agency services", "Loading supervision", "B/L issuance"] },
      { id: "air", title: "Air Shipping", subtitle: "Priority Express", icon: "plane", description: "Time-critical air freight with express, standard, and deferred service tiers across 300+ airports.", specs: [{ label: "Chargeable Wt", value: "1:6 Ratio", detail: "L:W:H / 6,000" }, { label: "Express", value: "24-48h", detail: "Door-to-door" }, { label: "Standard", value: "3-5 days", detail: "Airport-to-airport" }], features: ["IATA certified", "Temperature control", "AOG support", "Charter broker"] },
      { id: "customs", title: "Customs Clearance", subtitle: "HS Code & Documentation", icon: "file-check", description: "End-to-end customs brokerage with automated HS classification and document compliance verification.", specs: [{ label: "HS Codes", value: "98 Chapters", detail: "Full tariff coverage" }, { label: "Avg Clearance", value: "4.2h", detail: "Electronic submission" }, { label: "Compliance", value: "99.7%", detail: "First-time pass rate" }], features: ["HS code lookup", "Duty drawback", "Bonded warehouse", "AEO certification"] },
      { id: "local", title: "Local Transportation", subtitle: "Last-Mile Drayage", icon: "truck", description: "Integrated overland logistics with FTL, LTL, and dedicated fleet services for container drayage.", specs: [{ label: "Fleet Size", value: "450+", detail: "Own & contracted" }, { label: "Coverage", value: "12 Hubs", detail: "Regional gateways" }, { label: "Avg Transit", value: "6h", detail: "Port-to-warehouse" }], features: ["Real-time GPS", "Electronic POD", "Cross-docking", "Reverse logistics"] },
    ],
    category: Category.CONTENT,
    description: "Services section content (tabs + specs + features)",
  },
  {
    key: "content.whyus",
    value: [
      { icon: "shield", title: "Trusted Compliance", desc: "AEO certified customs broker with 99.7% first-time clearance rate across all major ports." },
      { icon: "globe", title: "Global Network", desc: "Direct contracts with top 20 ocean carriers and strategic partnerships with 300+ airlines." },
      { icon: "bar-chart", title: "Data-Driven", desc: "AI-powered route optimization and predictive analytics for cost and transit time efficiency." },
      { icon: "users", title: "Dedicated Teams", desc: "Named account managers with 24/7 availability and local expertise in 45 countries." },
      { icon: "credit-card", title: "Transparent Pricing", desc: "All-inclusive quotes with no hidden fees. Real-time cost breakdown before booking." },
      { icon: "activity", title: "Real-Time Visibility", desc: "GPS-enabled tracking from origin to destination with automated milestone alerts." },
    ],
    category: Category.CONTENT,
    description: "Why-us section content (icon + title + description)",
  },

  // ---------- INTEGRATION (empty → unset; stored encrypted when filled) ----------
  { key: "integration.exchangeRate.apiKey", value: "", category: Category.INTEGRATION, description: "ExchangeRate API key" },
  { key: "integration.mapbox.publicToken", value: "", category: Category.INTEGRATION, description: "Mapbox public token" },
  { key: "integration.mapbox.secretKey", value: "", category: Category.INTEGRATION, description: "Mapbox secret key" },
  { key: "integration.mapbox.token", value: "", category: Category.INTEGRATION, description: "Mapbox GL token (Command Center → Integrations)" },
  { key: "integration.ship24.api_key", value: "", category: Category.INTEGRATION, description: "Ship24 API key (auto-poll tracking)" },
  { key: "integration.tracking.provider", value: "ship24", category: Category.INTEGRATION, description: "Tracking provider (ship24 | marineTraffic)" },
  { key: "integration.tracking.apiKey", value: "", category: Category.INTEGRATION, description: "Tracking API key (legacy)" },
  { key: "integration.twilio.sid", value: "", category: Category.INTEGRATION, description: "Twilio account SID" },
  { key: "integration.twilio.token", value: "", category: Category.INTEGRATION, description: "Twilio auth token (Command Center → Integrations)" },
  { key: "integration.twilio.authToken", value: "", category: Category.INTEGRATION, description: "Twilio auth token (legacy)" },
  { key: "integration.twilio.from", value: "", category: Category.INTEGRATION, description: "Twilio sender number" },
  { key: "integration.whatsapp.key", value: "", category: Category.INTEGRATION, description: "WhatsApp Business / Twilio WhatsApp key" },
  { key: "tracking.portGeo", value: { JED: [21.2854, 39.1575], DMM: [26.5039, 50.1129], DXB: [24.9826, 55.0531], RUH: [24.9577, 46.6986], LHR: [51.47, -0.4543] }, category: Category.INTEGRATION, description: "Port code → [lat, lng] for tracking map" },
  { key: "ship24.pollIntervalMinutes", value: 60, category: Category.INTEGRATION, description: "Ship24 auto-poll interval (minutes)" },
  { key: "integration.moyasar.secretKey", value: "", category: Category.INTEGRATION, description: "Moyasar secret key" },

  // ---------- GUIDE (point 12 — tied to Backups) ----------
  { key: "guide.version", value: "1.0.0", category: Category.DEFAULTS, description: "Live guide version (increments with each Backup)" },
];

const COUNTRIES = [
  { code: "SA", name: "Saudi Arabia", dialCode: "+966" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971" },
  { code: "EG", name: "Egypt", dialCode: "+20" },
  { code: "TR", name: "Turkey", dialCode: "+90" },
  { code: "GB", name: "United Kingdom", dialCode: "+44" },
  { code: "SG", name: "Singapore", dialCode: "+65" },
  { code: "YE", name: "Yemen", dialCode: "+967" },
];

const PORTS = [
  { code: "JED", name: "Jeddah Islamic Port", countryCode: "SA", type: PortType.SEA },
  { code: "DMM", name: "King Abdulaziz Port", countryCode: "SA", type: PortType.SEA },
  { code: "RUH", name: "King Khalid Intl Airport", countryCode: "SA", type: PortType.AIR },
  { code: "DXB", name: "Jebel Ali Port", countryCode: "AE", type: PortType.SEA },
  { code: "CAI", name: "Port Said", countryCode: "EG", type: PortType.SEA },
  { code: "IST", name: "Port of Istanbul", countryCode: "TR", type: PortType.SEA },
  { code: "LHR", name: "London Heathrow", countryCode: "GB", type: PortType.AIR },
  { code: "SIN", name: "Port of Singapore", countryCode: "SG", type: PortType.SEA },
];

const CURRENCIES = [
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", rate: 1, isDefault: true },
  { code: "USD", name: "US Dollar", symbol: "$", rate: 3.75, isDefault: false },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", rate: 1.0211, isDefault: false },
  { code: "EGP", name: "Egyptian Pound", symbol: "£", rate: 0.1177, isDefault: false },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", rate: 0.1092, isDefault: false },
  { code: "GBP", name: "British Pound", symbol: "£", rate: 4.75, isDefault: false },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", rate: 2.81, isDefault: false },
];

const FIELD_DEFINITIONS = [
  { key: "dg", label: "Dangerous goods", type: "number", appliesTo: "ALL", icon: "flame", unit: "SAR", defaultValue: 250, isEnabled: true, sortOrder: 1 },
  { key: "reefer", label: "Reefer", type: "number", appliesTo: "FCL", icon: "snowflake", unit: "SAR", defaultValue: 300, isEnabled: true, sortOrder: 2 },
  { key: "insurance", label: "Insurance", type: "number", appliesTo: "ALL", icon: "shield", unit: "%", defaultValue: 0.5, isEnabled: true, sortOrder: 3 },
  { key: "handling", label: "Handling", type: "number", appliesTo: "ALL", icon: "package", unit: "SAR", defaultValue: 100, isEnabled: true, sortOrder: 4 },
  { key: "documentation", label: "Documentation", type: "number", appliesTo: "ALL", icon: "file-text", unit: "SAR", defaultValue: 60, isEnabled: true, sortOrder: 5 },
];

const CARRIERS = [
  { code: "MSC", name: "Mediterranean Shipping Co." },
  { code: "MSK", name: "Maersk Line" },
  { code: "CMA", name: "CMA CGM" },
  { code: "SV", name: "Saudia Cargo" },
  { code: "EK", name: "Emirates SkyCargo" },
  { code: "AX", name: "Aramex Express" },
];

const CONTAINER_TYPES = [
  { code: "20GP", name: "20ft Dry Container", teu: 1 },
  { code: "40GP", name: "40ft Dry Container", teu: 2 },
  { code: "40HC", name: "40ft High Cube", teu: 2 },
];

const PARTNERS = [
  { name: "Mediterranean Shipping Co.", sortOrder: 0 },
  { name: "Maersk Line", sortOrder: 1 },
  { name: "CMA CGM", sortOrder: 2 },
  { name: "Saudia Cargo", sortOrder: 3 },
  { name: "Emirates SkyCargo", sortOrder: 4 },
  { name: "Aramex Express", sortOrder: 5 },
];

const TESTIMONIALS = [
  { name: "Khalid Al-Harbi", company: "Red Sea Trading Co.", content: "Alola cut our door-to-door transit times by 30%. The live tracking removed all guesswork from our supply chain.", rating: 5, sortOrder: 0 },
  { name: "Sara Al-Amoudi", company: "Noor Imports", content: "Instant quotes and zero hidden fees. We finally know the real landed cost before we ship.", rating: 5, sortOrder: 1 },
  { name: "Omar Farouk", company: "Delta Textiles", content: "Their customs team cleared our first container in under 24 hours. Exceptional support around the clock.", rating: 4, sortOrder: 2 },
  { name: "Layla Haddad", company: "Levant Foods", content: "The quoting engine is brilliant — we compared FCL vs LCL instantly and saved 22% on our regular lane.", rating: 5, sortOrder: 3 },
];

const FAQS = [
  { question: "How do I get a quote?", answer: "Use the instant quote tool on the home page or inside your dashboard. Select your mode (FCL, LCL, Air, Bulk), enter your cargo details, and you'll see a live all-inclusive price with a 24-hour validity.", sortOrder: 0 },
  { question: "What does the price include?", answer: "Base freight plus transparent surcharges (BAF, THC origin/destination, fuel, insurance and margin). You always see the full breakdown before booking — no hidden fees.", sortOrder: 1 },
  { question: "How can I track my shipment?", answer: "Enter your booking reference or container number in the tracking box on the home page, or use the Live Tracking section inside your client portal for milestone-level visibility.", sortOrder: 2 },
  { question: "Do you handle customs clearance?", answer: "Yes. Our brokerage team provides HS-code classification, duty drawback and bonded warehouse services with a 99.7% first-time clearance rate.", sortOrder: 3 },
  { question: "What is the difference between FCL and LCL?", answer: "FCL (Full Container Load) means your cargo occupies an entire container. LCL (Less than Container Load) consolidates your cargo with others, billed by CBM — ideal for smaller shipments.", sortOrder: 4 },
  { question: "Can I get support outside business hours?", answer: "Our operations team is available 24/7/365 via the live chat widget, phone, or by opening a support ticket from the contact section.", sortOrder: 5 },
];

// JED → DMM FCL rates (USD) per container type × tier
const FCL_RATES: Record<string, Record<Tier, number>> = {
  "20GP": { ECONOMY: 1000, STANDARD: 1200, EXPRESS: 1500 },
  "40GP": { ECONOMY: 1500, STANDARD: 1800, EXPRESS: 2200 },
  "40HC": { ECONOMY: 1600, STANDARD: 1900, EXPRESS: 2300 },
};

// All quote-engine rates (USD). LCL is per CBM, AIR is per kg, FCL per container.
type RateSeed = {
  from: string;
  to: string;
  mode: Mode;
  container?: string | null;
  tiers: Record<Tier, number>;
};

const RATES: RateSeed[] = [
  ...Object.entries(FCL_RATES).map(([container, tiers]) => ({
    from: "JED",
    to: "DMM",
    mode: Mode.FCL as Mode,
    container,
    tiers,
  })),
  { from: "JED", to: "DMM", mode: Mode.LCL, container: null, tiers: { ECONOMY: 55, STANDARD: 70, EXPRESS: 95 } },
  { from: "JED", to: "DXB", mode: Mode.LCL, container: null, tiers: { ECONOMY: 60, STANDARD: 78, EXPRESS: 105 } },
  { from: "JED", to: "RUH", mode: Mode.AIR, container: null, tiers: { ECONOMY: 1.6, STANDARD: 2.1, EXPRESS: 2.9 } },
  { from: "JED", to: "LHR", mode: Mode.AIR, container: null, tiers: { ECONOMY: 2.8, STANDARD: 3.6, EXPRESS: 4.9 } },
];

async function main() {
  console.log("Seeding started…");

  // ADMIN account (from env, safe dev default)
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@alola.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Alola_Admin_2026!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.SUPER_ADMIN, passwordHash },
    create: { email: adminEmail, name: "Alola Admin", role: Role.SUPER_ADMIN, passwordHash },
  });
  console.log(`✓ ADMIN: ${adminEmail}`);

  // Countries (feature 6 — country & port master data)
  const countryMap: Record<string, string> = {};
  for (const c of COUNTRIES) {
    const country = await prisma.country.upsert({
      where: { code: c.code },
      update: { name: c.name, dialCode: c.dialCode },
      create: c,
    });
    countryMap[c.code] = country.id;
  }
  console.log(`✓ Countries: ${COUNTRIES.length}`);

  // Currencies (feature 7)
  for (const c of CURRENCIES) {
    await prisma.currency.upsert({ where: { code: c.code }, update: c, create: c });
  }
  console.log(`✓ Currencies: ${CURRENCIES.length}`);

  // Ports (linked to Country relation)
  for (const p of PORTS) {
    const { countryCode, ...rest } = p;
    const data = { ...rest, countryId: countryMap[countryCode] };
    await prisma.port.upsert({ where: { code: p.code }, update: data, create: data });
  }
  console.log(`✓ Ports: ${PORTS.length}`);

  // Field definitions (feature 4 — smart field engine)
  const fieldMap: Record<string, string> = {};
  for (const f of FIELD_DEFINITIONS) {
    const field = await prisma.fieldDefinition.upsert({
      where: { key: f.key },
      update: { label: f.label, type: f.type, appliesTo: f.appliesTo, icon: f.icon, unit: f.unit, defaultValue: f.defaultValue, isEnabled: f.isEnabled, sortOrder: f.sortOrder },
      create: f,
    });
    fieldMap[f.key] = field.id;
  }
  console.log(`✓ FieldDefinitions: ${FIELD_DEFINITIONS.length}`);

  // Pricing rules (feature 5/9) — idempotent by name
  const rJed = await prisma.port.findUnique({ where: { code: "JED" } });
  const rDmm = await prisma.port.findUnique({ where: { code: "DMM" } });
  const rGph = await prisma.containerType.findUnique({ where: { code: "40GP" } });
  if (rJed && rDmm && rGph) {
    const existing = await prisma.pricingRule.findFirst({
      where: { name: "FCL — Jeddah → Dammam (40GP)" },
      include: { fields: true },
    });
    if (!existing) {
      await prisma.pricingRule.create({
        data: {
          name: "FCL — Jeddah → Dammam (40GP)",
          originPortId: rJed.id,
          destinationPortId: rDmm.id,
          mode: Mode.FCL,
          containerTypeId: rGph.id,
          minWeightKg: 10000,
          maxWeightKg: 28000,
          priority: 100,
          baseRate: 1800,
          weightRate: 0,
          fobExwType: "FOB",
          fobExwRate: 120,
          fields: {
            create: [
              { fieldId: fieldMap["dg"], value: 250, isEnabled: true },
              { fieldId: fieldMap["handling"], value: 100, isEnabled: true },
              { fieldId: fieldMap["documentation"], value: 60, isEnabled: true },
              { fieldId: fieldMap["insurance"], value: 0.5, isEnabled: true },
            ],
          },
        },
      });
      console.log("✓ PricingRule: FCL — Jeddah → Dammam (40GP)");
    } else {
      console.log("✓ PricingRule already present");
    }
  }

  // Carriers
  for (const c of CARRIERS) {
    await prisma.carrier.upsert({ where: { code: c.code }, update: c, create: c });
  }
  console.log(`✓ Carriers: ${CARRIERS.length}`);

  // Container types
  for (const c of CONTAINER_TYPES) {
    await prisma.containerType.upsert({ where: { code: c.code }, update: c, create: c });
  }
  console.log(`✓ Container types: ${CONTAINER_TYPES.length}`);

  // System settings
  for (const s of SYSTEM_SETTINGS) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value as object, category: s.category, description: s.description },
      create: { key: s.key, value: s.value as object, category: s.category, description: s.description },
    });
  }
  console.log(`✓ SystemSettings: ${SYSTEM_SETTINGS.length}`);

  // Partners (marquee) — only if empty
  if ((await prisma.partner.count()) === 0) {
    for (const p of PARTNERS) await prisma.partner.create({ data: p });
    console.log(`✓ Partners: ${PARTNERS.length}`);
  }

  // Testimonials — only if empty
  if ((await prisma.testimonial.count()) === 0) {
    for (const t of TESTIMONIALS) await prisma.testimonial.create({ data: t });
    console.log(`✓ Testimonials: ${TESTIMONIALS.length}`);
  }

  // FAQs — only if empty
  if ((await prisma.faq.count()) === 0) {
    for (const f of FAQS) await prisma.faq.create({ data: f });
    console.log(`✓ FAQs: ${FAQS.length}`);
  }

  // Exchange rates (1 unit of currency → defaults.currency). USD base.
  await prisma.exchangeRate.upsert({
    where: { currency: "USD" },
    update: { rate: 3.75, buyRate: 3.72, sellRate: 3.78, autoUpdate: false },
    create: { currency: "USD", rate: 3.75, buyRate: 3.72, sellRate: 3.78, autoUpdate: false },
  });
  await prisma.exchangeRate.upsert({
    where: { currency: "SAR" },
    update: { rate: 1, buyRate: 1, sellRate: 1, autoUpdate: false },
    create: { currency: "SAR", rate: 1, buyRate: 1, sellRate: 1, autoUpdate: false },
  });
  console.log("✓ ExchangeRates: USD, SAR");

  // Shipping rates (FCL per container, LCL per CBM, AIR per kg) — idempotent per lane
  let ratesCreated = 0;
  for (const seed of RATES) {
    const from = await prisma.port.findUnique({ where: { code: seed.from } });
    const to = await prisma.port.findUnique({ where: { code: seed.to } });
    if (!from || !to) {
      console.warn(`  ⚠ rate skipped (missing port): ${seed.from} → ${seed.to}`);
      continue;
    }
    const container = seed.container
      ? await prisma.containerType.findUnique({ where: { code: seed.container } })
      : null;
    if (seed.container && !container) continue;

    for (const [tier, baseCost] of Object.entries(seed.tiers) as [Tier, number][]) {
      const exists = await prisma.shippingRate.findFirst({
        where: {
          originPortId: from.id,
          destinationPortId: to.id,
          mode: seed.mode,
          containerTypeId: container?.id ?? null,
          tier,
        },
      });
      if (!exists) {
        await prisma.shippingRate.create({
          data: {
            originPortId: from.id,
            destinationPortId: to.id,
            mode: seed.mode,
            containerTypeId: container?.id ?? null,
            tier,
            baseCost,
          },
        });
        ratesCreated += 1;
      }
    }
  }
  console.log(`✓ ShippingRates: ${ratesCreated} created, ${RATES.length * 3 - ratesCreated} already present`);

  // Demo shipments (realistic timeline) — skipped if already present
  const jed = await prisma.port.findUnique({ where: { code: "JED" } });
  const dxb = await prisma.port.findUnique({ where: { code: "DXB" } });
  const lhr = await prisma.port.findUnique({ where: { code: "LHR" } });
  const msk = await prisma.carrier.findUnique({ where: { code: "MSK" } });
  const hc = await prisma.containerType.findUnique({ where: { code: "40HC" } });

  const demoCustomer = await prisma.customer.findFirst({ where: { name: "SaudiTech Trading Co." } });
  if (!demoCustomer) {
    await prisma.customer.create({
      data: { name: "SaudiTech Trading Co.", company: "SaudiTech", email: "ops@sauditech.example", phone: "+966 50 000 1234", taxId: "300000000000003" },
    });
    console.log("✓ Customer: SaudiTech Trading Co.");
  }

  const demoShip1 = await prisma.shipment.findUnique({ where: { shipmentNumber: "ALO-2026-0007" } });
  if (!demoShip1 && jed && dxb && msk && hc) {
    const customer = await prisma.customer.findFirst({ where: { name: "SaudiTech Trading Co." } });
    if (customer) {
      await prisma.shipment.create({
        data: {
          shipmentNumber: "ALO-2026-0007",
          customerId: customer.id,
          mode: Mode.FCL,
          originPortId: jed.id,
          destinationPortId: dxb.id,
          containerTypeId: hc.id,
          tier: Tier.STANDARD,
          status: "IN_TRANSIT",
          carrierId: msk.id,
          trackingNumber: "MSCU4471280",
          trackingProvider: "ship24",
          eta: new Date(Date.now() + 6 * 86400000),
          events: {
            create: [
              { status: "CREATED", location: "Jeddah, SA", note: "Booking confirmed by Alola Logistics", occurredAt: new Date(Date.now() - 9 * 86400000) },
              { status: "PICKED_UP", location: "Jeddah, SA", note: "Container MSCU 44712-8 stuffed and sealed", occurredAt: new Date(Date.now() - 7 * 86400000) },
              { status: "IN_TRANSIT", location: "Red Sea", note: "Vessel departed Jeddah — ETA Jebel Ali per carrier schedule", occurredAt: new Date(Date.now() - 2 * 86400000) },
            ],
          },
        },
      });
      console.log("✓ Shipment ALO-2026-0007 (IN_TRANSIT)");
    }
  } else if (demoShip1) {
    await prisma.shipment.update({
      where: { id: demoShip1.id },
      data: {
        status: "IN_TRANSIT",
        trackingNumber: "MSCU4471280",
        trackingProvider: "ship24",
        eta: new Date(Date.now() + 6 * 86400000),
      },
    });
    console.log("✓ Shipment ALO-2026-0007 (tracking fields refreshed)");
  }

  const demoShip2 = await prisma.shipment.findUnique({ where: { shipmentNumber: "ALO-2026-0002" } });
  if (!demoShip2 && jed && lhr) {
    const customer = await prisma.customer.findFirst({ where: { name: "SaudiTech Trading Co." } });
    if (customer) {
      await prisma.shipment.create({
        data: {
          shipmentNumber: "ALO-2026-0002",
          customerId: customer.id,
          mode: Mode.AIR,
          originPortId: jed.id,
          destinationPortId: lhr.id,
          tier: Tier.EXPRESS,
          status: "DELIVERED",
          carrierId: (await prisma.carrier.findUnique({ where: { code: "EK" } }))?.id,
          eta: new Date(Date.now() - 5 * 86400000),
          events: {
            create: [
              { status: "CREATED", location: "Jeddah, SA", note: "Booking confirmed by Alola Logistics", occurredAt: new Date(Date.now() - 21 * 86400000) },
              { status: "PICKED_UP", location: "Jeddah, SA", note: "Air waybill issued — 1 pallet, 620 kg", occurredAt: new Date(Date.now() - 19 * 86400000) },
              { status: "IN_TRANSIT", location: "Heathrow, GB", note: "Flight SV-113 arrived at London Heathrow", occurredAt: new Date(Date.now() - 17 * 86400000) },
              { status: "CUSTOMS", location: "Heathrow, GB", note: "Cleared by UK customs (HSC 8517.13)", occurredAt: new Date(Date.now() - 16 * 86400000) },
              { status: "DELIVERED", location: "London, GB", note: "Signed by consignee", occurredAt: new Date(Date.now() - 15 * 86400000) },
            ],
          },
        },
      });
      console.log("✓ Shipment ALO-2026-0002 (DELIVERED)");
    }
  }

  // Demo quote (PENDING, bookable), invoice (SENT), and support tickets
  const customer = await prisma.customer.findFirst({ where: { name: "SaudiTech Trading Co." } });
  const mskSeed = await prisma.carrier.findUnique({ where: { code: "MSK" } });

  if (customer && jed && dxb && hc) {
    const demoQuote = await prisma.quote.findFirst({ where: { quoteNumber: "Q-2026-0102" } });
    if (!demoQuote) {
      await prisma.quote.create({
        data: {
          quoteNumber: "Q-2026-0102",
          customerId: customer.id,
          mode: Mode.FCL,
          originPortId: jed.id,
          destinationPortId: dxb.id,
          containerTypeId: hc.id,
          tier: Tier.STANDARD,
          status: "PENDING",
          cargo: { weight: 18500, volume: 62, containers: 1, commodity: "Electronics & machinery spares" },
          baseCost: 1750,
          surcharges: { "ocean freight": 1350, "origin handling": 220, "destination handling": 180, documentation: 60 },
          total: 3560,
          currency: "USD",
          validUntil: new Date(Date.now() + 14 * 86400000),
        },
      });
      console.log("✓ Quote Q-2026-0102 (PENDING, bookable)");
    }

    const demoShip1 = await prisma.shipment.findUnique({ where: { shipmentNumber: "ALO-2026-0007" } });
    const existingInv = await prisma.invoice.findFirst({ where: { invoiceNumber: "INV-2026-0001" } });
    if (!existingInv && demoShip1) {
      await prisma.invoice.create({
        data: {
          invoiceNumber: "INV-2026-0001",
          customerId: customer.id,
          shipmentId: demoShip1.id,
          status: "SENT",
          subtotal: 3560,
          taxes: 534,
          total: 4094,
          currency: "USD",
          items: [
            { description: "Ocean freight — Jeddah → Jebel Ali (1×40HC)", qty: 1, unitPrice: 3560, amount: 3560 },
            { description: "VAT (15%)", qty: 1, unitPrice: 534, amount: 534 },
          ],
          notes: "Payment due within 14 days of issue.",
          dueDate: new Date(Date.now() + 14 * 86400000),
        },
      });
      console.log("✓ Invoice INV-2026-0001 (SENT)");
    }
  }

  if (customer && mskSeed) {
    const demoTicket = await prisma.ticket.findFirst({ where: { number: "TCK-2026-0001" } });
    if (!demoTicket) {
      await prisma.ticket.create({
        data: {
          number: "TCK-2026-0001",
          customerName: "SaudiTech Trading Co.",
          customerEmail: customer.email,
          subject: "Please hold shipment ALO-2026-0007 for customs inspection",
          message: "Our customs broker needs the vessel to be held at Jebel Ali until Tuesday. Is that possible?",
          status: "OPEN",
          priority: "HIGH",
          assigneeId: (await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } }))?.id ?? null,
          messages: {
            create: [{ authorName: "SaudiTech Trading Co.", body: "Our customs broker needs the vessel to be held at Jebel Ali until Tuesday. Is that possible?" }],
          },
        },
      });
      console.log("✓ Ticket TCK-2026-0001 (OPEN, HIGH)");
    }
  }

  // Demo client users (login to the customer portal)
  const clientPasswordHash = await bcrypt.hash("demo1234", 10);
  const saudiTech = await prisma.customer.findFirst({ where: { name: "SaudiTech Trading Co." } });
  if (saudiTech && saudiTech.email) {
    const existingClient = await prisma.user.findUnique({ where: { email: saudiTech.email } });
    if (!existingClient) {
      await prisma.user.create({
        data: { name: "SaudiTech Trading Co.", email: saudiTech.email, role: Role.CLIENT, passwordHash: clientPasswordHash },
      });
      console.log("✓ Client user: ops@sauditech.example (password: demo1234)");
    }
  }

  // Registration page config (registration builder) — zero hardcode defaults
  await prisma.registrationPageConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      pageTitleAr: "إنشاء حساب جديد",
      pageTitleEn: "Create new account",
      pageSubtitleAr: "أدخل بياناتك لإنشاء حسابك في منصة علاوة",
      pageSubtitleEn: "Enter your details to create your Alola account",
      submitButtonAr: "إرسال الكود",
      submitButtonEn: "Send code",
      footerLoginTextAr: "لديك حساب بالفعل؟",
      footerLoginTextEn: "Already have an account?",
      alreadyHaveAccountAr: "تسجيل الدخول",
      alreadyHaveAccountEn: "Sign in",
      successToastAr: "تم إرسال رمز التحقق بنجاح",
      successToastEn: "Verification code sent successfully",
      errorGeneralAr: "حدث خطأ. حاول مرة أخرى",
      errorGeneralEn: "Something went wrong. Try again",
    },
  });

  await prisma.registrationFieldConfig.createMany({
    data: [
      { fieldKey: "fullName", labelAr: "الاسم الكامل", labelEn: "Full name", order: 1, isRequired: true, isVisible: true, isActive: true, allowNumbers: false },
      { fieldKey: "email", labelAr: "الإيميل", labelEn: "Email", order: 2, isRequired: true, isVisible: true, isActive: true },
      { fieldKey: "phone", labelAr: "الجوال", labelEn: "Phone", order: 3, isRequired: false, isVisible: true, isActive: true },
      { fieldKey: "password", labelAr: "كلمة المرور", labelEn: "Password", order: 4, isRequired: true, isVisible: true, isActive: true },
    ],
    skipDuplicates: true,
  });
  console.log("✓ RegistrationPageConfig: default");
  console.log("✓ RegistrationFieldConfig: fullName, email, phone, password");

  // ---------- Unified CMS (page builder) ----------
  type CmsItemSeed = {
    slug: string;
    icon?: string;
    titleAr: string;
    titleEn: string;
    shortLabelAr?: string;
    shortLabelEn?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    value?: string;
    subValue?: string;
  };

  type CmsSectionSeed = {
    key: string;
    type: string;
    order?: number;
    badgeAr?: string;
    badgeEn?: string;
    titleAr?: string;
    titleEn?: string;
    subtitleAr?: string;
    subtitleEn?: string;
    contentAr?: string;
    contentEn?: string;
    items?: CmsItemSeed[];
  };

  type CmsPageSeed = {
    slug: string;
    titleAr: string;
    titleEn: string;
    sections: CmsSectionSeed[];
  };

  const CMS_SEEDS: CmsPageSeed[] = [
    {
      slug: "home",
      titleAr: "الرئيسية",
      titleEn: "Home",
      sections: [
        {
          key: "hero",
          type: "hero",
          order: 1,
          badgeAr: "عمليات حية نشطة",
          badgeEn: "Live Operations Active",
          titleAr: "تجارة عالمية مبسطة",
          titleEn: "Global Trade Simplified",
          subtitleAr: "شحن سريع وشفاف مدعوم بأسعار فورية.",
          subtitleEn: "Fast, transparent freight forwarding powered by live rates.",
          contentAr: "أسعار فورية وتتبع لحظي وتخليص جمركي مسبق في أكثر من 180 دولة.",
          contentEn: "Live rates, real-time tracking and customs pre-clearance across 180+ countries.",
        },
        {
          key: "stats",
          type: "stats",
          order: 2,
          items: [
            { slug: "countries", value: "180+", titleAr: "دولة", titleEn: "Countries" },
            { slug: "teu", value: "12M+", titleAr: "حاوية سنويًا", titleEn: "TEU Annually" },
            { slug: "ontime", value: "99.2%", titleAr: "نسبة الالتزام", titleEn: "On-time Rate" },
            { slug: "support", value: "24/7", titleAr: "دعم", titleEn: "Support" },
          ],
        },
      ],
    },
    {
      slug: "services",
      titleAr: "خدماتنا",
      titleEn: "Services",
      sections: [
        {
          key: "header",
          type: "header",
          order: 1,
          badgeAr: "خدماتنا",
          badgeEn: "Our Services",
          titleAr: "حلول متعددة الوسائط",
          titleEn: "Multi-Modal Solutions",
          subtitleAr: "خدمات لوجستية شاملة مصممة وفق متطلبات شحنتك.",
          subtitleEn: "Comprehensive logistics services tailored to your cargo requirements.",
        },
        {
          key: "services_list",
          type: "services",
          order: 2,
          items: [
            {
              slug: "fcl",
              icon: "container",
              titleAr: "شحن حاوية كاملة",
              titleEn: "FCL Shipping",
              shortLabelAr: "حمولة حاوية كاملة",
              shortLabelEn: "Full Container Load",
              value: "33.2 CBM",
              subValue: "20' GP",
              descriptionAr: "إدارة حصرية لحاويات 20 و40 قدمًا مع حجز مساحة مضمون على خطوط الشحن الرئيسية.",
              descriptionEn: "Exclusive 20' and 40' container management with guaranteed space allocation across major trade lanes.",
            },
            {
              slug: "lcl",
              icon: "boxes",
              titleAr: "شحن تجميعي",
              titleEn: "LCL Shipping",
              shortLabelAr: "شحنة أقل من حاوية",
              shortLabelEn: "Less than Container Load",
              value: "1 CBM",
              subValue: "Min Charge",
              descriptionAr: "حلول شحن مجمّعة بتحميل محسّن وتحديدات أسبوعية لأكثر من 180 وجهة.",
              descriptionEn: "Consolidated cargo solutions with CBM-optimized loading and weekly sailings to 180+ destinations.",
            },
            {
              slug: "bulk",
              icon: "ship",
              titleAr: "الشحن السائب",
              titleEn: "Bulk Shipping",
              shortLabelAr: "تأجير السفن",
              shortLabelEn: "Vessel Chartering",
              value: "30,000 DWT",
              subValue: "Handysize",
              descriptionAr: "شحن سائب وكسر البضائع والمشاريع عبر سفن مستأجرة بخيارات رحلات وتأجير زمني.",
              descriptionEn: "Dry bulk, breakbulk, and project cargo via chartered vessels with voyage and time charter options.",
            },
          ],
        },
      ],
    },
    {
      slug: "why-us",
      titleAr: "لماذا نحن",
      titleEn: "Why Choose Us",
      sections: [
        {
          key: "header",
          type: "header",
          order: 1,
          badgeAr: "لماذا ألولا",
          badgeEn: "Why Alola",
          titleAr: "شريكك اللوجستي الموثوق",
          titleEn: "The Logistics Partner You Can Trust",
          subtitleAr: "خبرة تشغيلية وشبكة عالمية تغطي كل احتياجات شحنك.",
          subtitleEn: "Operational expertise and a global network covering every shipping need.",
        },
        {
          key: "why_us_list",
          type: "features",
          order: 2,
          items: [
            {
              slug: "network",
              icon: "globe",
              titleAr: "شبكة عالمية",
              titleEn: "Global Network",
              descriptionAr: "شراكات موثوقة مع شركات النقل في أكثر من 180 دولة.",
              descriptionEn: "Trusted carrier partnerships across 180+ countries.",
            },
            {
              slug: "speed",
              icon: "plane",
              titleAr: "سرعة فائقة",
              titleEn: "Lightning-Fast",
              descriptionAr: "خيارات شحن جوي سريع خلال 24–48 ساعة.",
              descriptionEn: "Air freight express options delivered in 24–48 hours.",
            },
            {
              slug: "support",
              icon: "users",
              titleAr: "دعم على مدار الساعة",
              titleEn: "24/7 Support",
              descriptionAr: "فريق عمليات مخصص متاح على مدار الساعة.",
              descriptionEn: "Dedicated operations team available around the clock.",
            },
          ],
        },
      ],
    },
    {
      slug: "tracking",
      titleAr: "تتبع الشحنة",
      titleEn: "Track Your Shipment",
      sections: [
        {
          key: "tracking",
          type: "tracking",
          order: 1,
          badgeAr: "الشفافية",
          badgeEn: "Visibility",
          titleAr: "تتبع شحنتك",
          titleEn: "Track Your Shipment",
          subtitleAr: "متابعة لحظية للشحنة عبر كل مراحل رحلة بضاعتك.",
          subtitleEn: "Real-time shipment visibility across every milestone of your cargo journey.",
        },
      ],
    },
    {
      slug: "contact",
      titleAr: "اتصل بنا",
      titleEn: "Contact Us",
      sections: [
        {
          key: "contact",
          type: "contact",
          order: 1,
          badgeAr: "تواصل معنا",
          badgeEn: "Contact",
          titleAr: "تواصل معنا",
          titleEn: "Get in Touch",
          contentAr: "الهاتف: +966 11 000 0000 | البريد: hello@alola.com",
          contentEn: "Phone: +966 11 000 0000 | Email: hello@alola.com",
        },
      ],
    },
  ];

  for (const page of CMS_SEEDS) {
    const cmsPage = await prisma.cmsPage.upsert({
      where: { slug: page.slug },
      update: {},
      create: { slug: page.slug, titleAr: page.titleAr, titleEn: page.titleEn },
    });

    let sectionOrder = 0;
    for (const section of page.sections) {
      sectionOrder += 1;
      const cmsSection = await prisma.cmsSection.upsert({
        where: { pageId_key: { pageId: cmsPage.id, key: section.key } },
        update: {},
        create: {
          pageId: cmsPage.id,
          key: section.key,
          type: section.type,
          order: section.order ?? sectionOrder,
          badgeAr: section.badgeAr ?? null,
          badgeEn: section.badgeEn ?? null,
          titleAr: section.titleAr ?? null,
          titleEn: section.titleEn ?? null,
          subtitleAr: section.subtitleAr ?? null,
          subtitleEn: section.subtitleEn ?? null,
          contentAr: section.contentAr ?? null,
          contentEn: section.contentEn ?? null,
        },
      });

      let itemOrder = 0;
      for (const item of section.items ?? []) {
        itemOrder += 1;
        await prisma.cmsItem.upsert({
          where: { sectionId_slug: { sectionId: cmsSection.id, slug: item.slug } },
          update: {},
          create: {
            sectionId: cmsSection.id,
            slug: item.slug,
            icon: item.icon ?? "package",
            titleAr: item.titleAr,
            titleEn: item.titleEn,
            shortLabelAr: item.shortLabelAr ?? null,
            shortLabelEn: item.shortLabelEn ?? null,
            descriptionAr: item.descriptionAr ?? null,
            descriptionEn: item.descriptionEn ?? null,
            value: item.value ?? null,
            subValue: item.subValue ?? null,
            order: itemOrder,
          },
        });
      }
    }
  }
  console.log("✓ CmsPage: home, services, why-us, tracking, contact (with sections & items)");

  // ---------- CompanyInfo (singleton) ----------
  if ((await prisma.companyInfo.count()) === 0) {
    await prisma.companyInfo.create({
      data: {
        name: "ALOLA LOGISTICS",
        nameAr: "ألولا للخدمات اللوجستية",
        address: "Riyadh, Saudi Arabia",
        addressAr: "الرياض، المملكة العربية السعودية",
        city: "Riyadh",
        country: "Saudi Arabia",
        phone: "+966 11 000 0000",
        email: "info@alola-logistics.com",
        website: "https://alola-logistics.com",
        taxNumber: "",
        commercialReg: "1010-0000000",
        footerTermsText: "This quote is valid for 24 hours from the date of issue. All rates are subject to change based on actual freight charges, surcharges, and exchange rates at the time of booking.",
        footerTermsTextAr: "عرض الأسعار هذا صالح لمدة 24 ساعة من تاريخ الإصدار. جميع الأسعار عرضة للتغيير بناءً على رسوم الشحن الفعلية ون_span الصرف في وقت الحجز.",
      },
    });
    console.log("✓ CompanyInfo: default created");
  }

  // ---------- DocumentTemplate defaults ----------
  const TEMPLATE_TYPES = ["QUOTE", "INVOICE", "BOOKING_CONFIRMATION", "BILL_OF_LADING", "SHIPMENT_ORDER", "DELIVERY_ORDER"] as const;
  for (const type of TEMPLATE_TYPES) {
    const exists = await prisma.documentTemplate.findUnique({ where: { type } });
    if (!exists) {
      await prisma.documentTemplate.create({
        data: {
          type,
          name: type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
          headerSettings: JSON.stringify({ layout: "logo_left", showLogo: true, showCompanyName: true, showAddress: true, showPhone: true, showEmail: false, showWebsite: false }),
          footerSettings: JSON.stringify({ showTerms: type === "QUOTE", showBankInfo: type === "INVOICE", showSignature: true, showPageNumber: true, customText: "" }),
        },
      });
    }
  }
  console.log("✓ DocumentTemplate: 6 defaults ensured");

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
