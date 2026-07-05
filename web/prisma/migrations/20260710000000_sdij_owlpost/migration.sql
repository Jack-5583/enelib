-- CreateTable
CREATE TABLE "SdijAccount" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "cookieEnc" TEXT NOT NULL,
    "bodyEnc" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SdijAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SdijAccount_ownerId_key" ON "SdijAccount"("ownerId");

-- AddForeignKey
ALTER TABLE "SdijAccount" ADD CONSTRAINT "SdijAccount_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
