-- CreateTable
CREATE TABLE "HohoonAccount" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "userIdEnc" TEXT NOT NULL,
    "userPassEnc" TEXT NOT NULL,
    "writerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HohoonAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HohoonDraft" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "phpsessid" TEXT NOT NULL,
    "imgcode" TEXT NOT NULL,
    "writerName" TEXT NOT NULL,
    "imagePaths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HohoonDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HohoonQuestion" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imagePaths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "articleId" TEXT,
    "articleUrl" TEXT,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "hasUnseenReply" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HohoonQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HohoonAccount_ownerId_key" ON "HohoonAccount"("ownerId");

-- CreateIndex
CREATE INDEX "HohoonDraft_ownerId_idx" ON "HohoonDraft"("ownerId");

-- CreateIndex
CREATE INDEX "HohoonQuestion_ownerId_idx" ON "HohoonQuestion"("ownerId");

-- AddForeignKey
ALTER TABLE "HohoonAccount" ADD CONSTRAINT "HohoonAccount_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HohoonDraft" ADD CONSTRAINT "HohoonDraft_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HohoonQuestion" ADD CONSTRAINT "HohoonQuestion_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

