-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "defaultProbability" INTEGER NOT NULL DEFAULT 50,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Seed the three fixed system stages. Their id IS the value stored in Opportunity.stage, and the app
-- hardcodes these three ids (NEW / WON / LOST) for won/lost/forecast logic, so they're never renamed or
-- deleted — only the stages an admin adds in between (order 1-899) are editable. 900/901 leave room for
-- hundreds of custom stages without ever colliding with WON/LOST.
INSERT INTO "PipelineStage" ("id", "label", "order", "isSystem", "defaultProbability", "createdAt", "updatedAt") VALUES
    ('NEW', 'New', 0, true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('WON', 'Won', 900, true, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('LOST', 'Lost', 901, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
