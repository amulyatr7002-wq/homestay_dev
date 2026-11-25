CREATE INDEX "Listing_status_city_pricePerNight_idx" ON "Listing"("status", "city", "pricePerNight");
CREATE INDEX "Booking_status_checkIn_checkOut_idx" ON "Booking"("status", "checkIn", "checkOut");
