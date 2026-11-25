ALTER TABLE "Listing"
ADD COLUMN "vibeTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "reviewSummary" JSONB,
ADD COLUMN "reviewSummaryReviewCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "AiUsage" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "feature" TEXT NOT NULL,
  "tokens" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");
CREATE INDEX "AiUsage_feature_createdAt_idx" ON "AiUsage"("feature", "createdAt");
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AiFeedback" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "feature" TEXT NOT NULL,
  "helpful" BOOLEAN NOT NULL,
  "turnId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiFeedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiFeedback_feature_createdAt_idx" ON "AiFeedback"("feature", "createdAt");
CREATE INDEX "AiFeedback_userId_createdAt_idx" ON "AiFeedback"("userId", "createdAt");
ALTER TABLE "AiFeedback" ADD CONSTRAINT "AiFeedback_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SavedTrip" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "itinerary" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SavedTrip_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SavedTrip_userId_updatedAt_idx" ON "SavedTrip"("userId", "updatedAt");
ALTER TABLE "SavedTrip" ADD CONSTRAINT "SavedTrip_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
