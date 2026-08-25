"use server";

import { prisma } from "@/lib/prisma";

/**
 * Single source for active master-data (countries, ports, currencies).
 * Consumed by cascading origin selectors, quote calculator and display currency.
 */
export async function getActiveCountries() {
  return prisma.country.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export async function getActivePorts() {
  return prisma.port.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
    include: { country: true },
  });
}

export async function getActiveCurrencies() {
  return prisma.currency.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { code: "asc" }],
  });
}

export async function getActiveContainerTypes() {
  return prisma.containerType.findMany({ where: { isActive: true }, orderBy: { code: "asc" } });
}
