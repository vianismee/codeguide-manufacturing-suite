# PAWGLOW System Frontend Guidelines

Welcome to the frontend guidelines for the PAWGLOW Manufacturing System. This document explains how our frontend is built, why we chose certain tools, and how you can maintain and scale it over time—no deep technical background required.

## 1. Frontend Architecture

We’re using a modern, full-stack approach based on Next.js 14. Here’s how it all fits together:

• **Framework & Language**
  • Next.js 14 App Router for file-based routing, server and client components
  • React for building UI in a component-based way
  • TypeScript for type safety and fewer runtime errors

• **UI & Styling**
  • Tailwind CSS for utility-first styling
  • Shadcn UI for a collection of ready-made, accessible React components

• **Data & Logic**
  • Supabase (PostgreSQL) for our main database with Row Level Security (RLS) for multi-tenant isolation
  • Clerk for user authentication, role management, and secure sessions
  • Stripe for subscription payments and webhook-driven entitlements
  • TanStack Query (React Query) for real-time data fetching, caching, and synchronization
  • Server Actions in Next.js for running sensitive business logic (e.g., COGS calculation) on the server

• **Enhancements**
  • Framer Motion for smooth animations
  • Sonner for toast notifications and user feedback
  • A placeholder OpenAI API utility for future AI features (e.g., formula optimization)

Why this architecture?
• **Scalability:** Modular folders (features/inventory, features/formulation, etc.), server/client separation, and API routes let us grow without tangling code.
• **Maintainability:** TypeScript and clear folder structure make the code easy to navigate and refactor.
• **Performance:** Next.js’s built-in optimizations (image handling, code splitting) plus React Query’s caching keep the UI fast and snappy.

## 2. Design Principles

Our UI is guided by three core principles:

1. **Usability**: Simple forms, clear tables, and intuitive navigation help users complete tasks with minimal clicks.
2. **Accessibility**: We follow WCAG best practices—semantic HTML, ARIA labels, keyboard navigation, and focus management—so everyone can use the app.
3. **Responsiveness**: Tailwind CSS breakpoints ensure layouts adapt gracefully from mobile phones to large desktops.

How we apply them:
• Buttons, inputs, and interactive elements have clear labels, sufficient touch targets, and consistent styling.
• Components include built-in keyboard support and ARIA attributes.
• Grid and flex utilities in Tailwind ensure data tables and dashboards look great on any screen.

## 3. Styling and Theming

### Approach & Tools
• **Tailwind CSS**: Utility-first classes speed up styling without writing custom CSS files.
• **Shadcn UI**: Pre-styled, accessible React components that integrate with Tailwind.
• **No CSS preprocessors** (SASS, Less) or BEM/SMACSS—Tailwind covers our needs.

### Theming
• We define colors, font sizes, and spacing in `tailwind.config.js`.
• Dark mode can be enabled via a toggle and the `class` strategy in Tailwind.

### Visual Style
• **Style**: Modern flat design with subtle shadows and rounded corners for a polished feel.
• **Primary Font**: Inter, sans-serif for readability and a clean look.

### Color Palette
• Primary: #2563EB (Blue 600)
• Secondary: #10B981 (Emerald 500)
• Accent: #F59E0B (Amber 500)
• Background: #F3F4F6 (Gray 100)
• Surface (cards, modals): #FFFFFF
• Text Primary: #111827 (Gray 900)
• Text Secondary: #6B7280 (Gray 500)
• Error: #EF4444 (Red 500)

## 4. Component Structure

We follow a component-based approach:

• **`components/ui/`**: Shared UI building blocks (buttons, inputs, modals) from Shadcn UI.
• **`features/`**: Feature folders (inventory, formulation, products) each contain:
  - `components/` for feature-specific UI
  - `hooks/` for custom logic
  - `server-actions/` for backend calls

Why it matters:
• **Reusability**: Shared components reduce duplication and ensure consistency.
• **Maintainability**: Changes in one place propagate everywhere.
• **Clarity**: Clear boundaries between features make onboarding and refactoring easier.

## 5. State Management

• **Server State**: Managed by TanStack Query (React Query). It handles loading, caching, and refetching data from Supabase or our API routes automatically.
• **Client State**: Local UI state (modals open/closed, form drafts) managed with React’s `useState` or Context API for global settings (e.g., theme).

Benefits:
• Prevents prop-drilling by co-locating data logic near the UI.
• Provides background refetching and stale-while-revalidate patterns for real-time updates.

## 6. Routing and Navigation

• **Next.js App Router**: File-based routing in `app/` folder.
  - Route groups: `(dashboard)/inventory/`, `(dashboard)/formulations/`, `(dashboard)/products/`
  - Nested layouts for sidebar, header, and main content areas

• **Link & Navigation Component**: We use Next’s `Link` component wrapped in our own navigation bar for consistent styling.

• **Protected Routes**: Middleware (`middleware.ts`) checks Clerk authentication and subscription status before rendering dashboard pages.

## 7. Performance Optimization

Key strategies we use to keep the UI fast:

• **Code Splitting**: Next.js automatically splits pages and dynamic imports for large components.
• **Lazy Loading**: Images with `next/image`, dynamic imports for charts or heavy components.
• **Caching & Stale Data**: React Query caches queries and only refetches when needed.
• **Minification & Compression**: Default Next.js build handles JS/CSS minification and Brotli/Gzip compression.
• **Server-Side Logic**: Offloading heavy calculations (like COGS) to server actions so the client stays responsive.

## 8. Testing and Quality Assurance

We ensure reliability through multiple layers of tests:

• **Unit Tests**: Jest + React Testing Library for component logic and UI behavior (e.g., form validation, button clicks).
• **Integration Tests**: Test how components work together, especially dynamic forms in the formulation module.
• **End-to-End (E2E) Tests**: Use Playwright or Cypress to simulate user flows—login, create material, build formula, calculate COGS.
• **Type Checking**: TypeScript compiler checks catch errors before runtime.
• **Pull Request Checks**: Automated tests run in CI (e.g., GitHub Actions) on every PR to keep master branch stable.

## 9. Conclusion and Overall Frontend Summary

This document has covered how the PAWGLOW System’s frontend is put together: a Next.js 14 and React foundation, TypeScript safety, Tailwind-powered modern styling, and a component-based structure. We rely on React Query for smooth data flows, Next.js server actions for secure business logic, and best practices in design and testing to deliver a reliable and accessible manufacturing management platform.

By following these guidelines, you’ll ensure the frontend remains scalable, maintainable, and performant as our system grows. Happy coding!