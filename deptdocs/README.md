# DeptDocs

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-BaaS-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

DeptDocs is a specialized internal document management portal built for the **Department of AI & Data Science at Christ University**. It streamlines the full lifecycle of departmental reports — from authoring and multi-step review, to official PDF generation, approval, and archival in Google Drive.

The platform replaces fragmented, email-and-Word-document reporting with a unified, role-based workflow where faculty compose structured reports, admins review and approve them, and approved reports are automatically rendered as University-formatted PDFs and pushed to the department's Drive archive.

---

## Table of Contents

1. [Key Features](#key-features)
2. [Tech Stack](#tech-stack)
3. [System Architecture](#system-architecture)
4. [How It Functions](#how-it-functions)
5. [Project Structure](#project-structure)
6. [Database Schema](#database-schema)
7. [Authentication & Authorization](#authentication--authorization)
8. [PDF Generation Pipeline](#pdf-generation-pipeline)
9. [Prerequisites](#prerequisites)
10. [Environment Setup](#environment-setup)
11. [Installation & Running](#installation--running)
12. [Database & Storage Setup](#database--storage-setup)
13. [Deployment](#deployment)

---

## Key Features

- **Role-Based Dashboards** — tailored experiences for Faculty (report authoring) and Admins (review, approval, management).
- **Multi-Step Form Builder** — modular steps for general info, speakers, participants, brochures, attendance, feedback, photos, synopsis, and sign-off.
- **Automated PDF Generation** — server-side rendering of University-formatted reports via `@react-pdf/renderer`, with a matching React `LivePreview` for real-time feedback while editing.
- **Digital Signatures** — signatures captured during onboarding and embedded into every generated PDF for authenticity.
- **Google Drive Archival** — approved reports are streamed directly to a department Drive folder via a Google Service Account; the resulting Drive link is persisted on the report.
- **Realtime Notifications** — Supabase Realtime powers instant alerts for assignments, revisions, approvals, and status changes.
- **Activity Logs** — immutable audit trail of administrative actions (approvals, rejections, reassignments).
- **AI-Assisted Extraction** — optional `/api/ai/extract` route leveraging Google Generative AI + `pdfjs-dist` / `xlsx` to parse uploaded brochures and attendance sheets into structured form data.
- **Access Management** — `ManageAccessModal` for sharing report ownership/collaboration.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Backend / BaaS | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| PDF Engine | `@react-pdf/renderer` |
| Drive Integration | `googleapis` (Service Account) |
| AI / Parsing | `@google/generative-ai`, `pdfjs-dist`, `xlsx` |
| Icons | `lucide-react` |
| Package Manager | pnpm |

## System Architecture

DeptDocs follows a modern serverless architecture. The Next.js frontend talks directly to Supabase for auth, data, realtime, and file storage. Privileged operations — PDF rendering and Drive upload — run inside Next.js API routes using the Supabase Service Role key and a Google Service Account.

```mermaid
graph TD
    Client[Next.js Frontend<br/>React 19 + Tailwind]
    Client <--> SupabaseAuth[Supabase Auth]
    Client <--> SupabaseDB[(Supabase PostgreSQL)]
    Client <--> SupabaseStorage[Supabase Storage<br/>signatures bucket]
    SupabaseDB -- Realtime channel --> Client

    Client -- POST /api/drive/upload --> API[Next.js API Route<br/>force-dynamic]
    API -- Service Role Key --> SupabaseDB
    API -- renderToStream --> PDF[@react-pdf/renderer<br/>ReportPDF component]
    PDF --> API
    API -- Service Account --> Drive[Google Drive API]
    Drive -- fileId / webViewLink --> API
    API -- persist link --> SupabaseDB

    Client -- POST /api/ai/extract --> AIAPI[AI Extract Route]
    AIAPI -- pdfjs / xlsx --> Parse[Document Parsing]
    AIAPI -- Gemini --> GenAI[Google Generative AI]
```

### Architectural Principles

- **Thin server, rich client** — most CRUD happens directly from the browser through Supabase's SSR-safe client; API routes exist only where secrets or heavy rendering are required.
- **Single source of truth for layout** — `ReportPDF.tsx` defines the document layout once; `LivePreview.tsx` mirrors it in the DOM so users see exactly what the final PDF will look like.
- **Middleware as the security gate** — `proxy.ts` enforces session, onboarding completion, and admin access on every request before the page ever renders.
- **RLS by default, service role at the edge** — normal user queries are protected by Supabase Row Level Security; only the Drive upload route escalates with the service role key to assemble the full report across users.

## How It Functions

A typical end-to-end flow:

1. **Sign up / Log in** — faculty register through `/signup` or sign in at `/login`. Password reset is handled at `/forgot-password`.
2. **Onboarding gate** — on first login, `proxy.ts` detects an incomplete profile and redirects the user to `/onboarding`, where they set their name, designation, and upload a digital signature image. The signature is stored in the public `signatures` bucket; its URL is saved on the `profiles` row.
3. **Create a report** — from `/home`, the faculty member starts a new report at `/home/new`. The multi-step form (`components/forms/*`) collects:
   - General Info (title, dates, venue, organizers)
   - Speaker Details & Profile
   - Participant Profile & Attendance
   - Brochure, Notice & Approval documents
   - Synopsis & Feedback Analysis
   - Activity Photos
   - Prepared-By sign-off
   - Supporting assets via `AssetManager`
4. **Autosave as draft** — all fields are stored in the `reports.data` JSONB column with `status = 'draft'`. The user can reopen it anytime from `/home/open`.
5. **AI-assisted extraction (optional)** — uploaded PDFs/spreadsheets can be sent to `/api/ai/extract`, which parses them with `pdfjs-dist` / `xlsx` and passes the text to Gemini to pre-fill fields like attendance rows or speaker bios.
6. **Submit for review** — marking the report `completed` flips its status and fires a Supabase Realtime notification to admins via the `notifications` table, surfaced through `NotificationBell`.
7. **Admin review** — at `/admin`, an admin opens the report in the same `LivePreview` the faculty used. They can either:
   - **Request revisions** — write `admin_feedback`, flip status back to `draft`, and notify the owner.
   - **Approve & Push** — trigger the PDF + Drive pipeline.
8. **PDF render + Drive upload** — the `/api/drive/upload` route (see [PDF Generation Pipeline](#pdf-generation-pipeline)) renders `ReportPDF` to a stream, uploads it to the configured Drive folder via a Service Account, and writes the returned link back into `reports.data`.
9. **Archive & audit** — the approved report remains queryable in Supabase, linked to its Drive copy, with a matching row in `activity_logs` describing the admin action.

## Project Structure

```text
deptdocs/
├── app/                        # Next.js App Router
│   ├── (auth routes)
│   │   ├── login/              # Email/password sign-in
│   │   ├── signup/             # Registration
│   │   ├── forgot-password/    # Password reset
│   │   └── auth/               # Supabase auth callbacks
│   ├── onboarding/             # First-time profile + signature capture
│   ├── home/                   # Faculty dashboard
│   │   ├── new/                # Multi-step report builder
│   │   └── open/               # Drafts and submitted reports
│   ├── admin/                  # Admin review queue & management
│   ├── settings/               # Profile / preferences
│   ├── api/                    # Serverless routes
│   │   ├── drive/upload/       # PDF render + Google Drive upload
│   │   └── ai/extract/         # AI-powered document extraction
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing
│   └── globals.css             # Tailwind entry
├── components/
│   ├── forms/                  # Modular report form steps
│   │   ├── GeneralInfo.tsx
│   │   ├── SpeakerDetails.tsx
│   │   ├── SpeakerProfile.tsx
│   │   ├── ParticipantProfile.tsx
│   │   ├── AttendanceList.tsx
│   │   ├── Brochure.tsx
│   │   ├── NoticeApproval.tsx
│   │   ├── Synopsis.tsx
│   │   ├── FeedbackAnalysis.tsx
│   │   ├── ActivityPhotos.tsx
│   │   ├── PreparedBy.tsx
│   │   └── AssetManager.tsx
│   ├── ReportPDF.tsx           # Source of truth for PDF layout
│   ├── ReportLayout.tsx        # Shared page chrome for reports
│   ├── LivePreview.tsx         # DOM mirror of ReportPDF
│   ├── Sidebar.tsx             # App navigation
│   ├── NotificationBell.tsx    # Realtime notifications UI
│   └── ManageAccessModal.tsx   # Report sharing / collaborators
├── lib/
│   └── logger.ts               # Shared logging helper
├── utils/
│   └── supabase/               # SSR-safe client & server factories
├── proxy.ts                    # Middleware — session, onboarding, admin gates
├── next.config.ts
├── tsconfig.json
└── package.json
```

## Database Schema

The PostgreSQL database (managed via Supabase) uses four core tables.

### `profiles`
Extended user metadata and digital signature.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, references `auth.users.id` |
| `full_name` | `text` | |
| `email` | `text` | |
| `designation` | `text` | e.g. Assistant Professor |
| `department` | `text` | default: `AI & Data Science` |
| `signature_url` | `text` | public URL from `signatures` bucket |

### `reports`
Core document entity — the entire report form is stored in `data` as JSONB.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `owner_id` | `uuid` | FK → `profiles.id` |
| `title` | `text` | |
| `status` | `enum` | `'draft'` \| `'completed'` |
| `data` | `jsonb` | activity details, speakers, attendance, drive link, etc. |
| `admin_feedback` | `text` | revision comments |
| `updated_at` | `timestamptz` | |

### `notifications`
Realtime alert feed per user.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | recipient |
| `title` | `text` | |
| `message` | `text` | |
| `link` | `text` | e.g. `/home/new?id=...` |
| `read` | `boolean` | |

### `activity_logs`
Immutable audit trail of admin actions.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_name` | `text` | actor |
| `description` | `text` | e.g. "Approved Report: Annual Tech Talk" |
| `created_at` | `timestamptz` | |

## Authentication & Authorization

### Onboarding Gate

1. **Signup** — user registers via Email/Password through Supabase Auth.
2. **First login** — `proxy.ts` middleware checks whether the user's profile has `full_name` and `signature_url`. If not, the user is redirected to `/onboarding`.
3. **Signature capture** — the user uploads a signature image which is stored in the public `signatures` bucket; the resulting URL is saved to `profiles.signature_url`.

### Middleware (`proxy.ts`)

- **Protected routes** — `/home`, `/admin`, and `/settings` all require an active Supabase session.
- **Onboarding gate** — authenticated users with incomplete profiles are force-redirected to `/onboarding`.
- **Admin gate** — access to `/admin` is restricted to an allow-list of hardcoded admin emails.
- **RLS** — all user-initiated queries go through Supabase RLS policies; the only escape hatch is the Drive upload API route, which uses the service role key to assemble cross-user data.

## PDF Generation Pipeline

The transformation from form data to archived Drive document happens entirely server-side for security and reliability.

1. **Faculty submits** — report status flips to `completed`; admin is notified.
2. **Admin reviews** via `LivePreview`, which shares rendering logic with `ReportPDF` so what-you-see equals what-you-get.
3. **Admin clicks "Approve & Push"** — frontend POSTs to `/api/drive/upload`.
4. **Server handler** (`export const dynamic = 'force-dynamic'`):
   - Initializes a Supabase client with the **service role key** to bypass RLS.
   - Fetches the full report row and every contributor's `profiles` row (for signatures).
   - Calls `renderToStream(<ReportPDF data={...} />)` from `@react-pdf/renderer`.
   - Authenticates to Google using the **service account JSON** and calls `drive.files.create` with the PDF stream, targeting `GOOGLE_DRIVE_FOLDER_ID`.
   - Persists the returned Drive link back onto `reports.data` and inserts an `activity_logs` row.
5. **Admin UI** shows the Drive link; a realtime notification is sent to the report owner.

## Prerequisites

- **Node.js** v20+
- **pnpm** (recommended) or npm
- **Supabase project** with Auth, Database, Storage, and Realtime enabled
- **Google Cloud Console** with:
  - Google Drive API enabled
  - A Service Account (with its JSON key)
  - A target Drive folder shared with the service account's email

## Environment Setup

Create `.env.local` in `deptdocs/` with the following:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key   # server-side only

# Google Drive (Service Account)
GOOGLE_DRIVE_FOLDER_ID=your_target_folder_id
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...", ...}'

# Google Generative AI (optional — for /api/ai/extract)
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> `GOOGLE_SERVICE_ACCOUNT_KEY` must be the entire JSON key as a single-line string. Remember to share the target Drive folder with the service account's `client_email`.

## Installation & Running

```bash
# 1. Clone
git clone https://github.com/your-org/deptdocs.git
cd deptdocs/deptdocs

# 2. Install
pnpm install

# 3. Dev server
pnpm dev            # http://localhost:3000

# 4. Production
pnpm build
pnpm start

# 5. Lint
pnpm lint
```

## Database & Storage Setup

1. **Tables** — create `profiles`, `reports`, `notifications`, and `activity_logs` as described in [Database Schema](#database-schema).
2. **RLS policies** — enable RLS on every table; allow owners to read/write their own rows, and allow admins (by email) to read/write all reports.
3. **Storage bucket** — create a public bucket named `signatures`.
4. **Auth providers** — enable Email/Password. (Optionally enable magic link.)
5. **Realtime** — enable Realtime on `notifications` so `NotificationBell` receives live updates.
6. **Admin allow-list** — update the hardcoded admin email(s) in `proxy.ts` to match your deployment.

## Deployment

### Vercel (recommended)

1. Import the repository in Vercel and select the `deptdocs/` subdirectory as the project root.
2. Add every variable from `.env.local` to the Vercel project settings.
3. Deploy. API routes such as `/api/drive/upload` and `/api/ai/extract` use `export const dynamic = 'force-dynamic'` to ensure they run on each request rather than being statically cached.
4. In Supabase, add your Vercel domain to the list of allowed redirect URLs for Auth.

### Self-hosting

Any Node.js 20+ environment works. Run `pnpm build && pnpm start` behind a reverse proxy (Nginx / Caddy) with TLS. Ensure outbound access to `*.supabase.co` and `www.googleapis.com`.

---

Built for the Department of AI & Data Science, Christ University.
