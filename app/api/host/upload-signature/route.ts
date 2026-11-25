import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/authorization";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  const user = await requireApiRole(["HOST", "ADMIN"]);
  if (!user) return NextResponse.json({ error: "Host access is required." }, { status: 403 });
  const rate = await rateLimit(`upload-signature:${user.id}`, 60, 60 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many upload requests. Try again later." }, { status: 429 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Photo uploads are not configured. Set the Cloudinary environment variables." }, { status: 503 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `namma-stay/hosts/${user.id}`;
  const signature = createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");
  return NextResponse.json({ cloudName, apiKey, timestamp, folder, signature });
}
