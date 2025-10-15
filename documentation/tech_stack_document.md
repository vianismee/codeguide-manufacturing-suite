# Tech Stack Document for PAWGLOW Manufacturing System

This document explains, in everyday terms, the technology choices behind the PAWGLOW Manufacturing System. Whether you’re a business stakeholder, project manager, or end user, this guide will help you understand why each piece of technology was selected and how it fits into the overall solution.

## 1. Frontend Technologies
The frontend is what you see and interact with in your browser. We chose tools that make the interface fast, responsive, and easy to maintain.

- **Next.js 14 (App Router)**  
  A React-based framework that handles page routing, server-side rendering, and building a fast user interface—all out of the box.

- **React**  
  A popular library for building user interfaces from reusable components (buttons, forms, tables, etc.).

- **TypeScript**  
  A superset of JavaScript adding type checks. It catches errors early and makes the code easier to understand and maintain.

- **Tailwind CSS & Shadcn UI**  
  Utility-first CSS (Tailwind) paired with a pre-built component library (Shadcn UI) for quickly styling forms, tables, and dashboards without writing a ton of custom CSS.

- **TanStack Query (React Query)**  
  Manages data fetching and keeps the screen in sync with the latest information from the server, so you see real-time inventory and formula updates.

- **Framer Motion**  
  Adds smooth, eye-catching animations to buttons, modals, and notifications, making the user experience feel polished.

- **Sonner**  
  A lightweight notification library for showing success messages (e.g. “Formula saved”) or error alerts.

- **(Optional) React Hook Form**  
  Recommended for handling complex forms—like the ingredient lists in the formulation module—providing built-in validation and error handling.

## 2. Backend Technologies
The backend powers the application logic, handles data storage, and enforces business rules behind the scenes.

- **Next.js API Routes & Server Actions**  
  Let us write server-side functions for tasks like automated material code generation and the core Cost of Goods Sold (COGS) calculations, keeping sensitive logic out of the browser.

- **Supabase (PostgreSQL)**  
  A managed database service using PostgreSQL. It stores materials, categories, formulas, version history, packaging, labels, and finished products.

- **Supabase Migrations & Row Level Security (RLS)**  
  - Migrations provide version control for your database schema, so changes are tracked and reversible.  
  - RLS ensures each company only sees its own data, critical for a multi-tenant SaaS environment.

- **TypeScript on the Server**  
  Brings the same safety and clarity to backend code, especially important for financial calculations.

- **Utility Modules (`utils/cogs.ts`, `utils/inventory.ts`)**  
  Encapsulate core business logic (like COGS computation and automated code generation) in standalone files for easy testing and reuse.

- **OpenAI API (Placeholder)**  
  Lays the groundwork for future AI-powered features, such as predicting inventory needs or suggesting formula optimizations.

## 3. Infrastructure and Deployment
This layer covers where and how the application is hosted, how code changes are managed, and how updates get rolled out.

- **Version Control: GitHub**  
  All code resides in a Git repository, enabling collaboration, change tracking, and code reviews.

- **CI/CD: GitHub Actions**  
  Automatically runs tests, lint checks, and builds whenever code is pushed, ensuring new changes don’t break existing features.

- **Hosting: Vercel**  
  Deploys the Next.js application globally with zero-configuration. Every code merge can trigger an automatic deployment.

- **Environment Variables Management**  
  Secrets (API keys, database credentials) are stored securely and injected at build time, keeping them out of the public codebase.

- **Supabase Project**  
  Hosted in the cloud, with built-in backups and monitoring for database reliability.

## 4. Third-Party Integrations
These external services add essential functionality without reinventing the wheel.

- **Clerk**  
  Handles user sign-up, login, session management, and role-based access control (R&D, inventory managers, administrators).

- **Stripe**  
  Manages subscription billing, payment workflows, and webhook events to control access based on payment status.

- **OpenAI (Future)**  
  APIs for potential features like inventory forecasting and formula recommendations.

- **Sonner & Framer Motion**  
  Enhance the user interface with notifications and animations (not third-party services, but key external libraries).

## 5. Security and Performance Considerations
Ensuring data stays safe and the app runs smoothly is critical for user trust and satisfaction.

- **Row Level Security (RLS)**  
  In Supabase, this restricts data so each company only sees its own records.

- **Server Actions for Sensitive Logic**  
  All core calculations (COGS, code generation) run on the server, preventing tampering in the browser.

- **Authentication Middleware**  
  Ensures that every request is checked for a valid user session before accessing protected routes.

- **Type Safety with TypeScript**  
  Catches errors early in both frontend and backend code, reducing runtime bugs.

- **Data Caching and Synchronization**  
  TanStack Query minimizes network requests by caching data and updating only when necessary, improving performance.

- **Error Handling and Validation**  
  We recommend adding comprehensive checks around formula creation (e.g., ensuring ingredient percentages sum to 100%) and wrapping key operations in try/catch blocks.

## 6. Conclusion and Overall Tech Stack Summary

PAWGLOW’s tech stack brings together proven, modern tools that align perfectly with its goals:

- **User-friendly Frontend**: Next.js, React, TypeScript, Tailwind CSS, and Shadcn UI for a responsive, accessible interface.  
- **Robust Backend**: Supabase (PostgreSQL, migrations, RLS) with server actions to securely manage complex workflows and financial calculations.  
- **Seamless Integrations**: Clerk for user management and Stripe for subscriptions streamline common SaaS requirements.  
- **Reliable Infrastructure**: GitHub, GitHub Actions, and Vercel automate deployments and ensure high uptime.  
- **Security & Performance**: Type safety, server-side logic, data caching, and RLS protect data integrity and speed up the user experience.

Together, these technologies reduce boilerplate work, enforce best practices, and provide a scalable foundation for the PAWGLOW Manufacturing System as it grows and adds new features.