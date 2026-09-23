-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "preferredContactMethod" TEXT;

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "businessProblem" TEXT,
    "customerObjective" TEXT,
    "requiredSolution" TEXT,
    "functionalRequirements" TEXT,
    "technicalRequirements" TEXT,
    "aiRequirements" TEXT,
    "deployment" TEXT,
    "infrastructureNotes" TEXT,
    "integrations" TEXT,
    "numberOfUsers" INTEGER,
    "numberOfSites" INTEGER,
    "securityRequirements" TEXT,
    "complianceRequirements" TEXT,
    "timeline" TEXT,
    "budget" REAL,
    "risks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Requirement_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Solution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "proposedSolution" TEXT,
    "solutionType" TEXT,
    "architectureNotes" TEXT,
    "technicalApproach" TEXT,
    "deploymentApproach" TEXT,
    "integrations" TEXT,
    "dependencies" TEXT,
    "estimatedEffort" TEXT,
    "estimatedDuration" TEXT,
    "technicalOwnerId" TEXT,
    "technicalNotes" TEXT,
    "risks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Solution_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Solution_technicalOwnerId_fkey" FOREIGN KEY ("technicalOwnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OpportunityProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "discountPercent" REAL NOT NULL DEFAULT 0,
    "taxPercent" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpportunityProduct_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "paymentTerms" TEXT,
    "pricingModel" TEXT,
    "discountPercent" REAL,
    "taxPercent" REAL,
    "proposalRequired" BOOLEAN NOT NULL DEFAULT false,
    "proposalDueDate" DATETIME,
    "deliveryDate" DATETIME,
    "commercialNotes" TEXT,
    "companyId" TEXT,
    "contactId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Opportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Opportunity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Opportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Opportunity" ("closedAt", "companyId", "competitor", "contactId", "createdAt", "currency", "expectedCloseDate", "id", "lostReason", "nextAction", "ownerId", "probability", "source", "stage", "stageChangedAt", "title", "updatedAt", "value") SELECT "closedAt", "companyId", "competitor", "contactId", "createdAt", "currency", "expectedCloseDate", "id", "lostReason", "nextAction", "ownerId", "probability", "source", "stage", "stageChangedAt", "title", "updatedAt", "value" FROM "Opportunity";
DROP TABLE "Opportunity";
ALTER TABLE "new_Opportunity" RENAME TO "Opportunity";
CREATE INDEX "Opportunity_ownerId_idx" ON "Opportunity"("ownerId");
CREATE INDEX "Opportunity_stage_idx" ON "Opportunity"("stage");
CREATE INDEX "Opportunity_contactId_idx" ON "Opportunity"("contactId");
CREATE INDEX "Opportunity_companyId_idx" ON "Opportunity"("companyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Requirement_opportunityId_key" ON "Requirement"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "Solution_opportunityId_key" ON "Solution"("opportunityId");

-- CreateIndex
CREATE INDEX "OpportunityProduct_opportunityId_idx" ON "OpportunityProduct"("opportunityId");
