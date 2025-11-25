-- AlterTable
ALTER TABLE "search_histories" ADD COLUMN     "comment" TEXT;

-- CreateTable
CREATE TABLE "search_result_feedbacks" (
    "id" TEXT NOT NULL,
    "searchHistoryId" TEXT NOT NULL,
    "resultIndex" INTEGER NOT NULL,
    "documentId" TEXT,
    "adoptionStatus" TEXT NOT NULL,
    "comment" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_result_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "search_result_feedbacks_searchHistoryId_idx" ON "search_result_feedbacks"("searchHistoryId");

-- CreateIndex
CREATE INDEX "search_result_feedbacks_userId_idx" ON "search_result_feedbacks"("userId");

-- CreateIndex
CREATE INDEX "search_result_feedbacks_adoptionStatus_idx" ON "search_result_feedbacks"("adoptionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "search_result_feedbacks_searchHistoryId_resultIndex_userId_key" ON "search_result_feedbacks"("searchHistoryId", "resultIndex", "userId");

-- AddForeignKey
ALTER TABLE "search_result_feedbacks" ADD CONSTRAINT "search_result_feedbacks_searchHistoryId_fkey" FOREIGN KEY ("searchHistoryId") REFERENCES "search_histories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
