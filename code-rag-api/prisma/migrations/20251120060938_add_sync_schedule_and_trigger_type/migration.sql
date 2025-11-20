-- AlterTable
ALTER TABLE "data_sources" ADD COLUMN     "syncSchedule" TEXT;

-- AlterTable
ALTER TABLE "sync_histories" ADD COLUMN     "triggerType" TEXT;
