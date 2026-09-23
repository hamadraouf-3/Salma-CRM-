-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PipelineStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "defaultProbability" INTEGER NOT NULL DEFAULT 50,
    "opportunityId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PipelineStage_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PipelineStage" ("createdAt", "defaultProbability", "id", "isSystem", "label", "order", "updatedAt") SELECT "createdAt", "defaultProbability", "id", "isSystem", "label", "order", "updatedAt" FROM "PipelineStage";
DROP TABLE "PipelineStage";
ALTER TABLE "new_PipelineStage" RENAME TO "PipelineStage";
CREATE INDEX "PipelineStage_opportunityId_idx" ON "PipelineStage"("opportunityId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
