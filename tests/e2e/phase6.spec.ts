import { expect, test, type Page } from "@playwright/test";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const password = "E2E-Test-Password-123!";

async function signUp(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("E2E Guest");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(page).toHaveURL(/\/bookings/);
}

test("natural-language search applies interpreted filters", async ({ page }) => {
  await page.route("**/api/collections/featured", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ collections: [] }),
  }));
  await page.route(/\/api\/ai\/search$/, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      filters: { location: "Coorg", checkIn: null, checkOut: null, guests: 2, minBudget: null, maxBudget: 3000, vibe: null, amenities: [] },
      fallback: false,
    }),
  }));
  await page.goto("/");
  await page.getByRole("textbox", { name: "Describe your dream stay" }).fill("A quiet stay in Coorg for two under 3000");
  const searchResponse = page.waitForResponse((response) => response.url().includes("/api/ai/search"));
  await page.getByRole("button", { name: "Find stays matching your dream" }).click();
  const response = await searchResponse;
  expect(response.ok()).toBe(true);
  await expect(page).toHaveURL(/\/explore\?.*destination=Coorg/);
  await expect(page.getByRole("heading", { name: /Find your/ })).toBeVisible();
});

test("guest can create an account", async ({ page }) => {
  test.skip(!hasDatabase, "Set DATABASE_URL and seed the database to run account E2E tests.");
  await signUp(page);
  await expect(page.getByRole("heading", { name: /a little space|your stays|travel stories/i })).toBeVisible();
});

test("guest can reserve a seeded stay and complete a mocked payment", async ({ page }) => {
  test.skip(!hasDatabase, "Set DATABASE_URL and seed the database to run booking E2E tests.");
  await signUp(page);

  await page.route("https://checkout.razorpay.com/v1/checkout.js", (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: `window.Razorpay = class {
      constructor(options) { this.options = options; }
      on() {}
      open() {
        setTimeout(() => this.options.handler({
          razorpay_order_id: this.options.order_id,
          razorpay_payment_id: "pay_e2e_mock",
          razorpay_signature: "a".repeat(64)
        }), 0);
      }
    };`,
  }));
  await page.route("**/api/payments/order", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ keyId: "rzp_test_e2e", orderId: "order_e2e_mock", amount: 10000, currency: "INR", reference: "E2EMOCK1" }),
  }));
  await page.route("**/api/payments/verify", async (route) => {
    const summary = await page.locator(".checkout-summary-card small").textContent();
    const reference = summary?.match(/Booking reference · ([A-Z0-9]+)/)?.[1] ?? "E2EMOCK1";
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ bookingReference: reference }) });
  });

  await page.goto("/listings/sea-wind-homestay");
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 2);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2);
  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const checkInKey = dateKey(checkIn);
  const checkOutKey = dateKey(checkOut);
  await expect(page.getByRole("button", { name: checkInKey })).toBeEnabled();
  await page.getByRole("button", { name: checkInKey }).click();
  await page.getByRole("button", { name: checkOutKey }).click();
  await page.getByRole("button", { name: "Continue to secure checkout" }).click();
  await expect(page).toHaveURL(/\/checkout\?/);
  await page.getByRole("button", { name: /Pay ₹/ }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: /Pay ₹/ }).click();
  await expect(page).toHaveURL(/\/bookings\/confirmation\//);
});

test("host can submit a listing with mocked photo uploads", async ({ page }) => {
  test.skip(!hasDatabase, "Set DATABASE_URL to run host listing E2E tests.");
  await signUp(page);
  await page.goto("/become-a-host");
  await page.getByLabel("Display name").fill("E2E Host");
  await page.getByLabel("Your story").fill("I love welcoming travelers and sharing the quiet trails around my home in Karnataka.");
  await page.getByLabel("Phone").fill("+919876543210");
  await page.getByLabel("Home city").fill("Madikeri");
  await page.getByRole("button", { name: "Complete host profile" }).click();
  await expect(page).toHaveURL(/\/host$/);
  await page.goto("/host/listings/new");

  await page.getByLabel("Listing title").fill("E2E Coffee Garden Home");
  await page.getByLabel("Describe the stay").fill("A warm and welcoming home surrounded by a quiet coffee garden in the hills of Karnataka.");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("City or town").fill("Madikeri");
  await page.getByLabel("Full address").fill("Coffee Estate Road, Madikeri");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();

  let photoIndex = 0;
  await page.route("https://api.cloudinary.com/**/image/upload", async (route) => {
    const body = route.request().postData() ?? "";
    const folder = body.match(/name="folder"\r?\n\r?\n([^\r\n]+)/)?.[1] ?? "namma-stay/hosts/missing";
    photoIndex += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        secure_url: `https://res.cloudinary.com/e2e-cloud/image/upload/v1/${folder}/photo-${photoIndex}.jpg`,
        public_id: `${folder}/photo-${photoIndex}`,
      }),
    });
  });
  await page.locator('input[type="file"]').setInputFiles(Array.from({ length: 5 }, (_, index) => ({
    name: `stay-${index}.jpg`,
    mimeType: "image/jpeg",
    buffer: Buffer.from([0xff, 0xd8, 0xff, index]),
  })));
  await expect(page.locator(".wizard-photo-grid img")).toHaveCount(5);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel(/Base price per night/).fill("3200");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page).toHaveURL(/\/host\/listings$/);
  await expect(page.getByText("E2E Coffee Garden Home")).toBeVisible();
});
