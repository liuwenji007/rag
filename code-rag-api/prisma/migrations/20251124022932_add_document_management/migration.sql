-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "documentType" TEXT,
ADD COLUMN     "filePath" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "reviewStatus" TEXT DEFAULT 'pending',
ADD COLUMN     "uploadedBy" TEXT,
ALTER COLUMN "datasourceId" DROP NOT NULL,
ALTER COLUMN "externalId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT,
    "metadata" JSONB NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_tag_relations" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "document_tag_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_documents" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "prdId" TEXT,
    "imageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,

    CONSTRAINT "design_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ui_requirements" (
    "id" TEXT NOT NULL,
    "prdId" TEXT NOT NULL,
    "paragraphId" TEXT,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "extractedBy" TEXT,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ui_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reviews" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "metadata" JSONB,

    CONSTRAINT "content_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_versions_documentId_idx" ON "document_versions"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_documentId_version_key" ON "document_versions"("documentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "document_tags_name_key" ON "document_tags"("name");

-- CreateIndex
CREATE INDEX "document_tag_relations_documentId_idx" ON "document_tag_relations"("documentId");

-- CreateIndex
CREATE INDEX "document_tag_relations_tagId_idx" ON "document_tag_relations"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "document_tag_relations_documentId_tagId_key" ON "document_tag_relations"("documentId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "design_documents_documentId_key" ON "design_documents"("documentId");

-- CreateIndex
CREATE INDEX "design_documents_prdId_idx" ON "design_documents"("prdId");

-- CreateIndex
CREATE INDEX "ui_requirements_prdId_status_idx" ON "ui_requirements"("prdId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "content_reviews_documentId_key" ON "content_reviews"("documentId");

-- CreateIndex
CREATE INDEX "content_reviews_status_idx" ON "content_reviews"("status");

-- CreateIndex
CREATE INDEX "documents_uploadedBy_idx" ON "documents"("uploadedBy");

-- CreateIndex
CREATE INDEX "documents_documentType_idx" ON "documents"("documentType");

-- CreateIndex
CREATE INDEX "documents_reviewStatus_idx" ON "documents"("reviewStatus");

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_tag_relations" ADD CONSTRAINT "document_tag_relations_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_tag_relations" ADD CONSTRAINT "document_tag_relations_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "document_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_documents" ADD CONSTRAINT "design_documents_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
