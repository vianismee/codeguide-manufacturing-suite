# PAWGLOW Manufacturing System - Project Requirements Document (PRD)

## 1. Project Overview

The PAWGLOW Manufacturing System is a web-based SaaS application designed to digitize and streamline end-to-end manufacturing workflows. Built on a modern Next.js 14 starter template, this system centralizes raw material inventory, formulation versioning, finished product definition, and automated Cost of Goods Sold (COGS) calculations. It bridges the gap between R&D, inventory management, and financial reporting by providing an all-in-one platform that reduces manual errors, ensures traceability, and accelerates product time-to-market.

This project is being built to offer manufacturing companies an easy-to-adopt, subscription-based solution that replaces spreadsheets and fragmented tools. Key objectives include: 
- Enabling secure, role-based access for R&D personnel, inventory managers, and administrators
- Automating material code generation and COGS calculations with full audit trails
- Providing real-time dashboards and data synchronization to support rapid decision-making
- Delivering a polished, responsive UI for complex forms and tables

Success will be measured by user adoption rates, reduction in manual calculation errors (target: <1%), and system performance (page load <1s for main views).

---

## 2. In-Scope vs. Out-of-Scope

### In-Scope (Version 1.0)
- User Authentication & Management via Clerk with role-based permissions (R&D, Inventory, Admin).
- PostgreSQL database on Supabase with Row Level Security (RLS) for multi-tenant isolation.
- Inventory Module:
  - Define material categories and automated prefix-based codes (e.g., AI001).
  - CRUD operations for raw materials, packaging, and labels.
- Formulations Module:
  - Create/edit recipes with precise ingredient percentages.
  - Version control and audit trail for all formula changes.
- Finished Goods Module:
  - Link formula versions to packaging, labels, and net weight.
  - Server-side COGS calculation utility that fetches costs, prorates expenses, and saves results.
- Real-time data fetching and caching with TanStack Query for inventory, formulations, and products.
- Stripe integration for subscription management and webhook handling.
- Responsive UI components using Shadcn UI, Tailwind CSS, and Framer Motion animations.
- Basic OpenAI API integration placeholder for future AI-driven forecasting.
- Server Actions (`'use server'`) for business logic (COGS, code generation).
- Supabase migrations directory with initial schema for materials, formulas, and products.

### Out-of-Scope (Future Phases)
- Advanced AI features (inventory forecasting, formula optimization).
- Mobile native app or React Native support.
- Offline mode or local client caching.
- Detailed financial reporting dashboards beyond core COGS.
- Custom integrations (ERP, accounting software) beyond Stripe.
- Multi-currency support.
- PostgreSQL stored procedures for COGS (planned but not in v1).

---

## 3. User Flow

A new user lands on the marketing site, clicks "Get Started," and signs up using their company email via Clerk. After verifying their email, they log in and are routed to the Dashboard. The sidebar displays links to **Inventory**, **Formulations**, **Products**, and **Billing**. The user’s role determines which menu items and actions are visible (e.g., only Admins can access the Billing page).

From the Dashboard, an Inventory Manager navigates to the **Inventory** page to define new raw materials under categories like "Active Ingredient." Upon saving, a server action generates a unique code (e.g., AI042) and persists it to Supabase. Next, an R&D user visits **Formulations**, creates a new formula, adds ingredients from the inventory list, and assigns percentages. Saving triggers versioning and stores the recipe. Finally, the user goes to **Products**, links a formula version to packaging/labels, enters net weight, and clicks "Calculate COGS." The system runs the server-side COGS utility, writes the result to the database, and the UI auto-refreshes via TanStack Query to show updated cost metrics.

---

## 4. Core Features

- **Authentication & Authorization**: Clerk-based sign-up/login; role-based access control; middleware-enforced route protection.
- **Inventory Management**: Category and material CRUD; automated code generation; versioned records for packaging and labels.
- **Formulation Engine**: Dynamic recipe editor; ingredient percentage validation; server-side version control; audit trail.
- **Finished Product Definition**: Association of formula versions with packaging and weight; product listing with live COGS.
- **COGS Calculation Utility**: Server action that retrieves costs, prorates ingredient expenses, adds packaging/label costs, and writes final value.
- **Data Fetching & Caching**: TanStack Query for real-time synchronization and cache invalidation on mutations.
- **Subscription & Billing**: Stripe checkout integration; webhook listener for subscription events; gated feature access.
- **UI Components & Styling**: Shadcn UI and Tailwind CSS for tables, forms, modals; Framer Motion for page transitions and feedback.
- **Database Schema & Migrations**: Supabase migrations defining tables for multi-tenant data with RLS.
- **Future AI Hooks**: Basic OpenAI API client setup for forecasting or optimization modules.

---

## 5. Tech Stack & Tools

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **UI & Styling**: Shadcn UI, Tailwind CSS, Framer Motion, Sonner (notifications)
- **State & Data**: TanStack Query (React Query)
- **Authentication**: Clerk
- **Database & BaaS**: Supabase (PostgreSQL, RLS)
- **Payment**: Stripe (Checkout, Webhooks)
- **Server Actions**: Next.js server-side routes (`'use server'`)
- **AI Integration Placeholder**: OpenAI SDK
- **Testing**: Jest, React Testing Library, Playwright/Cypress
- **IDE Integration** (optional): Cursor, Windsurf for AI-assisted coding within VS Code

---

## 6. Non-Functional Requirements

- **Performance**: Page load time under 1s for primary dashboards; COGS calculation under 500ms for products with ≤50 ingredients.
- **Security**: End-to-end encryption (HTTPS); RLS for tenant isolation; secure session cookies; input sanitization and CSRF protection.
- **Scalability**: Support up to 10,000 concurrent users across multiple companies; use caching and horizontal scaling for Next.js server.
- **Availability**: 99.9% uptime; health checks and automatic restarts on failures.
- **Usability**: Accessible UI (WCAG 2.1 AA); responsive design for desktop and tablet.
- **Compliance**: GDPR-ready data handling; Stripe compliance for PCI DSS.

---

## 7. Constraints & Assumptions

- **Supabase Availability**: Assumes unlimited Supabase usage tier or sufficient quota for database rows and storage.
- **Stripe Restrictions**: Standard PCI compliance and webhook delivery limits.
- **Network Latency**: Users expected to be in regions with reliable internet; minimal offline support.
- **AI Model**: Placeholder integration assumes future OpenAI API keys and rate limits.
- **Browser Support**: Latest two versions of Chrome, Firefox, and Edge.
- **Team Expertise**: Developers are skilled in TypeScript, React, and SQL.

---

## 8. Known Issues & Potential Pitfalls

- **API Rate Limits**: Excessive Supabase or Stripe calls could hit rate limits—batch operations when possible, add retries with exponential backoff.
- **Complex Form Handling**: The formulation editor may become slow with many ingredients—consider integrating React Hook Form for performance.
- **Data Migrations**: Schema changes in production must be carefully versioned; test migrations on staging before applying.
- **COGS Accuracy**: Edge cases where percentages don’t sum to 100 must be validated client- and server-side to avoid erroneous calculations.
- **RLS Configuration**: Misconfigured policies could expose data; include automated tests to verify tenant isolation.
- **Subscription Sync**: Stripe webhook delays or failures could grant unauthorized access; implement idempotent webhook handlers and fallback checks on login.

By following this PRD, the PAWGLOW Manufacturing System can be built as a secure, high-performance, and user-friendly SaaS platform that meets manufacturing customers’ needs for inventory control, formulation management, and precise cost tracking.