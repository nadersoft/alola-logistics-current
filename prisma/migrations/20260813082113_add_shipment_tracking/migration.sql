-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "externalStatus" TEXT,
ADD COLUMN     "lastTrackedAt" TIMESTAMP(3),
ADD COLUMN     "trackingNumber" TEXT,
ADD COLUMN     "trackingProvider" TEXT DEFAULT 'ship24';

-- CreateIndex
CREATE INDEX "Shipment_trackingNumber_idx" ON "Shipment"("trackingNumber");
