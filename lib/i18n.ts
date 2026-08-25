/** Lightweight EN/AR i18n (settings-driven, dir-aware). Pure module — safe for RSC + clients. */

export type Locale = "en" | "ar";

export const LOCALES: Locale[] = ["en", "ar"];

export function normalizeLocale(value: unknown): Locale {
  return value === "ar" ? "ar" : "en";
}

export type DictKey = keyof typeof EN_DICT;

/** Values are plain strings; keys are validated against the EN dictionary. */
export type Dict = Record<DictKey, string>;

export const EN_DICT = {
  "nav.dashboard": "Dashboard",
  "nav.shipments": "Shipments",
  "nav.quotes": "Quotes",
  "nav.invoices": "Invoices",
  "nav.customers": "Customers",
  "nav.support": "Support",
  "nav.reports": "Reports",
  "nav.settings": "Settings",
  "nav.integrations": "Integrations",
  "nav.pricing": "Pricing matrix",
  "nav.users": "Users & roles",
  "nav.masterData": "Master data",
  "nav.registrationBuilder": "Registration builder",
  "nav.websiteBuilder": "CMS builder",
  "nav.websiteContent": "Website content",
  "nav.documentBuilder": "Document builder",
  "nav.customerTracking": "Customer tracking",
  "nav.commandCenter": "Command Center",
  "nav.liveGuide": "Live Guide",
  "nav.voyages": "Voyages",
  "nav.security": "Security & Sessions",
  "nav.backup": "Database Backup",
  "nav.systemControl": "System Control",
  "nav.myShipments": "My shipments",
  "nav.myQuotes": "My quotes",
  "nav.myInvoices": "My invoices",
  "nav.wallet": "Finance wallet",
  "nav.workspace": "Workspace",
  "nav.account": "Account",
  "nav.configuration": "Configuration",
  "nav.logout": "Sign out",
  "common.pdf": "PDF",
  "common.exportExcel": "Export Excel",
  "common.exportPdf": "Export PDF",
  "common.view": "View",
  "track.home": "Alola Logistics — Home",
  "track.getQuote": "Get a quote",
  "track.booking": "Booking",
  "track.eta": "Estimated Arrival",
  "track.delivered": "Delivered",
  "track.current": "Current",
  "track.cancelled": "This shipment was cancelled.",
  "track.trackAnother": "Need details for another shipment?",
  "track.trackAnotherLink": "Track another reference",
  "track.liveMap": "Live route map",
  "track.mapFallback": "Map preview (Mapbox token not configured — set it in Command Center → Integrations)",
  "track.origin": "Origin",
  "track.destination": "Destination",
} as const;

export const AR_DICT: Dict = {
  "nav.dashboard": "لوحة التحكم",
  "nav.shipments": "الشحنات",
  "nav.quotes": "عروض الأسعار",
  "nav.invoices": "الفواتير",
  "nav.customers": "العملاء",
  "nav.support": "الدعم",
  "nav.reports": "التقارير",
  "nav.settings": "الإعدادات",
  "nav.integrations": "التكاملات",
  "nav.pricing": "مصفوفة الأسعار",
  "nav.users": "المستخدمون والأدوار",
  "nav.masterData": "البيانات الرئيسية",
  "nav.registrationBuilder": "منشئ التسجيل",
  "nav.websiteBuilder": "منشئ صفحات الموقع",
  "nav.websiteContent": "محتوى الموقع",
  "nav.documentBuilder": "منشئ المستندات",
  "nav.customerTracking": "تتبع العملاء",
  "nav.commandCenter": "مركز القيادة",
  "nav.liveGuide": "الدليل الحي",
  "nav.voyages": "الرحلات البحرية",
  "nav.security": "الأمان والجلسات",
  "nav.backup": "النسخ الاحتياطي",
  "nav.systemControl": "لوحة التحكم النظام",
  "nav.myShipments": "شحناتي",
  "nav.myQuotes": "عروضي",
  "nav.myInvoices": "فواتيري",
  "nav.wallet": "المحفظة المالية",
  "nav.workspace": "مساحة العمل",
  "nav.account": "الحساب",
  "nav.configuration": "الإعدادات",
  "nav.logout": "تسجيل الخروج",
  "common.pdf": "PDF",
  "common.exportExcel": "تصدير إكسل",
  "common.exportPdf": "تصدير PDF",
  "common.view": "عرض",
  "track.home": "ألولا للخدمات اللوجستية — الرئيسية",
  "track.getQuote": "اطلب عرض سعر",
  "track.booking": "الحجز",
  "track.eta": "الوصول المتوقع",
  "track.delivered": "تم التسليم",
  "track.current": "الحالي",
  "track.cancelled": "تم إلغاء هذه الشحنة.",
  "track.trackAnother": "هل تحتاج تفاصيل شحنة أخرى؟",
  "track.trackAnotherLink": "تتبع مرجع آخر",
  "track.liveMap": "خريطة المسار المباشر",
  "track.mapFallback": "معاينة الخريطة (لم يتم ضبط مفتاح Mapbox — اضبطه من مركز القيادة ← التكاملات)",
  "track.origin": "نقطة البداية",
  "track.destination": "الوجهة",
};

export const DICTS: Record<Locale, Dict> = { en: EN_DICT, ar: AR_DICT };

export function t(locale: Locale, key: keyof Dict): string {
  return DICTS[locale][key];
}
