/*
  Warnings:

  - You are about to drop the column `month` on the `SalesTarget` table. All the data in the column will be lost.
  - You are about to drop the column `targetAmount` on the `SalesTarget` table. All the data in the column will be lost.
  - Added the required column `createdById` to the `SalesTarget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodEnd` to the `SalesTarget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodStart` to the `SalesTarget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodType` to the `SalesTarget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetType` to the `SalesTarget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetValue` to the `SalesTarget` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "SalesTargetAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "previousValue" TEXT,
    "newValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesTargetAudit_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "SalesTarget" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalesTargetAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SalesTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "targetValue" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'JOD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SalesTarget_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SalesTarget" ("createdAt", "id", "updatedAt", "userId") SELECT "createdAt", "id", "updatedAt", "userId" FROM "SalesTarget";
DROP TABLE "SalesTarget";
ALTER TABLE "new_SalesTarget" RENAME TO "SalesTarget";
CREATE INDEX "SalesTarget_userId_idx" ON "SalesTarget"("userId");
CREATE UNIQUE INDEX "SalesTarget_userId_targetType_periodType_periodStart_key" ON "SalesTarget"("userId", "targetType", "periodType", "periodStart");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ACCOUNT_MANAGER',
    "title" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "managerId" TEXT,
    CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("active", "createdAt", "email", "id", "managerId", "name", "passwordHash", "role", "title", "updatedAt") SELECT "active", "createdAt", "email", "id", "managerId", "name", "passwordHash", "role", "title", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_managerId_idx" ON "User"("managerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SalesTargetAudit_targetId_idx" ON "SalesTargetAudit"("targetId");
