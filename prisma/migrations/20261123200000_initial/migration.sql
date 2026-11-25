CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "PropertyType" AS ENUM ('HOMESTAY', 'COTTAGE', 'CABIN', 'FARM_STAY', 'VILLA', 'HERITAGE_HOME');
CREATE TYPE "Vibe" AS ENUM ('MOUNTAINS', 'BEACH', 'HERITAGE', 'FARM', 'FOREST');

CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'Karnataka',
    "description" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "pricePerNight" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "maxGuests" INTEGER NOT NULL DEFAULT 2,
    "propertyType" "PropertyType" NOT NULL,
    "vibe" "Vibe" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "hostName" TEXT NOT NULL,
    "hostBio" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ListingImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListingImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Amenity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_AmenityToListing" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_AmenityToListing_AB_pkey" PRIMARY KEY ("A", "B")
);

CREATE UNIQUE INDEX "Destination_slug_key" ON "Destination"("slug");
CREATE INDEX "Destination_region_idx" ON "Destination"("region");
CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");
CREATE INDEX "Listing_destinationId_pricePerNight_idx" ON "Listing"("destinationId", "pricePerNight");
CREATE INDEX "Listing_propertyType_vibe_rating_idx" ON "Listing"("propertyType", "vibe", "rating");
CREATE INDEX "Listing_latitude_longitude_idx" ON "Listing"("latitude", "longitude");
CREATE INDEX "ListingImage_listingId_position_idx" ON "ListingImage"("listingId", "position");
CREATE UNIQUE INDEX "Amenity_slug_key" ON "Amenity"("slug");
CREATE INDEX "_AmenityToListing_B_index" ON "_AmenityToListing"("B");

ALTER TABLE "Listing"
    ADD CONSTRAINT "Listing_destinationId_fkey"
    FOREIGN KEY ("destinationId") REFERENCES "Destination"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ListingImage"
    ADD CONSTRAINT "ListingImage_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_AmenityToListing"
    ADD CONSTRAINT "_AmenityToListing_A_fkey"
    FOREIGN KEY ("A") REFERENCES "Amenity"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_AmenityToListing"
    ADD CONSTRAINT "_AmenityToListing_B_fkey"
    FOREIGN KEY ("B") REFERENCES "Listing"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
