-- CreateTable
CREATE TABLE "public"."PdfFieldOption" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,

    CONSTRAINT "PdfFieldOption_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."PdfFieldOption" ADD CONSTRAINT "PdfFieldOption_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "public"."PdfField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
