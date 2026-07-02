-- Pre-launch data reset: exam paper "type" moves from a fixed enum to a
-- freely user-editable string, so existing rows can't be translated 1:1.
DELETE FROM "Exam";
DELETE FROM "ExamPaper";

-- AlterTable
ALTER TABLE "ExamPaper" DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- DropEnum
DROP TYPE "ExamType";

-- CreateTable
CREATE TABLE "MaterialTag" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamTypeOption" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamTypeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dday" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialTag_ownerId_idx" ON "MaterialTag"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialTag_ownerId_name_key" ON "MaterialTag"("ownerId", "name");

-- CreateIndex
CREATE INDEX "ExamTypeOption_ownerId_idx" ON "ExamTypeOption"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamTypeOption_ownerId_name_key" ON "ExamTypeOption"("ownerId", "name");

-- CreateIndex
CREATE INDEX "Dday_ownerId_idx" ON "Dday"("ownerId");

-- AddForeignKey
ALTER TABLE "MaterialTag" ADD CONSTRAINT "MaterialTag_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTypeOption" ADD CONSTRAINT "ExamTypeOption_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dday" ADD CONSTRAINT "Dday_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default material tags and exam-type options for every existing
-- student so their pickers aren't empty after this migration.
INSERT INTO "MaterialTag" ("id", "ownerId", "name", "order", "createdAt")
SELECT concat('mtag_', u.id, '_', t.ord), u.id, t.name, t.ord, CURRENT_TIMESTAMP
FROM "User" u
CROSS JOIN (VALUES ('기출',0),('모평',1),('학평',2),('독서',3),('유형',4),('어법',5),('오답',6)) AS t(name, ord)
WHERE u.role = 'STUDENT';

INSERT INTO "ExamTypeOption" ("id", "ownerId", "name", "order", "createdAt")
SELECT concat('etype_', u.id, '_', t.ord), u.id, t.name, t.ord, CURRENT_TIMESTAMP
FROM "User" u
CROSS JOIN (VALUES ('모평',0),('학평',1),('내신',2),('사설',3),('수능',4)) AS t(name, ord)
WHERE u.role = 'STUDENT';

