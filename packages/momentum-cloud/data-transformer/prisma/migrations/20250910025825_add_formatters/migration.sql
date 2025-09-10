/*
  Warnings:

  - A unique constraint covering the columns `[templateId,sourceField,destinationField]` on the table `DataTemplateField` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."DataTemplateField_templateId_destinationField_key";

-- DropIndex
DROP INDEX "public"."DataTemplateField_templateId_sourceField_key";

-- AlterTable
ALTER TABLE "public"."DataTemplateField" ADD COLUMN     "formatter" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DataTemplateField_templateId_sourceField_destinationField_key" ON "public"."DataTemplateField"("templateId", "sourceField", "destinationField");
