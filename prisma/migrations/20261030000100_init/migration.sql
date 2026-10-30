CREATE TABLE "Profile" (
  "id" TEXT NOT NULL DEFAULT 'main',
  "name" TEXT NOT NULL DEFAULT 'Una vida que nos une',
  "subtitle" TEXT NOT NULL DEFAULT 'Un lugar para guardar lo que nunca queremos olvidar.',
  "introduction" TEXT NOT NULL DEFAULT 'Aquí iremos reuniendo su historia: los días compartidos, las pequeñas costumbres y todo ese cariño que sigue encontrando nuevas formas de acompañarnos.',
  "quote" TEXT NOT NULL DEFAULT 'Lo que se comparte con amor se queda con nosotros.',
  "heroPath" TEXT,
  CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Media" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "caption" TEXT NOT NULL DEFAULT '',
  "year" TEXT NOT NULL DEFAULT '',
  "kind" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Memory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "fingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Media_path_key" ON "Media"("path");
CREATE INDEX "Memory_approved_createdAt_idx" ON "Memory"("approved", "createdAt");
CREATE INDEX "Memory_fingerprint_createdAt_idx" ON "Memory"("fingerprint", "createdAt");
-- Deny direct Data API access from the moment the tables exist.
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Media" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Memory" ENABLE ROW LEVEL SECURITY;
