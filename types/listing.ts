import type { Prisma } from "@prisma/client";

export type ListingWithDetails = Prisma.ListingGetPayload<{
  include: {
    images: true;
    amenities: true;
    destination: { select: { name: true; slug: true } };
  };
}>;
