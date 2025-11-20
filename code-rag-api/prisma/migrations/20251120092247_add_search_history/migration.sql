-- CreateTable
CREATE TABLE "search_histories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "role" TEXT,
    "resultsCount" INTEGER NOT NULL,
    "adoptionStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "search_histories_userId_createdAt_idx" ON "search_histories"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "search_histories_userId_role_idx" ON "search_histories"("userId", "role");
