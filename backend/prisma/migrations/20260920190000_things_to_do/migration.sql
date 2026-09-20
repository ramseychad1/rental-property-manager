-- CreateTable
CREATE TABLE "ThingToDo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "area" TEXT NOT NULL DEFAULT '',
    "locationAddress" TEXT NOT NULL DEFAULT '',
    "locationUrl" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ThingToDo_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "ThingToDo_category_idx" ON "ThingToDo"("category");
