-- Pre-launch data reset: exam papers/exams predate the kind/series/maxScore
-- model and can't be migrated column-for-column, so clear them.
DELETE FROM "Exam";
DELETE FROM "ExamPaper";

-- CreateEnum
CREATE TYPE "ExamPaperKind" AS ENUM ('FULL', 'SUBJECT');

-- AlterTable
ALTER TABLE "Exam" DROP COLUMN "date",
DROP COLUMN "name",
DROP COLUMN "type",
ADD COLUMN     "examPaperId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ExamPaper" DROP COLUMN "tag",
ADD COLUMN     "kind" "ExamPaperKind" NOT NULL,
ADD COLUMN     "maxScore" INTEGER,
ADD COLUMN     "round" INTEGER,
ADD COLUMN     "seriesId" TEXT,
ADD COLUMN     "type" "ExamType" NOT NULL,
ALTER COLUMN "subject" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TimelineEntry" DROP COLUMN "photoUrl",
ADD COLUMN     "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "ExamSeries" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamPaperSubject" (
    "id" TEXT NOT NULL,
    "examPaperId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "maxScore" INTEGER NOT NULL,

    CONSTRAINT "ExamPaperSubject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamSeries_ownerId_subject_idx" ON "ExamSeries"("ownerId", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSeries_ownerId_subject_name_key" ON "ExamSeries"("ownerId", "subject", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ExamPaperSubject_examPaperId_subject_key" ON "ExamPaperSubject"("examPaperId", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_examPaperId_subject_key" ON "Exam"("examPaperId", "subject");

-- AddForeignKey
ALTER TABLE "ExamSeries" ADD CONSTRAINT "ExamSeries_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamPaper" ADD CONSTRAINT "ExamPaper_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ExamSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamPaperSubject" ADD CONSTRAINT "ExamPaperSubject_examPaperId_fkey" FOREIGN KEY ("examPaperId") REFERENCES "ExamPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_examPaperId_fkey" FOREIGN KEY ("examPaperId") REFERENCES "ExamPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

