/*
  Warnings:

  - A unique constraint covering the columns `[ssn]` on the table `Dependent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[eid,firstName,lastName,relationship]` on the table `Dependent` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `eid` to the `Dependent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Dependent" ADD COLUMN     "eid" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Dependent_ssn_key" ON "public"."Dependent"("ssn");

-- CreateIndex
CREATE UNIQUE INDEX "Dependent_eid_firstName_lastName_relationship_key" ON "public"."Dependent"("eid", "firstName", "lastName", "relationship");
