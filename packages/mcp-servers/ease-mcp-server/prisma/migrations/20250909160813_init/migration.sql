-- AlterTable
ALTER TABLE "public"."Employee" ADD COLUMN     "benefitEligibleDate" TIMESTAMP(3),
ADD COLUMN     "enrollmentStatus" TEXT,
ADD COLUMN     "lastLoginDate" TIMESTAMP(3),
ADD COLUMN     "signatureDate" TIMESTAMP(3);
