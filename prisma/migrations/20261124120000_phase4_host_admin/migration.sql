CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'PAUSED');

ALTER TABLE "User"
ADD COLUMN "suspendedAt" TIMESTAMP(3);

ALTER TABLE "Listing"
ADD COLUMN "hostId" TEXT,
ADD COLUMN "status" "ListingStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN "rejectedReason" TEXT,
ADD COLUMN "draftData" JSONB,
ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "bedrooms" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "beds" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "bathrooms" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "cleaningFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "weekendPrice" INTEGER,
ADD COLUMN "houseRules" TEXT NOT NULL DEFAULT '',
ADD COLUMN "checkInTime" TEXT NOT NULL DEFAULT '15:00',
ADD COLUMN "checkOutTime" TEXT NOT NULL DEFAULT '11:00';

ALTER TABLE "Booking"
ADD COLUMN "nightlySubtotal" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Review"
ADD COLUMN "hostReply" TEXT,
ADD COLUMN "hostRepliedAt" TIMESTAMP(3),
ADD COLUMN "isFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "flagReason" TEXT;

ALTER TABLE "ListingImage"
ADD COLUMN "publicId" TEXT,
ADD COLUMN "isCover" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "HostProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "photoUrl" TEXT,
    "languages" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HostProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ListingCalendarDate" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "pricePerNight" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ListingCalendarDate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeaturedCollection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeaturedCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeaturedListing" (
    "collectionId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "FeaturedListing_pkey" PRIMARY KEY ("collectionId", "listingId")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HostProfile_userId_key" ON "HostProfile"("userId");
CREATE INDEX "Listing_hostId_status_idx" ON "Listing"("hostId", "status");
CREATE INDEX "Listing_status_createdAt_idx" ON "Listing"("status", "createdAt");
CREATE INDEX "ListingCalendarDate_listingId_date_idx" ON "ListingCalendarDate"("listingId", "date");
CREATE UNIQUE INDEX "ListingCalendarDate_listingId_date_key" ON "ListingCalendarDate"("listingId", "date");
CREATE UNIQUE INDEX "Conversation_listingId_guestId_key" ON "Conversation"("listingId", "guestId");
CREATE INDEX "Conversation_hostId_lastMessageAt_idx" ON "Conversation"("hostId", "lastMessageAt");
CREATE INDEX "Conversation_guestId_lastMessageAt_idx" ON "Conversation"("guestId", "lastMessageAt");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_senderId_readAt_idx" ON "Message"("senderId", "readAt");
CREATE UNIQUE INDEX "FeaturedCollection_slug_key" ON "FeaturedCollection"("slug");
CREATE INDEX "FeaturedListing_collectionId_position_idx" ON "FeaturedListing"("collectionId", "position");
CREATE INDEX "AuditLog_adminId_createdAt_idx" ON "AuditLog"("adminId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

ALTER TABLE "HostProfile"
ADD CONSTRAINT "HostProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Listing"
ADD CONSTRAINT "Listing_hostId_fkey"
FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ListingCalendarDate"
ADD CONSTRAINT "ListingCalendarDate_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Conversation"
ADD CONSTRAINT "Conversation_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Conversation"
ADD CONSTRAINT "Conversation_guestId_fkey"
FOREIGN KEY ("guestId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Conversation"
ADD CONSTRAINT "Conversation_hostId_fkey"
FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message"
ADD CONSTRAINT "Message_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message"
ADD CONSTRAINT "Message_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeaturedListing"
ADD CONSTRAINT "FeaturedListing_collectionId_fkey"
FOREIGN KEY ("collectionId") REFERENCES "FeaturedCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeaturedListing"
ADD CONSTRAINT "FeaturedListing_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_adminId_fkey"
FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
