-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('BUSINESS', 'HOUSEHOLD');

-- CreateEnum
CREATE TYPE "public"."ContactType" AS ENUM ('EMPLOYEE', 'INDIVIDUAL', 'PARTNER');

-- CreateEnum
CREATE TYPE "public"."EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACTOR');

-- CreateEnum
CREATE TYPE "public"."EmploymentStatus" AS ENUM ('ACTIVE', 'TERMINATED', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "public"."CompensationType" AS ENUM ('SALARY', 'HOURLY');

-- CreateEnum
CREATE TYPE "public"."RelationshipToAccountPrimary" AS ENUM ('PRIMARY', 'SPOUSE', 'CHILD', 'DOMESTIC_PARTNER', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."FundingType" AS ENUM ('SELF_FUNDED', 'LEVEL_FUNDED', 'TRADITIONAL');

-- CreateEnum
CREATE TYPE "public"."PolicyStatus" AS ENUM ('ACTIVE', 'PENDING', 'TERMINATED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."ElectionStatus" AS ENUM ('ENROLLED', 'WAIVED', 'TERMINATED');

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."AccountType" NOT NULL,
    "industry" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contact" (
    "id" TEXT NOT NULL,
    "recordType" "public"."ContactType" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "personalEmail" TEXT,
    "phone" TEXT,
    "birthdate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "primaryContactId" TEXT,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmployeeProfile" (
    "id" TEXT NOT NULL,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "employmentType" "public"."EmploymentType" NOT NULL,
    "employmentStatus" "public"."EmploymentStatus" NOT NULL,
    "terminationDate" TIMESTAMP(3),
    "eid" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "compensationType" "public"."CompensationType" NOT NULL,
    "compensationAmount" DECIMAL(65,30) NOT NULL,
    "contactId" TEXT NOT NULL,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IndividualProfile" (
    "id" TEXT NOT NULL,
    "relationship" "public"."RelationshipToAccountPrimary" NOT NULL,
    "contactId" TEXT NOT NULL,

    CONSTRAINT "IndividualProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Policy" (
    "id" TEXT NOT NULL,
    "policyName" TEXT NOT NULL,
    "groupNumber" TEXT,
    "fundingType" "public"."FundingType" NOT NULL,
    "policyStatus" "public"."PolicyStatus" NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "policyTerm" INTEGER,
    "accountId" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Enrollment" (
    "id" TEXT NOT NULL,
    "status" "public"."ElectionStatus" NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "terminationDate" TIMESTAMP(3),
    "contactId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Carrier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,

    CONSTRAINT "Carrier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_name_key" ON "public"."Account"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_email_key" ON "public"."Contact"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_eid_key" ON "public"."EmployeeProfile"("eid");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_contactId_key" ON "public"."EmployeeProfile"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "IndividualProfile_contactId_key" ON "public"."IndividualProfile"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_contactId_policyId_key" ON "public"."Enrollment"("contactId", "policyId");

-- CreateIndex
CREATE UNIQUE INDEX "Carrier_name_key" ON "public"."Carrier"("name");

-- AddForeignKey
ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "public"."Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IndividualProfile" ADD CONSTRAINT "IndividualProfile_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Policy" ADD CONSTRAINT "Policy_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Policy" ADD CONSTRAINT "Policy_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "public"."Carrier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Enrollment" ADD CONSTRAINT "Enrollment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Enrollment" ADD CONSTRAINT "Enrollment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "public"."Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
