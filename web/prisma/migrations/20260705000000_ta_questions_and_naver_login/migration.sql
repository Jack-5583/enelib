-- AlterTable
ALTER TABLE "User" ADD COLUMN     "naverAccessToken" TEXT,
ADD COLUMN     "naverNickname" TEXT,
ADD COLUMN     "naverRefreshToken" TEXT,
ADD COLUMN     "naverTokenExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "postStatus" TEXT NOT NULL DEFAULT 'pending',
    "postError" TEXT,
    "cafeClubUrl" TEXT,
    "cafeArticleId" TEXT,
    "cafeArticleUrl" TEXT,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "hasUnseenReply" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_ownerId_idx" ON "Question"("ownerId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

