-- Store image attachments on a teacher's inclass reply so the app can render
-- them inline (clickable/zoomable) instead of a download link.
ALTER TABLE "InclassQuestion" ADD COLUMN "answerImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
