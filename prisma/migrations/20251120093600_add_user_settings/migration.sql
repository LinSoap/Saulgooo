-- AlterTable
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "institution" TEXT;
ALTER TABLE "User" ADD COLUMN "preferences" TEXT;

-- RedefineIndex
DROP INDEX "new_AgentSession_sessionId_key";
CREATE UNIQUE INDEX "AgentSession_sessionId_key" ON "AgentSession"("sessionId");
