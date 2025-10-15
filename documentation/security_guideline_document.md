# Security Guidelines for PAWGLOW Manufacturing System

This document provides a comprehensive set of security best practices tailored to the PAWGLOW Manufacturing System—a Next.js-14 starter template extended for manufacturing workflows, inventory management, formulation versioning, and automated COGS calculation. It aligns with industry-standard principles and covers the entire application stack.

---

## 1. Security-by-Design Principles

- **Least Privilege**: Grant every service, function, and user role only the permissions necessary. Use Clerk and Supabase Row Level Security (RLS) to enforce strict access control by tenant.
- **Defense in Depth**: Layer security at application, database, network, and infrastructure levels. For example, enforce authentication in `middleware.ts`, apply RLS in the database, and secure the hosting environment.
- **Secure Defaults**: All configuration files (e.g., Next.js, Supabase, Stripe webhooks) should ship with secure settings—HTTPS only, strong cipher suites, disabled debug modes.
- **Fail Securely**: On errors (database timeouts, webhook failures), do not leak internal details. Return generic error messages and log details to a secure monitoring system.

---

## 2. Authentication & Access Control

### 2.1 Clerk Authentication
- Enforce **MFA** for all administrator accounts.
- Configure **strict password policies**: minimum length 12, complexity checks, automatic rotation reminders.
- Use Clerk’s server-side SDK in Next.js `middleware.ts` to reject unauthenticated requests.

### 2.2 Role-Based Access Control (RBAC)
- Define roles: `admin`, `inventory_manager`, `r&d_user`, `viewer`.
- Server-side authorization: each API route and server action must verify the user’s role and tenant ID before any read/write operation.
- Tag every Supabase query with the current tenant’s `company_id` to prevent cross-tenant data access.

### 2.3 Session Management
- Use **HttpOnly**, **Secure**, and **SameSite=Strict** for session cookies.
- Enforce idle timeout of 15 minutes and absolute timeout of 8 hours.
- Protect against session fixation by regenerating session tokens on privilege change.

---

## 3. Input Validation & Output Encoding

### 3.1 Server-Side Validation
- Leverage Zod or a similar schema validator on all form inputs (inventory, formulation percentages, product definitions).
- Reject any API request with malformed or missing fields.

### 3.2 Prevent Injection Attacks
- Always use Supabase client’s parameterized queries or prepared statements; never concatenate SQL strings.
- Sanitize string inputs before including them in server-side template rendering.

### 3.3 File Upload Handling (if applicable)
- Restrict file types and maximum sizes.
- Store uploads outside the webroot, with unguessable file names and strict ACLs.

---

## 4. Data Protection & Privacy

### 4.1 Encryption
- Enforce **TLS 1.2+** on all client→server and internal API communications.
- Enable **AES-256** encryption at rest in the database (Supabase managed) and any storage buckets.

### 4.2 Secrets Management
- Do **not** hard-code API keys or database credentials. Use environment variables managed by a secrets manager (e.g., AWS Secrets Manager, Vault).
- Rotate Stripe/webhook secrets and Clerk API keys periodically.

### 4.3 Sensitive Data Handling
- Hash any stored PII or sensitive tokens with a strong algorithm (bcrypt/Argon2 for credentials).
- Mask sensitive fields in logs (e.g., do not log full credit card details or API secrets).

---

## 5. API & Web Application Security

### 5.1 HTTPS & Security Headers
- Enforce HTTPS with HSTS (`Strict-Transport-Security: max-age=31536000; includeSubDomains`).
- Add security headers:
  - `Content-Security-Policy`: restrict script/image sources.
  - `X-Frame-Options: DENY`.
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy: no-referrer-when-downgrade`.

### 5.2 CSRF Protection
- Use Next.js CSRF tokens or double-submit cookie pattern on all state-changing requests.

### 5.3 CORS Configuration
- Restrict allowed origins to the official PAWGLOW frontend domain(s).
- Disallow wildcard (`*`) origins for credentials.

### 5.4 Rate Limiting & Throttling
- Implement per-IP and per-user rate limits on critical endpoints (login, signup, webhook) using a middleware (e.g., Redis-backed limiter).

### 5.5 Stripe Webhook Security
- Validate webhook signatures using Stripe’s SDK before processing events.
- Limit webhook endpoint to POST requests.

---

## 6. Database Security & Integrity

### 6.1 Row Level Security (RLS)
- Enable RLS on all tables (`materials`, `formulas`, `products`, etc.) to enforce tenant isolation.
- Write explicit policies that filter `company_id = auth.jwt().company_id`.

### 6.2 Database Migrations & Versioning
- Use deterministic migrations under `supabase/migrations/` with lockfiles.
- Review migration scripts in code review to prevent accidental privilege escalations (e.g., granting public SELECT on sensitive tables).

### 6.3 Stored Procedures & Functions
- Consider implementing the COGS calculation as a PostgreSQL function for data integrity and performance.
- Grant EXECUTE permission only to the service role, not to end-users.

---

## 7. Infrastructure & DevOps Security

- Host on a hardened environment (e.g., managed Vercel, AWS with secure baselines).
- Disable all default credentials, SSH ports, and unnecessary services.
- Enforce CI/CD pipeline checks:
  - Static code analysis (ESLint, TypeScript strict mode).
  - Dependency scanning (Snyk, Dependabot) for known CVEs.
  - Automated test suite (unit tests for COGS logic, E2E for form workflows).

---

## 8. Dependency Management

- Use lockfiles (`package-lock.json`/`yarn.lock`) to pin dependencies.
- Regularly scan for vulnerabilities and update critical libraries (Next.js, Shadcn UI, Supabase client).
- Minimize third-party footprint; vet any new package for maintenance and security posture.

---

## 9. Monitoring, Logging & Incident Response

- Centralize logs in a protected service (e.g., Datadog, AWS CloudWatch) with PII redaction.
- Monitor critical metrics: failed login attempts, rate limit breaches, webhook errors.
- Define an incident response plan: alert on anomalous behavior, contain compromised sessions, rotate secrets.

---

## 10. Developer Best Practices

- Write **unit tests** for all business logic (especially `utils/cogs.ts` and server actions).
- Enforce code reviews focused on security (authentication checks, input validation).
- Document security rationale in code (JSDoc, PR descriptions) when deviating from defaults.

---

By adhering to these guidelines, the PAWGLOW Manufacturing System will maintain robust security at every layer—ensuring data integrity, tenant isolation, and compliance with industry best practices. Please review these controls periodically and update them to address emerging threats or architecture changes.