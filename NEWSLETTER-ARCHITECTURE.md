# Newsletter Hub — Architecture Document

> **Author:** Architect Agent  
> **Date:** 2026-07-27  
> **Status:** Ready for implementation  
> **Scope:** Newsletter management area for Clawdbot Hub

---

## 1. Overview

A self-contained newsletter management system within Clawdbot Hub. Joshua can create multiple topic-based newsletters, manage subscriber lists, compose issues, and track send history — all from the hub UI. Actual email delivery is deferred (stored as "sent" in Supabase); a future integration with Beehiiv API or Resend can hook into the existing data model.

---

## 2. Supabase Schema

### 2.1 Table: `newsletters`

Stores each newsletter (e.g. "Today's Plays", "Marriage Compass").

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Unique identifier |
| `name` | `text` | NOT NULL | Newsletter display name |
| `description` | `text` | nullable | What this newsletter covers |
| `slug` | `text` | NOT NULL, UNIQUE | URL-safe identifier (auto-generated from name) |
| `category` | `text` | nullable | Topic tag (e.g. "trading", "faith", "business") |
| `cadence` | `text` | NOT NULL, default `'weekly'` | One of: `daily`, `weekly`, `biweekly`, `monthly` |
| `status` | `text` | NOT NULL, default `'draft'` | One of: `draft`, `active`, `paused` |
| `sender_name` | `text` | NOT NULL, default `'Joshua Levy'` | Custom "From" name |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

```sql
CREATE TABLE newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  slug text NOT NULL UNIQUE,
  category text,
  cadence text NOT NULL DEFAULT 'weekly'
    CHECK (cadence IN ('daily', 'weekly', 'biweekly', 'monthly')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused')),
  sender_name text NOT NULL DEFAULT 'Joshua Levy',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for listing
CREATE INDEX idx_newsletters_status ON newsletters(status);
```

### 2.2 Table: `subscribers`

Global subscriber pool. Each email exists once.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `email` | `text` | NOT NULL, UNIQUE | Subscriber email |
| `name` | `text` | nullable | Optional display name |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | When first added |

```sql
CREATE TABLE subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscribers_email ON subscribers(email);
```

### 2.3 Table: `newsletter_subscribers` (junction)

Many-to-many: which subscribers are on which newsletters.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `newsletter_id` | `uuid` | FK → `newsletters.id` ON DELETE CASCADE | |
| `subscriber_id` | `uuid` | FK → `subscribers.id` ON DELETE CASCADE | |
| `status` | `text` | NOT NULL, default `'active'` | `active` or `unsubscribed` |
| `subscribed_at` | `timestamptz` | NOT NULL, default `now()` | |
| `unsubscribed_at` | `timestamptz` | nullable | When they unsubscribed |

```sql
CREATE TABLE newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'unsubscribed')),
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  UNIQUE(newsletter_id, subscriber_id)
);

CREATE INDEX idx_ns_newsletter ON newsletter_subscribers(newsletter_id);
CREATE INDEX idx_ns_subscriber ON newsletter_subscribers(subscriber_id);
CREATE INDEX idx_ns_status ON newsletter_subscribers(status);
```

### 2.4 Table: `newsletter_issues`

Each composed/sent newsletter issue.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `newsletter_id` | `uuid` | FK → `newsletters.id` ON DELETE CASCADE | |
| `subject` | `text` | NOT NULL | Email subject line |
| `body_html` | `text` | NOT NULL | Rich text content (HTML) |
| `body_text` | `text` | nullable | Plain text fallback |
| `status` | `text` | NOT NULL, default `'draft'` | `draft`, `scheduled`, `sent` |
| `recipient_count` | `integer` | default `0` | How many it was sent to |
| `open_count` | `integer` | default `0` | Placeholder for future tracking |
| `click_count` | `integer` | default `0` | Placeholder for future tracking |
| `sent_at` | `timestamptz` | nullable | When it was "sent" |
| `scheduled_for` | `timestamptz` | nullable | Future send time |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |

```sql
CREATE TABLE newsletter_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  body_text text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sent')),
  recipient_count integer DEFAULT 0,
  open_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  sent_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_issues_newsletter ON newsletter_issues(newsletter_id);
CREATE INDEX idx_issues_status ON newsletter_issues(status);
CREATE INDEX idx_issues_sent_at ON newsletter_issues(sent_at DESC);
```

### 2.5 Table: `newsletter_activity`

Audit log / activity feed.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `newsletter_id` | `uuid` | FK → `newsletters.id` ON DELETE SET NULL, nullable | |
| `type` | `text` | NOT NULL | Event type (see below) |
| `description` | `text` | NOT NULL | Human-readable event description |
| `metadata` | `jsonb` | default `'{}'` | Extra data (issue_id, subscriber count, etc.) |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

Activity types: `newsletter_created`, `newsletter_updated`, `subscriber_added`, `subscribers_imported`, `subscriber_removed`, `issue_created`, `issue_sent`, `issue_scheduled`

```sql
CREATE TABLE newsletter_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id uuid REFERENCES newsletters(id) ON DELETE SET NULL,
  type text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_created ON newsletter_activity(created_at DESC);
CREATE INDEX idx_activity_newsletter ON newsletter_activity(newsletter_id);
```

### 2.6 RLS Policies

Since this is a single-user app authenticated via iron-session (not Supabase Auth), and the API routes use the service role key, **RLS can be disabled** on all newsletter tables. The API routes handle auth via `isAuthenticated()` before any DB access — matching the existing pattern used by Vault, Compass, etc.

```sql
-- Disable RLS (single-user, server-side auth via iron-session)
ALTER TABLE newsletters DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers DISABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers DISABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_issues DISABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_activity DISABLE ROW LEVEL SECURITY;
```

### 2.7 Combined Migration Script

A single SQL file to run in Supabase SQL Editor:

**File:** `~/clawd/clawdbot-hub/supabase/migrations/newsletter_tables.sql`

Contains all CREATE TABLE, INDEX, and ALTER TABLE statements from above.

---

## 3. API Routes

All routes live under `/api/newsletters/`. Every route:
1. Calls `isAuthenticated(request)` first (returns 401 if false)
2. Uses the shared `supabase` client from `@/lib/supabase`
3. Returns JSON responses

### 3.1 Route Map

| Method | Route | Purpose |
|--------|-------|---------|
| **GET** | `/api/newsletters` | List all newsletters with subscriber counts |
| **POST** | `/api/newsletters` | Create a new newsletter |
| **GET** | `/api/newsletters/[id]` | Get single newsletter with full details |
| **PUT** | `/api/newsletters/[id]` | Update newsletter settings |
| **DELETE** | `/api/newsletters/[id]` | Delete newsletter (cascades) |
| **GET** | `/api/newsletters/[id]/subscribers` | List subscribers for a newsletter |
| **POST** | `/api/newsletters/[id]/subscribers` | Add subscriber(s) to newsletter |
| **DELETE** | `/api/newsletters/[id]/subscribers` | Remove/unsubscribe from newsletter |
| **POST** | `/api/newsletters/[id]/subscribers/import` | Bulk import emails |
| **GET** | `/api/newsletters/[id]/issues` | List issues for a newsletter |
| **POST** | `/api/newsletters/[id]/issues` | Create a new draft issue |
| **GET** | `/api/newsletters/[id]/issues/[issueId]` | Get single issue |
| **PUT** | `/api/newsletters/[id]/issues/[issueId]` | Update issue (save draft) |
| **DELETE** | `/api/newsletters/[id]/issues/[issueId]` | Delete issue |
| **POST** | `/api/newsletters/[id]/issues/[issueId]/send` | Mark issue as sent |
| **GET** | `/api/newsletters/stats` | Dashboard stats (totals, per-newsletter) |
| **GET** | `/api/newsletters/activity` | Recent activity feed |

### 3.2 File Structure

```
src/app/api/newsletters/
├── route.ts                              # GET (list), POST (create)
├── stats/
│   └── route.ts                          # GET dashboard stats
├── activity/
│   └── route.ts                          # GET recent activity
└── [id]/
    ├── route.ts                          # GET, PUT, DELETE single newsletter
    ├── subscribers/
    │   ├── route.ts                      # GET, POST, DELETE subscribers
    │   └── import/
    │       └── route.ts                  # POST bulk import
    └── issues/
        ├── route.ts                      # GET (list), POST (create) issues
        └── [issueId]/
            ├── route.ts                  # GET, PUT, DELETE single issue
            └── send/
                └── route.ts             # POST send issue
```

### 3.3 Route Details

#### `GET /api/newsletters`

Returns all newsletters with subscriber counts (aggregated via a join or separate query).

**Response:**
```json
{
  "newsletters": [
    {
      "id": "uuid",
      "name": "Today's Plays",
      "slug": "todays-plays",
      "category": "trading",
      "cadence": "daily",
      "status": "active",
      "sender_name": "Joshua Levy",
      "subscriber_count": 142,
      "last_sent_at": "2026-07-25T08:00:00Z",
      "created_at": "..."
    }
  ]
}
```

**Implementation note:** Since Supabase JS can't do aggregate joins easily, do two queries:
1. Fetch all newsletters
2. Fetch subscriber counts grouped by newsletter_id
3. Fetch latest issue sent_at grouped by newsletter_id
4. Merge in JS

#### `POST /api/newsletters`

**Body:**
```json
{
  "name": "Today's Plays",
  "description": "Daily trading signals and analysis",
  "category": "trading",
  "cadence": "daily",
  "sender_name": "Joshua Levy"
}
```

Auto-generates `slug` from name (lowercase, hyphenated, deduped). Logs activity.

#### `POST /api/newsletters/[id]/subscribers`

**Body (single):**
```json
{ "email": "user@example.com", "name": "Optional Name" }
```

Logic:
1. Upsert into `subscribers` (ON CONFLICT email DO NOTHING — get the existing ID)
2. Insert into `newsletter_subscribers` (ON CONFLICT DO UPDATE status = 'active')
3. Log activity

#### `POST /api/newsletters/[id]/subscribers/import`

**Body:**
```json
{ "emails": "user1@example.com\nuser2@example.com\njohn@test.com" }
```

Logic:
1. Parse/split/dedupe emails (handle comma, newline, semicolon separators)
2. Validate email format (basic regex)
3. Upsert all into `subscribers`
4. Insert all into `newsletter_subscribers`
5. Return count of imported vs skipped (already subscribed)
6. Log activity with count

#### `POST /api/newsletters/[id]/issues/[issueId]/send`

Logic:
1. Load the issue (verify it belongs to this newsletter)
2. Count active subscribers for this newsletter
3. Update issue: `status = 'sent'`, `sent_at = now()`, `recipient_count = count`
4. Log activity
5. Return updated issue

**No actual email sending** — this just marks it. Future integration point for Beehiiv/Resend.

#### `GET /api/newsletters/stats`

**Response:**
```json
{
  "total_subscribers": 487,
  "total_newsletters": 3,
  "total_issues_sent": 28,
  "newsletters": [
    {
      "id": "uuid",
      "name": "Today's Plays",
      "subscriber_count": 142,
      "last_sent_at": "2026-07-25T08:00:00Z",
      "issues_sent": 15,
      "status": "active"
    }
  ]
}
```

#### `GET /api/newsletters/activity`

Query params: `?limit=20`

**Response:**
```json
{
  "activity": [
    {
      "id": "uuid",
      "type": "issue_sent",
      "description": "Sent \"Market Moves #15\" to 142 subscribers",
      "newsletter_id": "uuid",
      "metadata": { "issue_id": "uuid", "recipient_count": 142 },
      "created_at": "2026-07-25T08:00:00Z"
    }
  ]
}
```

---

## 4. Page Structure

All pages live under `/newsletter/` in the Next.js app directory.

### 4.1 Page Map

```
src/app/newsletter/
├── page.tsx                         # Newsletter Dashboard (overview)
├── create/
│   └── page.tsx                     # Create new newsletter form
└── [slug]/
    ├── page.tsx                     # Newsletter detail (subscribers + issues)
    ├── edit/
    │   └── page.tsx                 # Edit newsletter settings
    ├── subscribers/
    │   └── page.tsx                 # Full subscriber management view
    └── compose/
        ├── page.tsx                 # New issue (compose)
        └── [issueId]/
            └── page.tsx             # Edit existing draft issue
```

### 4.2 Page Details

#### `/newsletter` — Dashboard

The main landing page. Shows:
- **Stats cards row:** Total subscribers, Active newsletters, Issues sent this month, Overall open rate (placeholder)
- **Newsletter cards grid:** Each newsletter as a card showing name, status badge, subscriber count, last sent date, cadence badge. Click → goes to `/newsletter/[slug]`
- **Recent activity feed:** Last 10 activity entries
- **"Create Newsletter" CTA button** in top-right

**Component hierarchy:**
```
NewsletterDashboardPage
├── StatsCardRow
│   ├── StatCard (total subscribers)
│   ├── StatCard (active newsletters)
│   ├── StatCard (issues sent)
│   └── StatCard (open rate placeholder)
├── NewsletterGrid
│   └── NewsletterCard[] (one per newsletter)
├── ActivityFeed
│   └── ActivityItem[]
└── CreateNewsletterButton (Link to /newsletter/create)
```

#### `/newsletter/create` — Create Newsletter

Form page with fields:
- Name (text input)
- Description (textarea)
- Category (dropdown or text input)
- Cadence (select: daily/weekly/biweekly/monthly)
- Sender Name (text input, default "Joshua Levy")

On submit → POST `/api/newsletters` → redirect to `/newsletter/[slug]`

**Component hierarchy:**
```
CreateNewsletterPage
└── NewsletterForm (reused for create + edit)
    ├── TextInput (name)
    ├── TextArea (description)
    ├── TextInput (category)
    ├── SelectInput (cadence)
    ├── TextInput (sender_name)
    ├── CancelButton
    └── SubmitButton
```

#### `/newsletter/[slug]` — Newsletter Detail

The hub for a single newsletter. Two-tab layout:

**Tab 1: Issues**
- List of all issues (drafts and sent), ordered by created_at DESC
- Each row: subject, status badge, sent_at or "Draft", recipient_count
- Click draft → goes to `/newsletter/[slug]/compose/[issueId]`
- "Compose New Issue" button

**Tab 2: Subscribers**
- Subscriber count header
- Subscriber list table: email, name, status, subscribed_at
- "Add Subscriber" button (opens inline form or modal)
- "Import Subscribers" button (opens paste-area modal)
- Bulk actions: remove selected

**Top bar:**
- Newsletter name + status badge
- Edit settings button → `/newsletter/[slug]/edit`
- Pause/Activate toggle

**Component hierarchy:**
```
NewsletterDetailPage
├── NewsletterHeader
│   ├── BackLink (→ /newsletter)
│   ├── Newsletter name + description
│   ├── StatusBadge
│   ├── EditButton
│   └── StatusToggle (pause/activate)
├── TabBar (Issues | Subscribers)
├── IssuesTab
│   ├── ComposeButton (→ /newsletter/[slug]/compose)
│   └── IssuesList
│       └── IssueRow[] (subject, status, sent_at, recipients)
└── SubscribersTab
    ├── AddSubscriberButton
    ├── ImportSubscribersButton
    ├── SubscriberTable
    │   └── SubscriberRow[] (email, name, status, date)
    └── ImportModal (paste emails textarea)
```

#### `/newsletter/[slug]/compose` — Compose Issue

Rich text editor for creating a new newsletter issue.

- Subject line input
- HTML body editor (see section 5 for editor choice)
- Preview toggle (renders HTML in an iframe or styled div)
- Save Draft button
- Send button (with confirmation modal)
- Recipient indicator: "Will be sent to X active subscribers"

**Component hierarchy:**
```
ComposeIssuePage
├── BackLink (→ /newsletter/[slug])
├── SubjectInput
├── RichTextEditor
├── PreviewToggle
│   └── IssuePreview (rendered HTML)
├── RecipientCount
├── SaveDraftButton
├── SendButton
│   └── SendConfirmModal
└── AutosaveIndicator
```

#### `/newsletter/[slug]/compose/[issueId]` — Edit Draft

Same component as compose, but pre-populated with existing draft data. Only accessible for `status = 'draft'` issues.

---

## 5. Components

### 5.1 Reusable Components (new)

All go in `src/components/newsletter/`:

| Component | File | Purpose |
|-----------|------|---------|
| `NewsletterForm` | `NewsletterForm.tsx` | Create/edit newsletter form (shared) |
| `NewsletterCard` | `NewsletterCard.tsx` | Dashboard card for a newsletter |
| `StatCard` | `StatCard.tsx` | Metric card (number + label + icon) |
| `IssueRow` | `IssueRow.tsx` | Single issue in list view |
| `SubscriberTable` | `SubscriberTable.tsx` | Table of subscribers with actions |
| `ImportModal` | `ImportModal.tsx` | Modal for bulk email import |
| `RichTextEditor` | `RichTextEditor.tsx` | HTML editor for composing issues |
| `IssuePreview` | `IssuePreview.tsx` | Rendered HTML preview |
| `SendConfirmModal` | `SendConfirmModal.tsx` | "Are you sure?" before sending |
| `ActivityFeed` | `ActivityFeed.tsx` | List of recent activity events |
| `StatusBadge` | `StatusBadge.tsx` | Colored badge for status (active/draft/paused/sent) |
| `CadenceBadge` | `CadenceBadge.tsx` | Badge for cadence display |

### 5.2 Rich Text Editor Strategy

**Recommended approach:** Use a `<textarea>` with basic HTML support for v1. The body is stored as HTML. Provide:

1. A `<textarea>` for raw HTML/markdown input
2. A live preview pane (renders the HTML in a sandboxed `<div>` with `dangerouslySetInnerHTML`)
3. A simple formatting toolbar with buttons that insert HTML tags:
   - Bold (`<strong>`), Italic (`<em>`), Link (`<a>`), Heading (`<h2>`), List (`<ul>/<li>`), Image (`<img>`)

**Why not a full WYSIWYG?** Keeps the build simple — no new dependencies (TipTap, Slate, etc.). Joshua can write HTML directly or use the toolbar helpers. If WYSIWYG is needed later, swap the textarea for TipTap (it's the best React option).

**Alternative (if the builder prefers):** Install `@tiptap/react` + `@tiptap/starter-kit` (~50KB) for a proper WYSIWYG. Either approach works with the same data model.

### 5.3 Existing Components Reused

- `StatusBadge` pattern already exists in tasks page — adapt styling
- `StatCard` pattern exists in dashboard — adapt
- Modal pattern exists in vault page — follow same overlay/animation approach

---

## 6. Data Flow

### 6.1 Newsletter Dashboard Load

```
User visits /newsletter
  → page.tsx (client component, "use client")
  → useEffect: fetch('/api/newsletters/stats')
  → useEffect: fetch('/api/newsletters')
  → useEffect: fetch('/api/newsletters/activity?limit=10')
  → API routes check auth, query Supabase
  → State: newsletters[], stats{}, activity[]
  → Render: StatsCards + NewsletterGrid + ActivityFeed
```

### 6.2 Create Newsletter

```
User fills form on /newsletter/create
  → Submit: POST /api/newsletters { name, description, ... }
  → API: generate slug, insert into newsletters table
  → API: insert into newsletter_activity
  → Response: { newsletter: { id, slug, ... } }
  → Client: router.push(`/newsletter/${slug}`)
```

### 6.3 Add Subscriber

```
User clicks "Add Subscriber" on /newsletter/[slug]
  → Inline form appears: email + name inputs
  → Submit: POST /api/newsletters/[id]/subscribers { email, name }
  → API: upsert subscriber, insert junction row
  → API: log activity
  → Response: { subscriber: {...}, status: 'added' | 'already_subscribed' }
  → Client: add to subscriber list, show toast
```

### 6.4 Import Subscribers (Bulk)

```
User clicks "Import" → modal with textarea
  → Pastes emails (one per line, comma-separated, etc.)
  → Submit: POST /api/newsletters/[id]/subscribers/import { emails: "..." }
  → API: parse, validate, dedupe
  → API: batch upsert subscribers + junction rows
  → API: log activity with count
  → Response: { imported: 15, skipped: 3, invalid: 1 }
  → Client: close modal, refresh list, show summary toast
```

### 6.5 Compose & Send Issue

```
User visits /newsletter/[slug]/compose
  → Fresh form: subject + body editor
  → "Save Draft": POST /api/newsletters/[id]/issues { subject, body_html }
    → Creates issue with status='draft'
    → Returns issue with ID
    → URL updates to /newsletter/[slug]/compose/[issueId]
  
  → Subsequent saves: PUT /api/newsletters/[id]/issues/[issueId] { subject, body_html }
    → Updates existing draft
  
  → "Send": POST /api/newsletters/[id]/issues/[issueId]/send
    → Confirmation modal first
    → API: count active subscribers, update issue status='sent', set sent_at, recipient_count
    → API: log activity
    → Client: redirect to /newsletter/[slug], show success toast
```

### 6.6 Newsletter Slug Resolution

Pages use `[slug]` in the URL for readability. API routes need the newsletter `id` (uuid). 

**Resolution:** The detail page fetches the newsletter by slug first:
```
GET /api/newsletters → find by slug in the response list
```

Or add a dedicated query: fetch from newsletters where `slug = params.slug`. Since we already have `GET /api/newsletters/[id]`, the `[id]` parameter should accept **either** a UUID or a slug. The API route checks: if the param looks like a UUID, query by `id`; otherwise query by `slug`.

---

## 7. Sidebar Integration

Add to the `navItems` array in `src/components/Sidebar.tsx`:

```tsx
import { Mail } from "lucide-react";

// Add after "Podcast" and before "Family":
{ href: "/newsletter", icon: Mail, label: "Newsletter" },
```

**Placement in nav order:**
```
Dashboard
Morning Brief
Trading
Podcast
Newsletter  ← NEW
Family
Marriage
Moltbook 🦞
Tasks
Skills
Vault
Settings
```

This positions it with the other content/media tools (podcast, trading).

---

## 8. TypeScript Types

Add to `src/lib/supabase.ts` or create `src/lib/newsletter-types.ts`:

```typescript
export interface Newsletter {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  category: string | null;
  cadence: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  status: 'draft' | 'active' | 'paused';
  sender_name: string;
  created_at: string;
  updated_at: string;
  // Computed (joined):
  subscriber_count?: number;
  last_sent_at?: string | null;
}

export interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  newsletter_id: string;
  subscriber_id: string;
  status: 'active' | 'unsubscribed';
  subscribed_at: string;
  unsubscribed_at: string | null;
  // Joined:
  subscriber?: Subscriber;
}

export interface NewsletterIssue {
  id: string;
  newsletter_id: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  status: 'draft' | 'scheduled' | 'sent';
  recipient_count: number;
  open_count: number;
  click_count: number;
  sent_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsletterActivity {
  id: string;
  newsletter_id: string | null;
  type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface NewsletterStats {
  total_subscribers: number;
  total_newsletters: number;
  total_issues_sent: number;
  newsletters: Array<{
    id: string;
    name: string;
    subscriber_count: number;
    last_sent_at: string | null;
    issues_sent: number;
    status: string;
  }>;
}
```

---

## 9. Implementation Order

Recommended build sequence for a single session:

### Phase 1: Foundation (30 min)
1. Run the SQL migration in Supabase
2. Create `src/lib/newsletter-types.ts` with all types
3. Add sidebar nav item

### Phase 2: API Routes (45 min)
4. `GET/POST /api/newsletters` — list & create
5. `GET/PUT/DELETE /api/newsletters/[id]` — CRUD single
6. `GET/POST/DELETE /api/newsletters/[id]/subscribers` — subscriber mgmt
7. `POST /api/newsletters/[id]/subscribers/import` — bulk import
8. `GET/POST /api/newsletters/[id]/issues` — issues list & create
9. `GET/PUT/DELETE /api/newsletters/[id]/issues/[issueId]` — issue CRUD
10. `POST /api/newsletters/[id]/issues/[issueId]/send` — send
11. `GET /api/newsletters/stats` — dashboard stats
12. `GET /api/newsletters/activity` — activity feed

### Phase 3: Pages (60 min)
13. `/newsletter/page.tsx` — Dashboard with stats + grid + activity
14. `/newsletter/create/page.tsx` — Create form
15. `/newsletter/[slug]/page.tsx` — Detail with tabs (issues + subscribers)
16. `/newsletter/[slug]/edit/page.tsx` — Edit form (reuse NewsletterForm)
17. `/newsletter/[slug]/compose/page.tsx` — Compose with editor + preview

### Phase 4: Polish (15 min)
18. Import modal refinement
19. Toast notifications for actions
20. Empty states for new install
21. Loading skeletons

---

## 10. Future Integration Points

These are NOT in scope for v1, but the schema supports them:

| Feature | Integration | How |
|---------|-------------|-----|
| **Actual email delivery** | Resend or Beehiiv API | On "send", call API instead of just marking status |
| **Open/click tracking** | Resend webhooks | Update `open_count`, `click_count` on issue |
| **Scheduled sends** | Cron job | Query `status='scheduled'` where `scheduled_for <= now()` |
| **Unsubscribe link** | Public API route | `/api/newsletters/unsubscribe?token=...` |
| **Beehiiv sync** | Beehiiv API | Sync subscribers bidirectionally |
| **Templates** | New table `newsletter_templates` | Reusable HTML layouts |

---

## 11. Design Notes

### Visual Style
- Follow existing hub patterns: `bg-slate-950` page bg, `bg-slate-900` cards, `border-slate-800` borders
- Status badges: `active` = green, `draft` = yellow, `paused` = gray, `sent` = blue
- Use `lucide-react` icons: `Mail`, `Send`, `Users`, `FileText`, `Plus`, `Pencil`, `Trash2`, `Import`, `Eye`
- Montserrat font (already global)
- Primary color accents for CTAs

### Responsive
- Dashboard: 3-column grid on desktop, 2 on tablet, 1 on mobile (matching existing dashboard)
- Tables: horizontal scroll on mobile
- Compose editor: full-width, stacked preview on mobile

### Error Handling
- All API errors follow existing pattern: `{ error: string, detail?: string }`
- Client shows toast or inline error message
- Loading states use `Loader2` spinner from lucide-react (existing pattern in vault page)
