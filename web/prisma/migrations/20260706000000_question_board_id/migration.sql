-- Pre-launch safety: this feature isn't wired up with real Naver credentials
-- yet, so any existing rows are test data that can't carry a valid boardId.
DELETE FROM "Question";

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "boardId" TEXT NOT NULL;

