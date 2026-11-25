export {};

declare global {
  interface RazorpaySuccessResponse {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }

  interface RazorpayFailureResponse {
    error: { code: string; description: string; metadata?: { order_id?: string; payment_id?: string } };
  }

  interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    prefill: { name: string; email: string };
    notes: Record<string, string>;
    theme: { color: string };
    handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
    modal: { ondismiss: () => void };
  }

  interface RazorpayCheckout {
    open: () => void;
    on: (event: "payment.failed", callback: (response: RazorpayFailureResponse) => void) => void;
  }

  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}
