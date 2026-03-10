-- AlterTable
ALTER TABLE "ingestion_batches" ADD COLUMN     "createdBy" TEXT;

-- AddForeignKey
ALTER TABLE "ingestion_batches" ADD CONSTRAINT "ingestion_batches_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
