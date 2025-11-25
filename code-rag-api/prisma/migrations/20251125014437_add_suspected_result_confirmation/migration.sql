-- AlterTable
ALTER TABLE "search_result_feedbacks" ADD COLUMN     "confirmed" BOOLEAN,
ADD COLUMN     "isSuspected" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "search_result_feedbacks_isSuspected_confirmed_idx" ON "search_result_feedbacks"("isSuspected", "confirmed");
