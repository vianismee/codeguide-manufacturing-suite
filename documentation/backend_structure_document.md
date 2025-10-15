# Backend Structure Document for PAWGLOW Manufacturing System

This document provides a clear overview of the backend setup for the PAWGLOW Manufacturing System. It covers architecture, database design, APIs, hosting, infrastructure, security, monitoring, and maintenance, all described in everyday language.

## 1. Backend Architecture

Overall, the backend is built as a modern, modular web application using Next.js 14 and server-side functions. It follows these design principles:

• Component-based layering: UI, business logic, data access, and utilities each live in their own directories.  
• Server Actions (`'use server'`): secure, direct backend calls for business rules like COGS calculation or code generation.  
• Feature-based modules: inventory, formulations, products each get their own subfolder with components, server actions, and migrations.

How this helps:

• Scalability: Each feature can grow independently, and Vercel’s auto-scaling supports traffic spikes.  
• Maintainability: Clear separation of concerns means teams can work on inventory logic without touching payment code.  
• Performance: Server-side rendering and caching at the edge (via Vercel) deliver fast load times.

## 2. Database Management

We use Supabase’s hosted PostgreSQL database with these key points:

• Type: Relational (PostgreSQL) with strong transactional guarantees.  
• Access Layer: Supabase client with Row Level Security (RLS) enabled for multi-tenant data isolation.  
• Migrations: Schema changes are managed under `supabase/migrations/` for version control.  
• Backup & Replication: Handled automatically by Supabase, providing point-in-time recovery.

Data practices:

• Strict schema definitions to enforce data integrity (foreign keys, unique constraints).  
• RLS policies ensure companies only see their own records.  
• Regular backups and automated monitoring for disk usage and slow queries.

## 3. Database Schema

Below is the main schema in PostgreSQL. It’s laid out in SQL for clarity:

```sql
-- Companies table for multi-tenancy
CREATE TABLE companies (
  id              UUID PRIMARY KEY,
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Material categories (prefix used for automated codes)
CREATE TABLE material_categories (
  id              UUID PRIMARY KEY,
  company_id      UUID REFERENCES companies(id),
  name            TEXT NOT NULL,
  prefix          TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Materials (raw ingredients)
CREATE TABLE materials (
  id              UUID PRIMARY KEY,
  category_id     UUID REFERENCES material_categories(id),
  company_id      UUID REFERENCES companies(id),
  code            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  unit_cost       NUMERIC(12,4) NOT NULL,
  unit            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Packaging items (boxes, bottles)
CREATE TABLE packaging (
  id              UUID PRIMARY KEY,
  company_id      UUID REFERENCES companies(id),
  name            TEXT NOT NULL,
  unit_cost       NUMERIC(12,4) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Labels
CREATE TABLE labels (
  id              UUID PRIMARY KEY,
  company_id      UUID REFERENCES companies(id),
  name            TEXT NOT NULL,
  unit_cost       NUMERIC(12,4) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Formulas (recipes)
CREATE TABLE formulas (
  id              UUID PRIMARY KEY,
  company_id      UUID REFERENCES companies(id),
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Formula versions (audit trail)
CREATE TABLE formula_versions (
  id              UUID PRIMARY KEY,
  formula_id      UUID REFERENCES formulas(id),
  version_number  INTEGER NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(formula_id, version_number)
);

-- Ingredients in each formula version
CREATE TABLE formula_ingredients (
  formula_version_id UUID REFERENCES formula_versions(id),
  material_id        UUID REFERENCES materials(id),
  percentage         NUMERIC(5,2) NOT NULL,
  PRIMARY KEY (formula_version_id, material_id)
);

-- Finished products
CREATE TABLE products (
  id              UUID PRIMARY KEY,
  company_id      UUID REFERENCES companies(id),
  formula_version_id UUID REFERENCES formula_versions(id),
  packaging_id    UUID REFERENCES packaging(id),
  label_id        UUID REFERENCES labels(id),
  net_weight      NUMERIC(10,2) NOT NULL,
  cost_of_goods_sold NUMERIC(12,4) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

## 4. API Design and Endpoints

We use Next.js API Routes and Server Actions to expose backend logic:

• RESTful patterns: URLs under `/api/` handle JSON requests.  
• Key endpoints:
  – `POST /api/materials` – create a new material (auto code generated).  
  – `GET /api/materials` – list materials for the company.  
  – `POST /api/formulas` – create a new formula with versioning.  
  – `POST /api/products` – define a finished good and trigger COGS calc.  
  – `POST /api/webhooks/stripe` – Stripe webhook for subscription events.

Communication flow:

1. Frontend calls a server action or API route.  
2. Backend verifies authentication and company context via middleware.  
3. Business logic (e.g., `utils/cogs.ts`) runs, reading/writing Supabase.  
4. JSON response returns updated data or status.

## 5. Hosting Solutions

• Application Hosting: Vercel  
  – Provides auto-scaling, global CDN, and zero-downtime deploys.  
  – Edge caching speeds up static and dynamic content.  

• Database Hosting: Supabase (managed PostgreSQL)  
  – Automated backups, monitoring, and point-in-time recovery.  

Benefits:

• Reliability: Both Vercel and Supabase offer high SLAs.  
• Scalability: Handle growing numbers of users and data without manual ops.  
• Cost-effectiveness: Pay-as-you-go plans suit startups and small teams.

## 6. Infrastructure Components

• Load Balancer & CDN: Built into Vercel, routing traffic to edge nodes.  
• Caching:
  – Edge: Vercel caches static assets and SSR results when enabled.  
  – Client-side: TanStack Query caches API responses for dynamic pages.
• Edge Functions: Not currently used but available for low-latency logic.
• Webhooks: Stripe webhooks connect payment events to backend workflows.

These pieces work together to deliver fast, reliable pages, reduce server load, and keep data in sync.

## 7. Security Measures

• Authentication: Clerk handles sign-up/login and issues secure JWTs.  
• Authorization:
  – Middleware in `middleware.ts` verifies the user’s session and company context.  
  – Supabase RLS ensures SQL queries only return rows for the user’s company.
• Data Encryption:
  – TLS/HTTPS everywhere between client, Vercel, and Supabase.  
  – Data at rest encrypted by Supabase.
• Best Practices:
  – Validate all inputs in server actions.  
  – Use prepared statements and ORMs to prevent SQL injection.  
  – Implement rate limiting for API routes if needed.

## 8. Monitoring and Maintenance

• Error Tracking: Integrate Sentry or a similar tool to capture runtime errors in Server Actions and API Routes.  
• Performance Monitoring: Use Vercel Analytics and Supabase’s built-in metrics for query latency and database health.  
• Logging:
  – Structured logs from Next.js in JSON format.  
  – Webhook delivery logs for Stripe events.
• Maintenance:
  – Database migrations stored in Git and applied via Supabase CLI.  
  – Regular dependency updates and security patching.  
  – Scheduled reviews of RLS policies and backup integrity.

## 9. Conclusion and Overall Backend Summary

The PAWGLOW Manufacturing System backend is a well-architected, scalable, and secure solution. By leveraging Next.js 14, Supabase, Clerk, and Vercel:

• We ensure rapid development with clear separation of concerns.  
• Multi-tenant isolation and robust auth protect company data.  
• Automated COGS calculations and versioned formulas support core manufacturing workflows.  
• Global hosting and edge caching deliver fast user experiences.

Overall, this backend structure aligns with PAWGLOW’s goal of providing a reliable, user-friendly, and extensible manufacturing management platform, ready to grow with its customers.