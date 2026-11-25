import { createHmac, timingSafeEqual } from "node:crypto";

function matchesHmac(message: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(message).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(secret && matchesHmac(`${orderId}|${paymentId}`, signature, secret));
}

export function verifyWebhookSignature(body: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  return Boolean(secret && matchesHmac(body, signature, secret));
}
