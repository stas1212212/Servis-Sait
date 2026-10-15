# PULT+ — Customer Service Suite (feature branch)

This branch is based on `feature/automatic-dark-theme-20261013`; **do not deploy it before the database migration**.

## One-time setup (PostgreSQL 13+)

1. Back up your `service_shop` database.
2. Ensure you have applied the existing setup scripts for users, products, orders and service requests.
3. In pgAdmin Query Tool run `server/sql/customer-service-suite.sql` **once**. It is safe to run repeatedly.
4. Restart Node.js, then log out and log in again (session version is now checked by the API).

The migration **does not delete** existing orders, repairs or users. It assigns tracking codes to old repairs, creates tables for password tokens, inbox notifications, contacts and moderated reviews.

## Run

Use Node.js 22+ (for built-in `process.loadEnvFile` and `fetch`), `npm ci`, then `node server/app.js`.
Place your credentials in `server/.env` (copy `server/.env.example`). Never commit `server/.env`.

## Email recovery setup

Password-reset emails use the Resend HTTPS API. Set all of these in `server/.env`:

- `RESEND_API_KEY` — your Resend API key
- `MAIL_FROM` — verified sender address at your domain
- `PUBLIC_BASE_URL` — e.g. `https://example.ua` (no trailing slash)

Until **all three** are configured and email sending works, the forgot-password page intentionally gives a neutral response but **cannot deliver the reset link**. This is not a local-email simulator; do not expose a reset token in console logs. A reset link is single-use, expires after 20 minutes and revokes prior API sessions once the user signs in again.

## New paths and features

| Area | Page / endpoint |
|---|---|
| Administrator inbox, reviews moderation, contacts | `/admin-hub.html` and `/api/experience/admin/*` |
| User password reset | `/forgot-password.html`, `/reset-password.html` |
| Public repair tracking (code only, no customer PII) | `/track.html`, `/api/experience/track/:code` |
| Reviews from authenticated owners of completed repairs | `/reviews.html` and `/api/experience/reviews` |
| Store search by model, description, brand & compatibility | `/pults-shop.html` |
| Editable contact information | `/contacts.html`, admin hub, shared header/footer |
| FAQ and warranty information | `/faq.html` |
| Delivery, payment and returns information | `/delivery.html` |

### Important

- Notifications are **in-app** (polling every 30 seconds when the admin hub is open), not push/email notifications.
- The public tracking code should be treated as a private link. Anyone holding it can see status but not customer information.
- Only logged-in customers whose repair is `completed` can submit a review, once per repair. Admin approval is required before public display.
- FAQ/delivery pages intentionally avoid stating unverified prices, deadlines or binding warranty periods. Confirm business policies before publication.
- The site still requires live PostgreSQL/browser testing, HTTPS and a persistent session store before production.
