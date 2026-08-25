-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "country" TEXT,
    "originCountry" TEXT,
    "city" TEXT,
    "address" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationPageConfig" (
    "id" TEXT NOT NULL,
    "pageTitleAr" TEXT NOT NULL,
    "pageTitleEn" TEXT NOT NULL,
    "pageSubtitleAr" TEXT,
    "pageSubtitleEn" TEXT,
    "submitButtonAr" TEXT NOT NULL,
    "submitButtonEn" TEXT NOT NULL,
    "successToastAr" TEXT,
    "successToastEn" TEXT,
    "errorGeneralAr" TEXT,
    "errorGeneralEn" TEXT,
    "footerLoginTextAr" TEXT,
    "footerLoginTextEn" TEXT,
    "alreadyHaveAccountAr" TEXT,
    "alreadyHaveAccountEn" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationPageConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationFieldConfig" (
    "id" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "placeholderAr" TEXT,
    "placeholderEn" TEXT,
    "helpTextAr" TEXT,
    "helpTextEn" TEXT,
    "tooltipAr" TEXT,
    "tooltipEn" TEXT,
    "errorRequiredAr" TEXT,
    "errorRequiredEn" TEXT,
    "errorInvalidAr" TEXT,
    "errorInvalidEn" TEXT,
    "validationRegex" TEXT,
    "minLength" INTEGER,
    "maxLength" INTEGER,
    "allowNumbers" BOOLEAN NOT NULL DEFAULT true,
    "allowSpecialChars" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationFieldConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationFieldConfig_fieldKey_key" ON "RegistrationFieldConfig"("fieldKey");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
