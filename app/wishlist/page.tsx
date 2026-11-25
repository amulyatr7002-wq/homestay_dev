import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import WishlistPage from "@/components/wishlist-page";

export const dynamic = "force-dynamic";

export default async function GuestWishlistPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fwishlist");
  const items = await prisma.wishlist.findMany({
    where: { userId: session.user.id },
    include: { listing: { include: { images: { orderBy: { position: "asc" }, take: 1 }, amenities: { orderBy: { name: "asc" } }, destination: { select: { name: true, slug: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return <WishlistPage listings={items.map((item) => item.listing)} />;
}
