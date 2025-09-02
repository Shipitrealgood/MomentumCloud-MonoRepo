-- CreateTable
CREATE TABLE "public"."PdfTemplate" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdfTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PdfField" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "PdfField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PdfTemplate_templateId_key" ON "public"."PdfTemplate"("templateId");

-- AddForeignKey
ALTER TABLE "public"."PdfField" ADD CONSTRAINT "PdfField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."PdfTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
