# Namma Stay

Namma Stay is a homestay discovery and booking platform focused on Karnataka. Guests can find and book local stays, hosts can manage listings and reservations, and admins can moderate the marketplace.

## Features

- Search and explore published homestays by location, dates, guests, price, amenities, and vibe.
- Guest accounts, wishlists, booking holds, Razorpay checkout, cancellations, and reviews.
- Host onboarding, listing drafts and submissions, availability management, earnings, and guest messaging.
- Admin review, moderation, featured collections, user management, and audit history.
- Gemini-powered trip concierge, itinerary saving, natural-language search, vibe matches, review summaries, host suggestions, and message translations.

## Tech stack

Next.js 14 App Router, React, TypeScript, PostgreSQL, Prisma, Auth.js, Tailwind CSS, Mapbox GL, Cloudinary, Razorpay, and the Google GenAI SDK.

## Screenshots

Replace these placeholders with product screenshots before release.

| Home | Explore |
| --- | --- |
| ![Home screenshot placeholder](docs/screenshots/home.png) | ![Explore screenshot placeholder](docs/screenshots/explore.png) |

| Listing details | Host studio |
| --- | --- |
| ![Listing screenshot placeholder](docs/screenshots/listing.png) | ![Host studio screenshot placeholder](docs/screenshots/host-studio.png) |

## Project structure

- `app/`: App Router pages, API routes, metadata routes, and shared styles.
- `components/`: interactive site, booking, host, admin, and AI UI.
- `lib/`: Prisma, authentication, payment, search, validation, pricing, and AI helpers.
- `prisma/`: schema, migrations, seed scripts, and AI cache backfill.
- `tests/unit/`: Vitest tests for booking policies and validation.
- `tests/e2e/`: Playwright browser tests.
- `DEPLOYMENT.md`: managed PostgreSQL and Vercel release steps.
- `ARCHITECTURE.md`: high-level system diagram.

## Requirements

- Node.js 22.12 or newer
- npm

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
```

Fill the required local values in `.env.local`, then run:

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

- `DATABASE_URL`: PostgreSQL connection string used by Prisma.
- `DIRECT_URL`: direct PostgreSQL connection for migrations. For Neon/Supabase, use the direct endpoint here and the pooled endpoint for `DATABASE_URL`.
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`: public Mapbox token. Without it, Explore shows an interactive, stylized Karnataka map with stay pins instead of Mapbox terrain tiles.
- `NEXTAUTH_URL` and `NEXTAUTH_SECRET`: Auth.js base URL and a unique random secret (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: optional Google OAuth credentials. Create the local callback URL `http://localhost:3000/api/auth/callback/google`; email/password login works without Google credentials.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`: Razorpay **test-mode** credentials. Configure webhook URL `/api/payments/webhook` for `payment.captured`, `payment.failed`, and `refund.processed`.
- `RESEND_API_KEY` and `EMAIL_FROM`: optional confirmation email. Without a Resend key, confirmation details are logged by the server.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`: required for authenticated host listing photo uploads. The server signs short-lived upload requests and scopes each host to their own folder.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optional `ADMIN_NAME`: credentials for the initial admin account. Use a unique password of at least 12 characters; keep them private and do not leave these blank when running the admin seed.
- `AI_PROVIDER`: `gemini` (default), `groq`, or `anthropic`. Gemini is the implemented adapter; selecting Groq or Anthropic shows a friendly unsupported-provider fallback until those adapters are added.
- `AI_API_KEY`: provider API key, read by server routes only. Never prefix this value with `NEXT_PUBLIC_` or expose it to client code.
- `AI_MODEL`: optional model name; defaults to `gemini-2.5-flash`.
- `PLAYWRIGHT_BASE_URL`: optional URL for an already-running app when running browser tests.

## Database

The schema is in `prisma/schema.prisma`. Migrations are checked in under `prisma/migrations`; use `npm run db:migrate` for local development and `npm run db:migrate:deploy` for production. `postinstall` runs `prisma generate`. `npm run db:seed` inserts sample stays, destinations, and amenities. `npm run db:seed:admin` creates or updates the admin account from environment credentials. For an explicit, non-destructive production demo seed plus admin setup, use `npm run db:seed:production`; existing demo records are not overwritten.

## Phase 2 routes

- `/explore`: URL-backed destination, dates, guests, price, home type, amenities, rating, and vibe filters; result cards and clustered map pins.
- `/listings/[id]`: listing gallery with lightbox, host story, amenities, location map, and date-aware booking checkout.
- `/login` and `/signup`: Google OAuth (when configured) and bcrypt-hashed email/password accounts.
- `/checkout`: protected Razorpay test checkout for a short-lived booking hold.
- `/bookings`: protected upcoming, past, and cancelled trip dashboard with cancellation/refund policy and completed-stay reviews.
- `/wishlist`: protected saved stays.
- `/become-a-host`: complete a host profile before host access is granted.
- `/host`: role-protected host studio for overview metrics, listing creation and management, availability blocks and custom prices, bookings, reviews and public replies, earnings/CSV export, and a five-second-polled guest inbox.
- `/admin`: role-protected operations console for listing approval/rejection, user access and roles, booking/payment review, featured home-page collections, flagged content, and the audit log.
- `/inbox`: guest messaging for confirmed stays with platform hosts.

## Verify

```powershell
npm run typecheck
npm run lint
npm run build
npm test
npm run test:e2e
```

Playwright tests that touch accounts, bookings, or host listing creation require a migrated and seeded `DATABASE_URL`. Payment is mocked in browser tests. Local test instructions and production environment setup are in [DEPLOYMENT.md](./DEPLOYMENT.md).

## Razorpay test payment and guest-flow checklist

Use only a Razorpay **Test Mode** key pair. In Checkout, use the test Visa card `4111 1111 1111 1111`, a future expiry date, any CVV, and the test OTP requested by the Razorpay prompt. Never enter real card details or configure live keys for local testing.

1. Start PostgreSQL, copy `.env.example` to `.env.local`, add the database URL and Razorpay test credentials, then run `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, and `npm run dev`.
2. Sign up with email/password, sign out, and sign back in. If Google credentials are configured, test Google sign-in too. Phone OTP sign-in is not currently supported.
3. Open a seeded stay, choose dates and guests, verify the displayed fee breakdown, and continue to checkout. Try dates that overlap an existing hold/booking and a guest count above capacity; both should be rejected.
4. Complete Checkout with the test card. Confirm the success page and reference, then verify the trip appears as confirmed in `/bookings`. For webhook testing, configure a Razorpay test webhook to reach `/api/payments/webhook` (use a local tunnel) and send payment capture/failure events; repeat delivery to verify idempotency.
5. Add and remove a stay in `/wishlist`, checking that the UI and saved list update.
6. Cancel a booking more than seven days before check-in and one within seven days; verify the displayed 100% and 50% refund policy respectively.
7. Verify reviews are rejected for pending/uncompleted stays and duplicate reviews, and are accepted once for a completed booking.
8. Sign out and confirm `/bookings`, `/wishlist`, and `/checkout` redirect to login.

## Phase 4 setup and admin test login

1. Add the Cloudinary credentials and admin credentials to `.env.local`. Configure a Mapbox public token if you want the location picker to support map pin placement.
2. With PostgreSQL running, apply the schema and sample content:

   ```powershell
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   npm run db:seed:admin
   npm run dev
   ```

3. Admin test login: use the exact `ADMIN_EMAIL` and `ADMIN_PASSWORD` values configured in `.env.local`. The seed script does not create a shared default password.

## Phase 4 manual test checklist

1. Sign in as a guest and complete `/become-a-host`; confirm the account changes to HOST and `/host` loads. Try to open `/admin` as a host and verify access is denied.
2. Create a listing draft, reload and continue editing it. Upload at least five photos through Cloudinary, reorder them to choose the cover, place a map pin, set capacity, amenities, prices, rules, and submit for review.
3. Sign in with the seeded admin account. Approve the listing from `/admin/listings`, confirm it appears in Explore, then edit it as the host and verify it returns to the moderation queue. Test rejection feedback, pause/resume, ownership restrictions, and deletion rules.
4. In the host calendar, block and reopen dates, set a custom price range, verify booked nights cannot be blocked, and confirm guest availability and server-calculated checkout totals honor those prices.
5. Create a booking for the host-owned listing as a guest. Check the host booking tabs and guest contact details. Test an eligible completed-stay review, publish a host reply, and confirm it is visible to the guest.
6. Open a host-guest conversation from the confirmed booking, send messages in both directions, and verify polling updates within five seconds and the host unread badge clears when the thread is opened.
7. Check earnings rows and CSV export for booking reference, host amount, platform fee, payment status, and safe CSV quoting.
8. As admin, search/filter users, change roles, suspend/restore an account, and verify the last active admin cannot be suspended or demoted. Mark a pending refund processed.
9. Create and publish a featured collection, verify it appears on the landing page, then flag/clear a listing and review and verify destructive review moderation updates the listing rating. Check `/admin/audit` records each admin action.
10. Try host/admin APIs and pages with a guest session and as a different host; confirm server-side authorization rejects requests even if the UI is bypassed.

## Phase 5 AI setup and verification

Add `AI_PROVIDER=gemini`, `AI_API_KEY`, and optionally `AI_MODEL` to `.env.local`. The model defaults to `gemini-2.5-flash`. The official Google GenAI SDK and API key are used only by server-side code (API routes and the backfill script), never by browser code. Gemini free-tier limits are low; 429 responses tell users to retry in a minute. Apply the migration and regenerate Prisma Client:

```powershell
npm run db:generate
npm run db:migrate
npm run ai:backfill
```

Run `npm run ai:backfill` after migrations and seeding to cache listing vibe tags and eligible review summaries. It only calls the model for missing tags and stale summaries; it requires a working database and API key.

### Phase 5 manual test checklist

1. **Trip concierge:** Open the floating concierge on the home, Explore, listing, host, and admin pages. Use both starter prompts, ask for a real stay, and verify every result links to a published database listing. Ask to invent a property and verify it refuses. Select “Build my itinerary”, verify the day timeline, save it, and open `/trips`. Reload the page and verify chat history remains for the browser session. Try emergency, medical, and legal questions and confirm the assistant points emergencies to 112 and does not provide professional advice. With `AI_API_KEY` unset, verify the friendly fallback. Try keyboard access and Escape to close the panel; submit thumbs up/down and check `AiFeedback`.
2. **Natural-language search:** Search from the home dream-stay box and Explore with a destination, dates, guests, budget, vibe, and amenities. Verify the URL filters, result list, and removable interpretation chips. Submit a deliberately unparseable phrase and verify keyword fallback. Remove one chip and confirm the other filters remain.
3. **Vibe match quiz:** Answer all five questions, verify the animated ranked carousel and percentage, and open a matched listing. Run the quiz a second time and confirm tags are cached. Run `npm run ai:backfill` and confirm published listings without tags are populated.
4. **Review summaries:** Open a listing with fewer than three reviews (no summary) and one with at least three (AI-generated pros, cons, and best-for tags). Confirm reviewer names never appear. Add a new verified review and reload; the cached summary should regenerate once for the new review count and then be reused.
5. **Host AI tools:** As a host, fill title, city, capacity, property type, and amenities. Generate a description; verify it contains no amenities or facilities not entered, then edit and regenerate it. Request pricing and confirm it is explicitly labelled as a suggestion and does not change the listing price automatically.
6. **Inbox translation:** As a guest and host, open a conversation, select English, Hindi, or Kannada, wait for incoming messages to translate, and use “Show original” / “Show translation”. Confirm the sender’s stored message remains unchanged.
7. **Safety and limits:** Submit HTML and prompt-injection strings in AI text fields and verify they are stripped/delimited and bounded. Exercise rate limits on each AI API route; verify 429 responses, including the friendly retry-in-a-minute message for provider throttling. Confirm `AI_API_KEY` is absent from browser source/network responses and AI token totals appear in `AiUsage`.

### Approximate API cost per request

Gemini free-tier quotas and paid prices vary by model and can change. Check the [official Gemini API pricing and rate limits](https://ai.google.dev/gemini-api/docs/pricing) before enabling paid usage. Concierge calls vary with tool rounds and chat history; natural-language search is a short structured-output request; vibe explanations and translations are short requests; review summaries scale with review text. Cached vibe tags and review summaries are not regenerated until listing content or review count changes.

| Feature | Approximate cost |
| --- | ---: |
| Concierge reply with one listing search/tool round | $0.01–$0.03 |
| Natural-language search interpretation | $0.002–$0.005 |
| Vibe quiz explanation after tags are cached | $0.003–$0.01 per quiz |
| One-time vibe tag backfill | Typically $0.01–$0.03 per batch of up to 25 listings |
| Review summary | $0.005–$0.20 per regeneration, depending on review volume |
| Host description generation | $0.003–$0.01 |
| Host pricing suggestion | $0.002–$0.01 |
| Inbox message translation | $0.002–$0.01 per message |
| Feedback and saving an already-generated itinerary | No additional model call |

## Notes

- Photography is loaded from Unsplash image URLs; an internet connection is needed to display the remote images.
- Search results require PostgreSQL and the seed data. Mapbox terrain, clustered pins, and camera fly-to require a public Mapbox access token.
- Razorpay is configured for test mode only; do not use live payment keys. Sign-in currently uses email/password, with Google OAuth optional.
- API rate limits use PostgreSQL so counters work across app instances. Expired `PENDING` holds are excluded from availability and cleaned up on booking/dashboard requests.
- Motion honors the operating system's reduced-motion preference.
