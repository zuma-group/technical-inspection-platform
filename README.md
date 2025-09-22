# Technical Inspection Platform

A high-performance equipment inspection system designed for field technicians to inspect construction and industrial machinery. Built with a focus on speed, mobile optimization, and one-finger operation in harsh outdoor conditions.

## Key Features

- ⚡ **Lightning-Fast Performance**: Server-side rendering, minimal client JS, optimistic UI updates
- 📱 **Mobile-First Design**: Large touch targets (48px min), one-finger operation, direct camera access
- 🔍 **Smart Inspection Workflow**: Auto-creates inspections, tracks progress across sections
- 📸 **Integrated Media Capture**: Direct camera/video capture with HTML5, instant uploads
- 🔧 **Automated Status Updates**: Equipment status automatically determined by checkpoint results
- ✅ **Efficient Checkpoint System**: Pass/Corrected/Action Required states with repair time estimates
- 🎯 **Field-Optimized**: Works in bright sunlight, with gloves, in dusty/wet conditions

## Supported Equipment

- Boom Lifts
- Scissor Lifts
- Telehandlers
- Forklifts
- Other construction/industrial machinery

## Tech Stack

- **Framework**: Next.js 15 with App Router (Server Components)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Pure CSS (no Tailwind for maximum performance)
- **State Management**: Server Actions for instant UI updates
- **Media Storage**: Local filesystem with direct URL access

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd technical-inspection-platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Update `.env` with your PostgreSQL connection:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/team_inspection_tool?schema=public"
```

4. Set up the database:
```bash
# Push schema to database
npm run db:push

# Seed with test equipment
npm run db:seed
```

5. Run the development server:
```bash
npm run dev
```

The server will auto-find an available port and open in your browser.

## Commands

```bash
# Development
npm run dev                  # Start development server (auto-finds available port)
npm install                  # Install dependencies

# Database
npm run db:push              # Push schema changes to database (use --force-reset for breaking changes)
npm run db:seed              # Seed database with test equipment

# Build & Deploy
npm run build                # Build for production (includes Prisma generate)
npm run start                # Start production server
```

## Project Structure

```

# Technical Inspection Platform - S3 Video Uploads

Environment variables required for S3 uploads (add to `.env.local` or environment):

```
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
# Optional for S3-compatible providers:
S3_ENDPOINT=
S3_FORCE_PATH_STYLE=true

# Used for generating absolute media links in emails/PDF:
NEXT_PUBLIC_SITE_URL=
```

Commands:

```
npm install
npm run db:push
```

CloudFront (optional but recommended):

```
# CloudFront distribution domain (without protocol)
CLOUDFRONT_DOMAIN=

# For signed URLs (private distributions)
CLOUDFRONT_KEY_ID=
CLOUDFRONT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Notes:
# - Keep S3 bucket private and grant CloudFront access via OAC/OAI.
# - Uploads still go directly to S3 (presigned POST). Downloads are served via CloudFront through /api/media/[id].
# - If KEY_ID and PRIVATE_KEY are set, media GETs will redirect to CloudFront signed URLs; otherwise public CF URL.
```

app/
├── page.tsx                 # Equipment list (server component)
├── inspect/[id]/
│   ├── page.tsx            # Inspection setup (server)
│   ├── client.tsx          # Inspection UI (client)
│   ├── modal.tsx           # Checkpoint modal
│   └── actions.ts          # Server actions
├── api/upload/             # Media upload endpoint
└── globals.css             # Pure CSS (no Tailwind)

prisma/
├── schema.prisma           # Database schema
└── seed.js                 # Test data

lib/prisma.ts              # Prisma client singleton
public/uploads/            # Uploaded media files
```

## Inspection Workflow

1. **Select Equipment**: Browse/search equipment list on home page
2. **Start Inspection**: Auto-creates new inspection or resumes in-progress
3. **Review Checkpoints**: Go through each section's checkpoints
4. **Mark Status**:
   - ✅ **Pass**: Instant update, moves to next
   - 🔧 **Corrected**: Opens modal for notes & media
   - ⚠️ **Action Required**: Opens modal for repair estimate, notes & media
5. **Complete Inspection**: Equipment status auto-updates based on results

## Equipment Status Logic

On inspection completion:
- **OUT_OF_SERVICE**: Any critical checkpoint marked Action Required
- **MAINTENANCE**: Any non-critical checkpoint marked Action Required  
- **OPERATIONAL**: All checkpoints passed or corrected

## Performance Optimizations

- Server-side rendering for instant page loads
- Optimistic UI updates with `useTransition`
- Direct database queries without ORM layers
- Minimal client-side JavaScript
- No build-time CSS processing
- Direct file uploads without cloud services

## Development Tips

- Use large touch targets (48px minimum) for mobile
- Keep modals simple with single-purpose forms
- Prefer server actions over API routes
- Test on actual mobile devices in sunlight
- Ensure forms work with one finger/thumb

## Speech-to-Text (Google Cloud)

This project supports Google Cloud Speech-to-Text for cross-browser dictation.

Setup environment variables (one of the following):

1) Provide JSON credentials inline (recommended for server deployments):

```
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account", ...}
GOOGLE_CLOUD_PROJECT=your-project-id
```

2) Or use Application Default Credentials:

```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_CLOUD_PROJECT=your-project-id
```

Client usage: send recorded audio (webm/ogg/wav) to `POST /api/speech-to-text` with either multipart form:

```
form-data:
  audio: <File>
  mimeType: audio/webm (optional)
  languageCode: en-US (optional)
```

The response returns `{ transcript: string }`.

## License

MIT