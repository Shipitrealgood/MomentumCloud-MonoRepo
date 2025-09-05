/*
  Warnings:

  - A unique constraint covering the columns `[employeeId,firstName,lastName,relationship]` on the table `Dependent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,eid]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Dependent_eid_firstName_lastName_relationship_key";

-- DropIndex
DROP INDEX "public"."Employee_eid_key";

-- CreateIndex
CREATE UNIQUE INDEX "Dependent_employeeId_firstName_lastName_relationship_key" ON "public"."Dependent"("employeeId", "firstName", "lastName", "relationship");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_companyId_eid_key" ON "public"."Employee"("companyId", "eid");
