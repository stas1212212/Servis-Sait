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


## Google Maps service center location (location feature branch)

The home page (`/index.html`), store (`/pults-shop.html`) and contacts page (`/contacts.html`) include the location section.

**Set up the location without new SQL migrations:**
1. Log in as an admin and open `http://localhost:3000/admin-hub.html`.
2. Under **Контакти та налаштування сайту**, fill in **Адреса** with a precise, public business address (country, city, street and building number). Optionally provide `Телефон` and `Години роботи`.
3. Click **Зберегти контакти** and reload one of the three pages.
4. Check that the Google Maps pin matches your actual service center. If Google picks the wrong location, correct or clarify the address before making the site public.
5. Confirm that **Прокласти маршрут** opens Google Maps with the correct destination.

No Google Maps API key is required for the basic iframe/map search URL. The iframe is lazy-loaded to reduce initial page load. Visitors may send network data to Google when the map loads. This feature does not use geolocation permissions or track site visitors.

**If address is blank or site settings cannot be loaded**, the map stays hidden and the page remains functional. Do not claim a physical location until the business address is confirmed.

Only the location component, shared styles and static tests are changed on this feature branch; no database schema changes are required.


## Manual Nova Poshta repair logistics (feature branch)

This feature is independent of the main authentication schema. **Do not run `database.sql` again.**

1. Back up the working `service_shop` database with pgAdmin Backup.
2. In pgAdmin select the database configured by `server/.env` (`DB_NAME`), open Query Tool and run **`server/sql/shipping-setup.sql`** once (safe to repeat). Do not run against a different database. It adds three tables: `repair_shipments`, `repair_intakes`, `shipping_recipient_settings`; it does not drop or rewrite users, logins or existing repairs.
3. Start server using `node --env-file=server/.env server/app.js`.
4. Sign in as an admin and open **`/admin-shipping.html`**, enter the exact recipient **physical person's full name, phone number, city and Nova Poshta branch**. This private configuration is **not** published through `/api/experience/settings`, Google Maps or the unauthenticated repair tracking endpoint. Share with individual customers only after accepting their application.
5. Client submits a repair request and optionally selects Nova Poshta with a return city/branch. Repair and shipment rows are written in one transaction; if the shipping schema is missing the delivery-enabled request fails with an explicit 503 instead of leaving a partial request. The old repair form still works without shipping enabled.
6. After sending, authenticated clients who filed their repair under the same account open **`/shipping.html`** to record the 14-digit incoming TTN. Guests must give their TTN to the admin manually; guessing the public RP code must never grant shipment-edit permissions.
7. Admin records inbound tracking status manually, checks actual contents and fills the acceptance report (condition, accessories, optional serial number), then updates the repair status in `/admin.html`.
8. After the repair is completed, admin manually creates the outbound shipping label **outside PULT+**, records the 14-digit outbound TTN, return branch and client recipient contacts, and updates progress manually. Each leg has a separate tracking number. No payment or shipping-order API is integrated.

**Privacy/safety:** physical recipient contacts are admin-only; customer's contacts and delivery status are accessible only to the account owning the repair or an admin. Public `RP-` tracking remains status-only. Delivery events are entered manually; never pretend to have real-time status from Nova Poshta.

**Verification:** `node --check server/routes/shipping.js`, `node --test tests/shipping.test.js`, run all test files, then exercise a full trial shipment in a test/staging database. GitHub tests use mock persistence and do not constitute an actual PostgreSQL/Nova Poshta integration test.
