# Grandma Jazz - Family Member Wall

## Overview

Grandma Jazz is a web application for an elegant weed cafe in Kamala that allows visitors to join "the family" by submitting their information. The application features a visually striking animated brick wall interface where each family member is represented as a brick. New members are highlighted with a spotlight effect when they join, creating an engaging and welcoming experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- Framer Motion for animations and transitions
- TanStack Query (React Query) for server state management

**UI Framework:**
- Shadcn/ui component library with Radix UI primitives
- Tailwind CSS v4 for styling with custom theme configuration
- Custom black and white elegant theme with sharp edges (zero border radius)
- Galvji font family for typography

**Key Design Decisions:**
- **Component-based architecture:** Modular UI components in `/client/src/components`
- **Form handling:** React Hook Form with Zod schema validation for type-safe form submissions
- **Animation strategy:** Framer Motion for sophisticated brick animations, spotlight effects, and infinite scrolling wall
- **State management:** React Query for server state, React hooks for local UI state

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript
- HTTP server (no WebSocket implementation despite ws dependency)
- Custom middleware for request logging with formatted timestamps

**API Design:**
- RESTful API endpoints under `/api` prefix
- Two main endpoints:
  - `GET /api/members` - Retrieve all family members
  - `POST /api/members` - Create new family member
- Schema validation using Zod before database operations

**Error Handling:**
- Try-catch blocks with generic error responses
- Zod validation errors returned as 400 responses
- 500 status codes for server errors

### Data Storage

**Database:**
- PostgreSQL via Neon serverless driver
- Drizzle ORM for type-safe database queries
- Schema located in `/shared/schema.ts` for sharing between client and server

**Data Model:**
```typescript
familyMembers table:
- id: UUID (primary key, auto-generated)
- title: text (e.g., "Uncle", "Sister", "Grandma")
- name: text (2-12 characters)
- email: text (base64 encoded for privacy)
- mailchimpAdded: boolean (tracks mailing list status)
- welcomeEmailSent: boolean (tracks email delivery)
- followupScheduled: boolean (for future follow-up emails)
- createdAt: timestamp
```

**Design Decisions:**
- Database abstraction through storage interface pattern (`IStorage`)
- Single table design for family members
- Shared schema definitions between frontend and backend for consistency

### VPS Deployment

The app is exportable to a Linux VPS behind NGINX + Cloudflare with PM2.
- **Spec:** see `EXPORT_SPEC.md` (authoritative)
- **One-shot deploy prompt:** see `CODEX_DEPLOY_PROMPT.md`
- **PM2 config:** `ecosystem.config.cjs`
- **Health check:** `GET ${BASE_PATH}api/healthz`
- **Subpath mount:** set `BASE_PATH=/third-tool/` (build-time + runtime); all assets/routes/fetches respect it via Vite's `base` and `import.meta.env.BASE_URL`
- **Defaults:** `PORT=3000`, `HOST=0.0.0.0`
- **SEO:** `<meta name="robots" content="noindex,nofollow,noarchive">` baked into HTML; respects upstream `X-Robots-Tag`
- **No sitemap** is generated for this app

### Build & Deployment

**Build Process:**
- Custom build script (`script/build.ts`) using esbuild for server bundling
- Vite for client-side bundling
- Server dependencies bundled selectively (allowlist approach) to reduce cold start times
- Static file serving from `dist/public` in production

**Development Environment:**
- Vite dev server with HMR on port 5000
- Development-only plugins: Replit cartographer and dev banner
- Custom meta images plugin for OpenGraph image URL updates
- Runtime error overlay for better debugging

**Production Considerations:**
- Single CommonJS bundle for server code
- Static client assets served via Express
- SPA fallback to index.html for client-side routing

## External Dependencies

### Third-Party Services

**Neon Database:**
- Serverless PostgreSQL provider
- Connection via `DATABASE_URL` environment variable
- HTTP-based connection using `@neondatabase/serverless` driver

**Mailchimp Integration:**
- Adds new family members to mailing list automatically
- Tags subscribers with "family-member" and "wall-signup"
- Environment variables: MAILCHIMP_API_KEY, MAILCHIMP_SERVER_PREFIX, MAILCHIMP_AUDIENCE_ID

**Resend Email Integration:**
- Sends welcome emails when members join
- Beautiful HTML email matching website design (black/white theme, wall brick pattern)
- Uses Replit connector for API key management
- Falls back to onboarding@resend.dev for testing (production requires verified domain)

**Replit Platform Integration:**
- Vite plugins for development environment (`@replit/vite-plugin-*`)
- Custom meta image plugin that detects Replit deployment domains
- Support for opengraph images in multiple formats (png, jpg, jpeg)
- Resend connector for secure email API management

### Key NPM Packages

**Frontend:**
- `@tanstack/react-query` - Server state management
- `framer-motion` - Animation library
- `react-hook-form` + `@hookform/resolvers` - Form handling
- `zod` - Schema validation
- `wouter` - Routing
- Complete Radix UI component library for accessible primitives

**Backend:**
- `drizzle-orm` + `drizzle-zod` - ORM and schema validation
- `express` - Web framework
- `tsx` - TypeScript execution for development

**Build Tools:**
- `vite` + `@vitejs/plugin-react` - Frontend bundling
- `esbuild` - Server bundling
- `tailwindcss` - Styling
- TypeScript for type checking across the stack

### Configuration Files

- `components.json` - Shadcn/ui configuration with New York style
- `drizzle.config.ts` - Database migrations configuration
- `vite.config.ts` - Frontend build and dev server settings
- `tsconfig.json` - TypeScript configuration with path aliases