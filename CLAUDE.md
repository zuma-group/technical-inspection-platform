# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Equipment inspection system for field technicians to inspect construction/industrial machinery (boom lifts, scissor lifts, telehandlers). Built with performance as the top priority - must be lightning-fast and mobile-optimized for one-finger operation in outdoor conditions.

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

## Architecture

### Core Design Principles
- **Performance First**: Pure CSS over Tailwind, minimal dependencies, server-side rendering
- **Mobile-First**: Large touch targets (48px min), one-finger operation, direct camera access
- **Simple & Direct**: No abstractions, minimal client JavaScript, server actions for instant UI

### Data Flow
1. **Equipment List** (`app/page.tsx`): Server-rendered list with direct Prisma queries
2. **Inspection Creation** (`app/inspect/[id]/page.tsx`): Auto-creates inspection if none in progress
3. **Checkpoint Updates** (`app/inspect/[id]/client.tsx`): 
   - Pass: Instant update via server action
   - Corrected/Action Required: Opens modal for notes, media, and hours estimate
4. **Media Upload** (`app/api/upload/route.ts`): Saves to `public/uploads/` and links to checkpoint

### Key Implementation Details

**Modal System for Corrected/Action Required**:
- Captures photos/videos directly from device camera using HTML5 `capture` attribute
- Stores explanations, repair time estimates, and media
- Media previews shown inline after submission

**Database Relations**:
```
Equipment → Inspections → Sections → Checkpoints → Media
                ↓
              User (Technician)
```

**Equipment Status Logic** (on inspection completion):
- Critical checkpoint with ACTION_REQUIRED → OUT_OF_SERVICE
- Any checkpoint with ACTION_REQUIRED → MAINTENANCE
- All checkpoints passed/corrected → OPERATIONAL

### Performance Optimizations
- Server-side rendering for instant page loads
- Optimistic UI updates with `useTransition`
- No build-time CSS processing (no Tailwind)
- Direct database queries without ORMs layers
- Minimal client-side JavaScript

## Database Connection

PostgreSQL connection via `.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/team_inspection_tool?schema=public"
```

## File Structure

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