# Deployment guide

## 1. Provision PostgreSQL

Create a managed PostgreSQL database with Neon, Supabase, or another PostgreSQL provider. Enable TLS. Configure:

- `DATABASE_URL` with the provider's pooled connection string for Vercel runtime traffic.
- `DIRECT_URL` with the provider's direct (non-pooled) connection string for Prisma migrations and administrative scripts.

Do not expose either connection string to browser code.

## 2. Configure Vercel

Import the repository into Vercel and set the production domain in `NEXTAUTH_URL`. Add the environment variables below to the appropriate Vercel environments. Keep credentials server-side; only the Mapbox public token is intended for browser use.

Set the install command to `npm install` (or use Vercel's default). The package `postinstall` runs `prisma generate`; the build command is `npm run build`.

## 3. Apply database migrations

Before routing production traffic to a schema change, run the migration deploy command with the production `DIRECT_URL` configured:

```powershell
npm run db:migrate:deploy
```

Run this once from a trusted release job or operator workstation, not in every serverless function startup.

## 4. Optional production seed

The production seed inserts missing demo destinations, amenities, and listings without updating or deleting existing records, then creates/updates the admin account from the required environment credentials:

```powershell
npm run db:seed:production
```

Run this only if demo listings are desired in the production marketplace. Use a unique `ADMIN_EMAIL` and a long, unique `ADMIN_PASSWORD`; never commit credentials or use a shared default password.

## 5. Configure integrations

- **Auth.js:** set a high-entropy `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and optional Google OAuth credentials. Configure the Google callback as `https://<your-domain>/api/auth/callback/google`.
- **Razorpay:** begin with test keys. Configure the webhook URL as `https://<your-domain>/api/payments/webhook` and subscribe to `payment.captured`, `payment.failed`, and `refund.processed`. Verify signatures and run test transactions before changing to live credentials.
- **Cloudinary:** configure the cloud name, API key, and API secret for signed, host-scoped uploads.
- **Email:** configure Resend and a verified `EMAIL_FROM` address if booking emails are required.
- **Mapbox:** optionally set the public access token for terrain maps and host pin placement.
- **AI:** set `AI_PROVIDER=gemini`, a server-only `AI_API_KEY`, and optionally `AI_MODEL`. The current implemented adapter is Gemini; other provider labels are not implemented yet.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled PostgreSQL URL used at runtime. |
| `DIRECT_URL` | Yes for migrations | Direct PostgreSQL URL used by Prisma CLI. |
| `NEXTAUTH_URL` | Yes | Canonical application origin. |
| `NEXTAUTH_SECRET` | Yes | Auth.js signing/encryption secret. |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Optional | Public map token; the only intentionally public secret-like value. |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret. |
| `RAZORPAY_KEY_ID` | For checkout | Razorpay key ID (test mode until launch approval). |
| `RAZORPAY_KEY_SECRET` | For checkout | Server-only Razorpay checkout verification secret. |
| `RAZORPAY_WEBHOOK_SECRET` | For webhooks | Server-only Razorpay webhook signature secret. |
| `CLOUDINARY_CLOUD_NAME` | For uploads | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | For uploads | Server-only Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | For uploads | Server-only Cloudinary API secret. |
| `RESEND_API_KEY` | Optional | Server-only email API key. |
| `EMAIL_FROM` | Optional | Verified sender address for transactional email. |
| `ADMIN_EMAIL` | For admin seed | Initial admin email. |
| `ADMIN_PASSWORD` | For admin seed | Unique password, at least 12 characters. |
| `ADMIN_NAME` | Optional | Initial admin display name. |
| `AI_PROVIDER` | Optional | `gemini` (implemented), `groq`, or `anthropic` (not implemented). |
| `AI_API_KEY` | For AI | Server-only provider API key. |
| `AI_MODEL` | Optional | Gemini model; defaults to `gemini-2.5-flash`. |
| `PLAYWRIGHT_BASE_URL` | Test only | Use an already-running application for Playwright. |

Keep `.env.local` and all production values out of version control. The checked-in `.env.example` contains variable names only.

## Post-deploy checklist

- Confirm the deployment uses the production PostgreSQL database and all migrations are applied.
- Check `/`, `/explore`, a published listing, `/robots.txt`, and `/sitemap.xml`.
- Confirm security headers are present and browser responses contain no server API keys or database URLs.
- Sign up a test guest, verify a booking with Razorpay test mode, and verify webhook retries do not duplicate confirmation or refund actions.
- Submit a host listing, approve it with an admin account, and confirm published search results and listing JSON-LD.
- Check email delivery, Cloudinary uploads, Mapbox fallback behavior, and AI quota/error handling for configured integrations.
- Run Lighthouse on production and record the results on representative public pages; no Lighthouse score is claimed by this repository without a production-like environment and browser run.
