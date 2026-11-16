# PULT+ security — антиспам, Turnstile і Cloudflare (v1)
Status: separate feature branch. Does NOT change production DNS or Cloudflare settings automatically.

## What was implemented in this branch
- PostgreSQL-backed HMAC IP counters using existing pult_auth_attempts table:
  - POST /api/repairs: 6 attempts / 10 min / source IP.
  - POST /api/auth/register: 8 / 60 min / IP (original register limits still apply).
  - POST /api/experience/password/forgot: 8 / 20 min / IP (per-email reset limits also remain).
  - POST /api/orders: 12 / 10 min / IP.
  - Upon excess: HTTP 429 + Retry-After. If the limiter database fails, writes return HTTP 503 (fail closed).
- Cloudflare Turnstile on six repair forms, registration, and forgot-password.
- SERVER-SIDE Siteverify for each protected POST; rejects absent/invalid/expired tokens; verifies action and HTTPS hostname for real keys. Public config endpoint returns only sitekey.
- Existing login attempt limiter, bcrypt, session store, CSRF guards, parameterized SQL and input body size limits remain.
- A production start without both real Turnstile credentials fails instead of silently accepting bot requests.
- No SQL migration: uses existing pult_auth_attempts.
- DDoS network filtering requires a public hostname routed via Cloudflare proxy: cannot be configured for localhost and is not active yet.

## 1. Local testing (no Cloudflare account or paid domain needed)
1. Back up current files and run git status before switching branches.
2. In E:\server\Servis-Sait:
   git fetch origin
   git switch security/pult-hardening-v1
   git pull --ff-only origin security/pult-hardening-v1
3. In E:\server\Servis-Sait\server\.env add (official dummy credentials, LOCAL ONLY):

   TURNSTILE_SITEKEY=1x00000000000000000000AA
   TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA

   Keep NODE_ENV=development; PUBLIC_BASE_URL=http://localhost:3000.
   DO NOT commit .env or disclose real secrets.
4. Restart Node: node --env-file=server/.env server/app.js
5. Open http://localhost:3000/api/security/turnstile (JSON enabled:true, sitekey, NO secret).
6. Open /Laptop.html, choose a brand and complete the repair form, and check the Cloudflare widget appears. With the official testing keys, the dummy widget passes automatically. A repair submitted through UI should succeed and show the receipt.
7. Repeat for /register.html and /forgot-password.html using a disposable test account.
8. In developer tools Network, direct POST /api/repairs without turnstile_token must return HTTP 400. Invalid/used tokens should return 403. With excessive POST requests from one IP, expect HTTP 429; do not run destructive or high-volume tests against production.
9. If Chrome blocks challenges.cloudflare.com (ad-blocker or lost Internet), the form should display a helpful error and NOT submit (fail closed).
10. To disable Turnstile *only for local development*, remove both TURNSTILE_* keys and restart. Rate limiting remains active.

CAUTION: official dummy credentials bypass a real challenge. They are for checking integration only and MUST NEVER run publicly.

## 2. Production Turnstile in Cloudflare
1. Create a free account at https://dash.cloudflare.com and sign in.
2. Go to Turnstile -> Add widget.
3. Name: PULT+ production forms. Mode: Managed.
4. Set ONLY actual public hostname(s), e.g. shop.example.ua (replace example) — NOT localhost.
5. Save. Copy sitekey and SECRET key separately. Put secret ONLY in server/.env or hosting secrets.
6. Configure NODE_ENV=production, PUBLIC_BASE_URL=https://<real-hostname>,
   TURNSTILE_SITEKEY=<real-public-sitekey>, TURNSTILE_SECRET_KEY=<private-secret>.
   Keep a strong SESSION_SECRET. Use HTTPS.
7. Recheck /api/security/turnstile contains NO private secret. Test a valid challenge and a missing/expired/replayed token.
8. The template's script comes from https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit.
   If you add a strict CSP later, explicitly allow required Cloudflare challenge origins.
9. When migrating from test keys, keep staging and production credentials separate.
Reference: https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/
Siteverify: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

## 3. Network DDoS and unwanted traffic via Cloudflare (AFTER obtaining a domain and hosting)
1. In Cloudflare dashboard, Add a site (your actual domain). Follow onboarding DNS/NS instructions.
2. For the web frontend's A/AAAA/CNAME record, enable "Proxied" (orange cloud). DNS-only records do NOT go through Cloudflare.
3. Configure SSL/TLS "Full (strict)" with a valid certificate on your hosting origin.
   Do NOT use Flexible SSL.
4. Set Cloudflare WAF/managed Free rules and examine Security Analytics and Security Events.
5. Security rules -> Create rule -> Rate limiting rules (Free plans commonly have one).
   Protect requests to the public "/api/repairs" path; start conservative (e.g. 60 requests / minute / IP) and review legitimate traffic before tightening.
   Free plan rate-limit filter capabilities are restricted; don't assume per-method matching or multiple rules.
6. For targeted abusive paths you can add WAF custom rules. Do not issue a blanket Managed Challenge for /api/* (AJAX/JSON clients cannot always solve it).
7. IMPORTANT: prevent bypassing Cloudflare by directly connecting to your origin IP. Use host firewall/managed ingress allowlisting for Cloudflare's ingress addresses, a secure tunnel, or your provider's supported protected origin arrangement.
8. Only enable TRUST_PROXY=1 in server/.env if requests arrive through one configured, TRUSTED reverse proxy and the origin cannot be accessed directly. Never accept X-Forwarded-For or CF-Connecting-IP from direct anonymous clients. Incorrect proxy trust lets attackers spoof IPs and evade limits.
9. Keep PostgreSQL inaccessible from the public Internet; restrict admin access, secure port 5432, keep periodic backups.
10. Do not enable public access until real customers, checkout, session cookies and Turnstile have been tested end-to-end over HTTPS.

References:
- https://developers.cloudflare.com/dns/proxy-status/
- https://developers.cloudflare.com/waf/rate-limiting-rules/create-zone-dashboard/
- https://developers.cloudflare.com/waf/custom-rules/

## 4. Privacy / operations / cautions
- Never log Turnstile response tokens, Resend keys, session cookies or customer passwords.
- Turnstile is abuse mitigation, not a guarantee: determined humans/paid bot solvers can pass.
- IP quotas can affect a school, mobile carrier or office behind one NAT: monitor 429s and adjust.
- The existing 48 KB JSON-body limit rejects oversized requests; it is not a substitute for a reverse-proxy connection or request-rate limit.
- Load-testing must happen only on your own staging instance with realistic traffic limits.
- The server's 429 protects write operations but cannot stop a large network DDoS before it reaches your server. Cloudflare edge proxy + origin firewall are needed.
- An inability to reach Siteverify returns 503, preventing a request from being accepted without a check.
