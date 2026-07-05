-- CreateTable
CREATE TABLE "OmrSheet" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "examPaperId" TEXT,
    "config" JSONB NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OmrSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OmrResult" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "raw" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "wrongNos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OmrResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OmrSheet_ownerId_idx" ON "OmrSheet"("ownerId");
CREATE INDEX "OmrResult_ownerId_idx" ON "OmrResult"("ownerId");
CREATE INDEX "OmrResult_sheetId_idx" ON "OmrResult"("sheetId");

-- AddForeignKey
ALTER TABLE "OmrSheet" ADD CONSTRAINT "OmrSheet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OmrResult" ADD CONSTRAINT "OmrResult_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OmrResult" ADD CONSTRAINT "OmrResult_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "OmrSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
