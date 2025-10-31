/*
  Warnings:
  - This migration will change the primary key of AgentSession table.
  - The sessionId column will become a regular unique column.
  - A new id column will be added as the primary key.
  - The lastQuery column will be removed (data can be retrieved from messages).
*/

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Create new table with id as primary key and without lastQuery
CREATE TABLE "new_AgentSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "bullJobId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "new_AgentSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "new_AgentSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique index for sessionId
CREATE UNIQUE INDEX "new_AgentSession_sessionId_key" ON "new_AgentSession"("sessionId");

-- Copy data from old table, generating new IDs and excluding lastQuery
INSERT INTO "new_AgentSession" ("id", "sessionId", "workspaceId", "userId", "title", "messages", "bullJobId", "createdAt", "updatedAt")
SELECT
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))),
    "sessionId",
    "workspaceId",
    "userId",
    "title",
    "messages",
    "bullJobId",
    "createdAt",
    "updatedAt"
FROM "AgentSession";

-- Drop old table and rename new one
DROP TABLE "AgentSession";
ALTER TABLE "new_AgentSession" RENAME TO "AgentSession";

-- Create other indexes
CREATE INDEX "AgentSession_workspaceId_userId_idx" ON "AgentSession"("workspaceId", "userId");
CREATE INDEX "AgentSession_createdAt_idx" ON "AgentSession"("createdAt");
CREATE INDEX "AgentSession_bullJobId_idx" ON "AgentSession"("bullJobId");
CREATE UNIQUE INDEX "AgentSession_bullJobId_key" ON "AgentSession"("bullJobId");
CREATE INDEX "AgentSession_sessionId_idx" ON "AgentSession"("sessionId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;