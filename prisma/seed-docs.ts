import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed CompanyInfo
  const cCount = await prisma.companyInfo.count();
  if (cCount === 0) {
    await prisma.companyInfo.create({
      data: {
        name: "ALOLA LOGISTICS",
        nameAr: "ألولا للخدمات اللوجستية",
        address: "Jeddah, Saudi Arabia",
        phone: "+966 12 345 6789",
        email: "info@alola.com",
      },
    });
    console.log("Seeded CompanyInfo");
  } else {
    console.log(`CompanyInfo already has ${cCount} record(s), skipping`);
  }

  // Seed DocumentTemplates
  const dCount = await prisma.documentTemplate.count();
  if (dCount === 0) {
    const types = ["QUOTE", "INVOICE", "BOOKING_CONFIRMATION", "BILL_OF_LADING", "SHIPMENT_ORDER", "DELIVERY_ORDER"];
    for (const t of types) {
      await prisma.documentTemplate.create({
        data: {
          type: t,
          name: t.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()),
          isActive: true,
          headerSettings: JSON.stringify({
            layout: "logo_left",
            showLogo: true,
            showCompanyName: true,
            showAddress: true,
            showPhone: true,
            showEmail: false,
            showWebsite: false,
          }),
          footerSettings: JSON.stringify({
            showTerms: t === "QUOTE",
            showBankInfo: t === "INVOICE",
            showSignature: true,
            showPageNumber: true,
            customText: "",
          }),
        },
      });
    }
    console.log(`Seeded ${types.length} DocumentTemplates`);
  } else {
    console.log(`DocumentTemplate already has ${dCount} record(s), skipping`);
  }

  // Seed WebsitePage
  const wCount = await prisma.websitePage.count();
  if (wCount === 0) {
    const home = await prisma.websitePage.create({
      data: { slug: "home", title: "Home" },
    });
    await prisma.websiteSection.create({
      data: {
        pageId: home.id,
        type: "trusted_carriers",
        order: 2,
        isVisible: true,
        data: {
          title: "TRUSTED CARRIERS & PARTNERS",
          logos: [
            { name: "Mediterranean Shipping Co.", isActive: true },
            { name: "Maersk Line", isActive: true },
            { name: "CMA CGM", isActive: true },
            { name: "Saudia Cargo", isActive: true },
            { name: "Emirates SkyCargo", isActive: true },
          ],
        },
      },
    });
    console.log("Seeded WebsitePage (home) with trusted_carriers section");
  } else {
    console.log(`WebsitePage already has ${wCount} record(s), skipping`);
  }

  console.log("Done seeding");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
