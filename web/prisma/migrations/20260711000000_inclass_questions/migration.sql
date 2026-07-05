-- CreateTable
CREATE TABLE "InclassQuestion" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imagePaths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "articleId" TEXT,
    "articleUrl" TEXT,
    "answerText" TEXT,
    "answeredAt" TIMESTAMP(3),
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "hasUnseenReply" BOOLEAN NOT NULL DEFAULT false,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InclassQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InclassQuestion_ownerId_idx" ON "InclassQuestion"("ownerId");

-- AddForeignKey
ALTER TABLE "InclassQuestion" ADD CONSTRAINT "InclassQuestion_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
