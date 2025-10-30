/*
  Warnings:

  - You are about to drop the column `completedAt` on the `AgentSession` table. All the data in the column will be lost.
  - You are about to drop the column `error` on the `AgentSession` table. All the data in the column will be lost.
  - You are about to drop the column `query` on the `AgentSession` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `AgentSession` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `AgentSession` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgentSession" (
    "sessionId" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "bullJobId" TEXT,
    "lastQuery" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AgentSession" ("createdAt", "messages", "sessionId", "title", "updatedAt", "userId", "workspaceId") SELECT "createdAt", "messages", "sessionId", "title", "updatedAt", "userId", "workspaceId" FROM "AgentSession";
DROP TABLE "AgentSession";
ALTER TABLE "new_AgentSession" RENAME TO "AgentSession";
CREATE UNIQUE INDEX "AgentSession_bullJobId_key" ON "AgentSession"("bullJobId");
CREATE INDEX "AgentSession_workspaceId_userId_idx" ON "AgentSession"("workspaceId", "userId");
CREATE INDEX "AgentSession_createdAt_idx" ON "AgentSession"("createdAt");
CREATE INDEX "AgentSession_bullJobId_idx" ON "AgentSession"("bullJobId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
