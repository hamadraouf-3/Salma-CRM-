/*
  Warnings:

  - You are about to drop the `OpportunityProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `commercialNotes` on the `Opportunity` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryDate` on the `Opportunity` table. All the data in the column will be lost.
  - You are about to drop the column `discountPercent` on the `Opportunity` table. All the data in the column will be lost.
  - You are about to drop the column `paymentTerms` on the `Opportunity` table. All the data in the column will be lost.
  - You are about to drop the column `pricingModel` on the `Opportunity` table. All the data in the column will be lost.
  - You are about to drop the column `proposalDueDate` on the `Opportunity` table. All the data in the column will be lost.
  - You are about to drop the column `proposalRequired` on the `Opportunity` table. All the data in the column will be lost.
  - You are about to drop the column `taxPercent` on the `Opportunity` table. All the data in the column will be lost.
  - You are about to drop the column `aiRequirements` on the `Requirement` table. All the data in the column will be lost.
  - You are about to drop the column `budget` on the `Requirement` table. All the data in the column will be lost.
  - You are about to drop the column `complianceRequirements` on the `Requirement` table. All the data in the column will be lost.
  - You are about to drop the column `integrations` on the `Requirement` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfSites` on the `Requirement` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfUsers` on the `Requirement` table. All the data in the column will be lost.
  - You are about to drop the column `risks` on the `Requirement` table. All the data in the column will be lost.
  - You are about to drop the column `securityRequirements` on the `Requirement` table. All the data in the column will be lost.
  - You are about to drop the column `timeline` on the `Requirement` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "OpportunityProduct_opportunityId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OpportunityProduct";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "value" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'JOD',
    "stage" TEXT NOT NULL DEFAULT 'NEW',
    "probability" INTEGER NOT NULL DEFAULT 10,
    "lostReason" TEXT,
    "stageChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "competitor" TEXT,
    "nextAction" TEXT,
    "notes" TEXT,
    "priority" TEXT,
    "opportunityType" TEXT,
    "expectedCloseDate" DATETIME,
    "closedAt" DATETIME,
    "companyId" TEXT,
    "contactId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Opportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Opportunity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Opportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Opportunity" ("closedAt", "companyId", "competitor", "contactId", "createdAt", "currency", "expectedCloseDate", "id", "lostReason", "nextAction", "notes", "opportunityType", "ownerId", "priority", "probability", "source", "stage", "stageChangedAt", "title", "updatedAt", "value") SELECT "closedAt", "companyId", "competitor", "contactId", "createdAt", "currency", "expectedCloseDate", "id", "lostReason", "nextAction", "notes", "opportunityType", "ownerId", "priority", "probability", "source", "stage", "stageChangedAt", "title", "updatedAt", "value" FROM "Opportunity";
DROP TABLE "Opportunity";
ALTER TABLE "new_Opportunity" RENAME TO "Opportunity";
CREATE INDEX "Opportunity_ownerId_idx" ON "Opportunity"("ownerId");
CREATE INDEX "Opportunity_stage_idx" ON "Opportunity"("stage");
CREATE INDEX "Opportunity_contactId_idx" ON "Opportunity"("contactId");
CREATE INDEX "Opportunity_companyId_idx" ON "Opportunity"("companyId");
CREATE TABLE "new_Requirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "businessProblem" TEXT,
    "customerObjective" TEXT,
    "requiredSolution" TEXT,
    "functionalRequirements" TEXT,
    "technicalRequirements" TEXT,
    "deployment" TEXT,
    "infrastructureNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Requirement_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Requirement" ("businessProblem", "createdAt", "customerObjective", "deployment", "functionalRequirements", "id", "infrastructureNotes", "opportunityId", "requiredSolution", "technicalRequirements", "updatedAt") SELECT "businessProblem", "createdAt", "customerObjective", "deployment", "functionalRequirements", "id", "infrastructureNotes", "opportunityId", "requiredSolution", "technicalRequirements", "updatedAt" FROM "Requirement";
DROP TABLE "Requirement";
ALTER TABLE "new_Requirement" RENAME TO "Requirement";
CREATE UNIQUE INDEX "Requirement_opportunityId_key" ON "Requirement"("opportunityId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
