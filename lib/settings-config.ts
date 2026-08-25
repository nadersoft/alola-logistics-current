import { Category } from "@prisma/client";

export type FieldType = "text" | "textarea" | "number" | "range" | "color" | "select" | "boolean" | "surcharges";

export type SettingField = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
};

export type SettingsSection = {
  category: Category;
  title: string;
  description: string;
  fields: SettingField[];
};

export function buildSettingsSections(): SettingsSection[] {
  return [
    {
      category: Category.DEFAULTS,
      title: "Defaults",
      description: "Applied to new quotes and shipments. Origin country, origin port and display currency are managed by the cascading picker above.",
      fields: [
        { key: "defaults.currencySymbol", label: "Currency symbol", type: "text" },
        {
          key: "defaults.language",
          label: "Language",
          type: "select",
          options: [
            { value: "en", label: "English" },
            { value: "ar", label: "Arabic" },
          ],
        },
      ],
    },
    {
      category: Category.PRICING,
      title: "Pricing",
      description: "Global surcharges applied on top of every base rate.",
      fields: [
        {
          key: "pricing.surcharges",
          label: "Surcharges",
          type: "surcharges",
          help: "Flat amounts are in pricing base currency; percentages are multiplicative.",
        },
        {
          key: "pricing.currencyBase",
          label: "Base rate currency",
          type: "select",
          options: [{ value: "USD", label: "USD" }],
        },
        { key: "pricing.quoteValidityHours", label: "Quote validity (hours)", type: "number", min: 1 },
      ],
    },
    {
      category: Category.APPEARANCE,
      title: "Appearance",
      description: "Brand tokens that restyle the whole platform instantly.",
      fields: [
        { key: "appearance.primary", label: "Primary color", type: "color" },
        { key: "appearance.accent", label: "Accent color", type: "color" },
        { key: "appearance.background", label: "Background", type: "color", help: "Light-mode background" },
        { key: "appearance.foreground", label: "Foreground", type: "color", help: "Light-mode text" },
        {
          key: "appearance.radius",
          label: "Border radius",
          type: "select",
          options: [
            { value: "0", label: "Sharp" },
            { value: "0.375rem", label: "Small" },
            { value: "0.625rem", label: "Medium" },
            { value: "0.75rem", label: "Large" },
            { value: "1rem", label: "X-Large" },
          ],
        },
        {
          key: "appearance.fontFamily",
          label: "Font family",
          type: "select",
          options: [
            { value: "Inter", label: "Inter" },
            { value: "Manrope", label: "Manrope" },
            { value: "Poppins", label: "Poppins" },
          ],
        },
        { key: "appearance.fontBaseSize", label: "Base font size (px)", type: "number", min: 12, step: 1 },
        {
          key: "appearance.heroGradientFrom",
          label: "Hero gradient — start",
          type: "color",
          help: "UX Kit .hero-bg first stop",
        },
        {
          key: "appearance.heroGradientMid",
          label: "Hero gradient — middle",
          type: "color",
          help: "UX Kit .hero-bg second stop",
        },
        {
          key: "appearance.heroGradientTo",
          label: "Hero gradient — end",
          type: "color",
          help: "UX Kit .hero-bg third stop",
        },
        { key: "appearance.heroGradientAngle", label: "Hero gradient angle", type: "number", min: 0, max: 360, step: 1 },
        { key: "appearance.textGradientFrom", label: "Gradient headline — start", type: "color" },
        { key: "appearance.textGradientTo", label: "Gradient headline — end", type: "color" },
        { key: "appearance.glassBg", label: "Glass panel color", type: "color", help: "UX Kit .glass-panel background" },
        { key: "appearance.glassBgOpacity", label: "Glass panel opacity", type: "range", min: 0, max: 100, step: 1 },
        { key: "appearance.glassBlur", label: "Glass panel blur (px)", type: "number", min: 0, max: 60, step: 1 },
        { key: "appearance.cardShadowColor", label: "Card hover shadow color", type: "color", help: "UX Kit .card-hover" },
        { key: "appearance.cardShadowOpacity", label: "Card hover shadow opacity", type: "range", min: 0, max: 100, step: 1 },
        { key: "appearance.cardLift", label: "Card hover lift (px)", type: "number", min: 0, max: 24, step: 1 },
        { key: "appearance.pulseColor", label: "Live pulse ring color", type: "color", help: "UX Kit @keyframes pulse-ring" },
        { key: "appearance.pulseDuration", label: "Pulse ring duration (s)", type: "number", min: 1, max: 10, step: 0.5 },
        { key: "appearance.marqueeDuration", label: "Marquee speed (s)", type: "number", min: 8, max: 120, step: 1 },
        { key: "floating_enabled", label: "Floating — Enable icons", type: "boolean", help: "Master switch for all floating action buttons" },
        { key: "show_whatsapp", label: "Floating — WhatsApp", type: "boolean" },
        { key: "show_call", label: "Floating — Call", type: "boolean" },
        { key: "show_livechat", label: "Floating — Live Chat", type: "boolean" },
        { key: "floating_whatsapp_number", label: "Floating — WhatsApp number", type: "text", placeholder: "9665xxxxxxxx" },
        { key: "floating_call_number", label: "Floating — Call number", type: "text", placeholder: "+966 11 000 0000" },
        { key: "floating_livechat_url", label: "Floating — Live Chat URL", type: "text" },
        { key: "floating_whatsapp_message", label: "Floating — WhatsApp message", type: "text" },
        {
          key: "floating_position",
          label: "Floating — Position",
          type: "select",
          options: [
            { value: "left", label: "Left" },
            { value: "right", label: "Right" },
          ],
        },
        { key: "floating_color", label: "Floating — Button color", type: "color" },
      ],
    },
    {
      category: Category.CONTENT,
      title: "Company & content",
      description: "Public-facing identity, hero copy and contact details.",
      fields: [
        { key: "company.name", label: "Company name", type: "text" },
        { key: "company.cr", label: "Commercial registration", type: "text" },
        { key: "company.address", label: "Address", type: "textarea" },
        { key: "company.logoLight", label: "Logo (light)", type: "text", placeholder: "https://…" },
        { key: "company.logoDark", label: "Logo (dark)", type: "text", placeholder: "https://…" },
        { key: "company.favicon", label: "Favicon", type: "text", placeholder: "https://…" },
        { key: "content.hero.title", label: "Hero title", type: "text" },
        { key: "content.hero.subtitle", label: "Hero subtitle", type: "textarea" },
        { key: "content.hero.cta", label: "Hero CTA", type: "text" },
        { key: "content.tracking.title", label: "Tracking title", type: "text" },
        { key: "content.contact.phone", label: "Contact phone", type: "text" },
        { key: "content.contact.email", label: "Contact email", type: "text" },
      ],
    },
  ];
}
