-- AddForeignKey
ALTER TABLE "permission_change_logs" ADD CONSTRAINT "permission_change_logs_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
