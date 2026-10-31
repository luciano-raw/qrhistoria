ALTER TABLE "Profile" ADD COLUMN "content" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Media" ADD COLUMN "placement" TEXT NOT NULL DEFAULT 'album';
ALTER TABLE "Memory" ALTER COLUMN "approved" SET DEFAULT true;
CREATE TABLE "MemoryPhoto" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "memoryId" TEXT NOT NULL REFERENCES "Memory"("id") ON DELETE CASCADE,
  "path" TEXT NOT NULL UNIQUE,
  "bytes" INTEGER NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "MemoryPhoto_memoryId_idx" ON "MemoryPhoto"("memoryId");
CREATE TABLE "SubmissionLimit" (
  "fingerprint" TEXT NOT NULL PRIMARY KEY,
  "count" INTEGER NOT NULL DEFAULT 0,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "UploadBudget" (
  "id" TEXT NOT NULL DEFAULT 'memories' PRIMARY KEY,
  "usedBytes" INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE "MemoryPhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubmissionLimit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UploadBudget" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "MemoryPhoto", "SubmissionLimit", "UploadBudget" FROM anon, authenticated;
