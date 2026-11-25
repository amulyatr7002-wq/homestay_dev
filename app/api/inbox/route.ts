import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveUser } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const messageSchema = z.object({
  conversationId: z.string().cuid().optional(),
  listingId: z.string().cuid().optional(),
  body: z.string().trim().min(1).max(3000),
});

export async function GET(request: Request) {
  const user = await getActiveUser();
  if (!user || user.role === "ADMIN") return NextResponse.json({ error: "Sign in with a guest or host account to use messages." }, { status: 403 });
  const rawConversationId = new URL(request.url).searchParams.get("conversationId");
  const parsedConversationId = rawConversationId ? z.string().cuid().safeParse(rawConversationId) : null;
  if (parsedConversationId && !parsedConversationId.success) return NextResponse.json({ error: "Conversation not found." }, { status: 400 });
  const conversationId = parsedConversationId?.success ? parsedConversationId.data : null;
  const where = user.role === "HOST" ? { hostId: user.id } : { guestId: user.id };
  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      listing: { select: { id: true, title: true, slug: true, images: { orderBy: { position: "asc" }, take: 1 } } },
      guest: { select: { id: true, name: true, image: true } },
      host: { select: { id: true, name: true, image: true } },
      messages: {
        where: conversationId ? { conversationId } : undefined,
        orderBy: { createdAt: "asc" },
        take: conversationId ? 200 : 1,
        include: { sender: { select: { id: true, name: true } } },
      },
      _count: { select: { messages: { where: { senderId: { not: user.id }, readAt: null } } } },
    },
    orderBy: { lastMessageAt: "desc" },
  });
  if (conversationId) {
    const selected = conversations.find((conversation) => conversation.id === conversationId);
    if (!selected) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    await prisma.message.updateMany({ where: { conversationId, senderId: { not: user.id }, readAt: null }, data: { readAt: new Date() } });
  }
  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const user = await getActiveUser();
  if (!user || user.role === "ADMIN") return NextResponse.json({ error: "Sign in with a guest or host account to send messages." }, { status: 403 });
  const rate = await rateLimit(`inbox-message:${user.id}`, 30, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "You’ve sent a lot of messages. Please wait a few minutes." }, { status: 429 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid message." }, { status: 400 }); }
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your message." }, { status: 400 });

  let conversationId = parsed.data.conversationId;
  if (!conversationId && parsed.data.listingId && user.role === "GUEST") {
    const listing = await prisma.listing.findFirst({
      where: { id: parsed.data.listingId, status: "PUBLISHED", hostId: { not: null } },
      select: { id: true, hostId: true },
    });
    if (!listing?.hostId) return NextResponse.json({ error: "This host is not accepting messages yet." }, { status: 404 });
    const booking = await prisma.booking.findFirst({
      where: { listingId: listing.id, userId: user.id, status: { in: ["CONFIRMED", "COMPLETED"] } },
      select: { id: true },
    });
    if (!booking) return NextResponse.json({ error: "Message the host after you have a confirmed booking." }, { status: 403 });
    const conversation = await prisma.conversation.upsert({
      where: { listingId_guestId: { listingId: listing.id, guestId: user.id } },
      create: { listingId: listing.id, guestId: user.id, hostId: listing.hostId },
      update: {},
      select: { id: true },
    });
    conversationId = conversation.id;
  }
  if (!conversationId) return NextResponse.json({ error: "Choose an existing conversation." }, { status: 400 });

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ hostId: user.id }, { guestId: user.id }] },
    select: { id: true },
  });
  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId, senderId: user.id, body: parsed.data.body } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
  ]);
  return NextResponse.json({ message }, { status: 201 });
}
