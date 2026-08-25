-- AlterTable: Add voyageId and freeTimeDays to Quote
ALTER TABLE "Quote" ADD COLUMN "voyageId" TEXT,
ADD COLUMN "freeTimeDays" INTEGER;

-- CreateTable: Voyage
CREATE TABLE "Voyage" (
    "id" TEXT NOT NULL,
    "originPortId" TEXT NOT NULL,
    "destinationPortId" TEXT NOT NULL,
    "vesselName" TEXT NOT NULL,
    "voyageNumber" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "cutOffDate" TIMESTAMP(3) NOT NULL,
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "voyageType" TEXT NOT NULL DEFAULT 'direct',
    "transitTime" INTEGER NOT NULL,
    "shippingLine" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showOnCalculator" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Voyage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique voyage number
CREATE UNIQUE INDEX "Voyage_voyageNumber_key" ON "Voyage"("voyageNumber");

-- CreateIndex: Voyage lookup
CREATE INDEX "Voyage_originPortId_destinationPortId_departureDate_idx" ON "Voyage"("originPortId", "destinationPortId", "departureDate");

-- AddForeignKey: Voyage -> Port (origin)
ALTER TABLE "Voyage" ADD CONSTRAINT "Voyage_originPortId_fkey" FOREIGN KEY ("originPortId") REFERENCES "Port"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Voyage -> Port (destination)
ALTER TABLE "Voyage" ADD CONSTRAINT "Voyage_destinationPortId_fkey" FOREIGN KEY ("destinationPortId") REFERENCES "Port"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Quote -> Voyage
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_voyageId_fkey" FOREIGN KEY ("voyageId") REFERENCES "Voyage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
