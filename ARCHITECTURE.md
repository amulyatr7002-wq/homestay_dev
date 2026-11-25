# Architecture

```mermaid
flowchart TD
    Browser[Browser: Next.js UI] --> Pages[App Router pages and metadata routes]
    Browser --> Routes[API route handlers]
    Pages --> Auth[Auth.js session and role checks]
    Routes --> Auth
    Pages --> Services[Search, booking, pricing, AI, and payment helpers]
    Routes --> Services
    Services --> Prisma[Prisma Client]
    Prisma --> Postgres[(Managed PostgreSQL)]
    Routes --> Gemini[Gemini API]
    Routes --> Razorpay[Razorpay API and signed webhooks]
    Routes --> Cloudinary[Cloudinary signed uploads]
    Routes --> Email[Resend email]
    Browser --> Mapbox[Mapbox GL with static fallback]
```

AI, payment, database, and Cloudinary credentials stay on the server. The Mapbox token is intentionally public and must be restricted to the deployed site origin. Prisma is the persistence boundary; booking totals and availability are recalculated by server routes before a hold is created.
