-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgentSession" (
    "sessionId" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "query" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AgentSession" ("createdAt", "messages", "sessionId", "title", "updatedAt", "userId", "workspaceId") SELECT "createdAt", "messages", "sessionId", "title", "updatedAt", "userId", "workspaceId" FROM "AgentSession";
DROP TABLE "AgentSession";
ALTER TABLE "new_AgentSession" RENAME TO "AgentSession";
CREATE INDEX "AgentSession_workspaceId_userId_idx" ON "AgentSession"("workspaceId", "userId");
CREATE INDEX "AgentSession_status_idx" ON "AgentSession"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
