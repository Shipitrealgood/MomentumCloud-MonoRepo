-- CreateEnum
CREATE TYPE "public"."TemplateType" AS ENUM ('IMPORT', 'EXPORT');

-- CreateTable
CREATE TABLE "public"."DataTemplate" (
    "id" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."TemplateType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DataTemplateField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sourceField" TEXT NOT NULL,
    "destinationField" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "DataTemplateField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DataTemplate_templateKey_key" ON "public"."DataTemplate"("templateKey");

-- CreateIndex
CREATE UNIQUE INDEX "DataTemplateField_templateId_sourceField_key" ON "public"."DataTemplateField"("templateId", "sourceField");

-- CreateIndex
CREATE UNIQUE INDEX "DataTemplateField_templateId_destinationField_key" ON "public"."DataTemplateField"("templateId", "destinationField");

-- AddForeignKey
ALTER TABLE "public"."DataTemplateField" ADD CONSTRAINT "DataTemplateField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."DataTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
