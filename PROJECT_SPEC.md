# Equipment Inspection System - Project Specification

## Overview
A mobile-first web application for field technicians to perform and track equipment inspections on construction/industrial machinery (boom lifts, scissor lifts, telehandlers, etc.).

## Core Purpose
Enable technicians to:
1. View available equipment
2. Start inspections quickly
3. Go through inspection checklists
4. Mark items as Pass/Corrected/Action Required
5. Complete and save inspections

## User Flow
1. **Equipment List View**
   - Technician sees all equipment cards
   - Each card shows: Model, Type, Status, Location, Hours Used, Serial
   - Can search/filter equipment
   - Tap "Start Inspection" on any equipment

2. **Inspection Process**
   - System creates new inspection record
   - Shows multi-section inspection (Platform, Hydraulics, Base, Safety, Electrical)
   - Each section has 5 checkpoints
   - Technician marks each checkpoint: Pass / Corrected / Action Required
   - Progress bar shows completion status

3. **Completion**
   - Once all checkpoints are marked, can complete inspection
   - Returns to equipment list

## Data Model

### Equipment
- ID, Type, Model, Serial Number
- Location, Hours Used
- Status (Operational, Needs Inspection, Maintenance, Out of Service)
- Last Inspection Date

### Inspection
- Links to Equipment and Technician
- Start/End Time
- Status (In Progress, Completed, Cancelled)
- Contains multiple Sections

### Section
- Name (Platform & Basket, Boom & Hydraulics, etc.)
- Code (PB, BH, BC, SS, ES)
- Contains multiple Checkpoints

### Checkpoint
- Code (PB-01, PB-02, etc.)
- Name (Guard Rails Secure, Gate Functions, etc.)
- Critical (boolean)
- Status (Pass, Corrected, Action Required)
- Notes (optional)

### User/Technician
- Name, Email, Role

## Technical Requirements

### Essential Features
1. **Equipment Management**
   - List all equipment
   - Search functionality
   - Status indicators

2. **Inspection Workflow**
   - Create inspection
   - Navigate sections
   - Update checkpoint status
   - Track progress
   - Complete inspection

3. **Data Persistence**
   - PostgreSQL database
   - Proper relations between entities
   - Audit trail

### UI/UX Requirements
- **Mobile-first** but works on desktop
- **Fast response** - immediate feedback on actions
- **Offline detection** - show when not connected
- **Simple navigation** - clear back buttons, tabs for sections
- **Visual feedback** - color-coded statuses (green=pass, amber=warning, red=error)

### Performance Requirements
- Page loads under 2 seconds
- Instant button responses
- No loading spinners for basic operations
- Smooth transitions between sections

## Technology Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Vercel-ready

## Design System
```
Colors:
- Background: #F9FAFB (light gray)
- Primary Text: #111827 (near black)
- Secondary Text: #6B7280 (gray)

Status Colors:
- Success/Pass: #10B981 (green)
- In Progress: #3B82F6 (blue)  
- Warning/Corrected: #F59E0B (amber)
- Error/Action Required: #EF4444 (red)
- Idle/Disabled: #9CA3AF (gray)

Action Button: #2563EB (blue)
```

## Deployment Considerations
- Environment variables for database connection
- Automatic port detection for local development
- Database migrations via Prisma
- Seed data for initial testing

## What This Is NOT
- Not a full maintenance management system
- Not a reporting/analytics platform
- Not a multi-tenant solution
- Not an offline-first PWA (just detects connection)
- Not a document management system

## Success Criteria
1. Technician can start inspection in 2 clicks
2. Full inspection can be completed in under 5 minutes
3. Works smoothly on phone and tablet
4. Data persists to database immediately
5. Clear visual status at all times

## Current Issues to Solve
1. **Performance**: Current implementation is too slow
2. **Complexity**: Too many abstractions and components
3. **Dependencies**: Too many libraries causing overhead
4. **Architecture**: Needs simpler, more direct approach

## Ideal Solution
A stripped-down, fast, simple implementation that:
- Loads instantly
- Responds immediately to user actions
- Has minimal dependencies
- Uses simple, direct code
- Focuses on core functionality only