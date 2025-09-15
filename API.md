# Technical Inspection Platform — API Reference

Base URL: http://localhost:3001

Notes:
- All endpoints are JSON unless otherwise noted.
- No authentication is enforced in development.
- Timestamps are ISO 8601.

## Equipment

### GET /api/equipment
Fetch equipment with optional filters. Each equipment item includes recent inspections enriched with `pdfUrl` and lightweight `media` links.

Query params:
- `taskId` — filter by external task/stock id
- `status` — OPERATIONAL | MAINTENANCE | OUT_OF_SERVICE
- `type` — BOOM_LIFT | SCISSOR_LIFT | TELEHANDLER | FORKLIFT | OTHER
- `location` — substring match (case-insensitive)

Example:
```bash
curl "http://localhost:3001/api/equipment?taskId=8010"
```

Response (abridged):
```json
{
  "equipment": [
    {
      "id": "...",
      "type": "BOOM_LIFT",
      "model": "Genie S65",
      "serial": "SN80102323535",
      "location": "Northwest",
      "hoursUsed": 4244,
      "taskId": "8010",
      "status": "OUT_OF_SERVICE",
      "inspections": [
        {
          "id": "...",
          "status": "COMPLETED",
          "startedAt": "...",
          "completedAt": "...",
          "technician": { "name": "Field Technician", "email": "tech@system.local" },
          "pdfUrl": "/api/inspections/<inspectionId>/pdf",
          "media": [ { "id": "<mediaId>", "type": "photo", "url": "/api/media/<mediaId>" } ]
        }
      ]
    }
  ]
}
```

### GET /api/equipment/[id]
Fetch a single equipment with full inspection hierarchy (sections/checkpoints/media).
```bash
curl http://localhost:3001/api/equipment/<equipmentId>
```

### POST /api/equipment
Create equipment. `type` is case-insensitive; defaults to `OTHER` if invalid. `status` is ignored; server defaults.
```bash
curl -X POST http://localhost:3001/api/equipment \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Genie S65",
    "type": "boom_lift",
    "serial": "SN80102323535",
    "location": "Northwest",
    "hoursUsed": 4244,
    "taskId": "8010"
  }'
```

### PUT /api/equipment/[id]
Partial update.
```bash
curl -X PUT http://localhost:3001/api/equipment/<id> \
  -H "Content-Type: application/json" \
  -d '{ "location": "Yard A", "taskId": "8011" }'
```

### DELETE /api/equipment/[id]
Deletes equipment if it has no inspections.

### POST /api/equipment/import
Import equipment from external sources.
```bash
curl -X POST http://localhost:3001/api/equipment/import \
  -H "Content-Type: application/json" \
  -d '{
    "source": "unified_listing",
    "sourceId": "abc-123",
    "type": "FORKLIFT",
    "model": "Toyota 8FGU25",
    "serial": "TY-2024-089",
    "location": "Warehouse 2",
    "hoursUsed": 3200,
    "taskId": "9001"
  }'
```

## Inspections

### GET /api/inspections/[id]/pdf
Download the PDF report for an inspection.
```bash
curl -L -o report.pdf http://localhost:3001/api/inspections/<inspectionId>/pdf
```

## Media

### GET /api/media/[id]
Stream a saved photo/video by id.
```bash
curl http://localhost:3001/api/media/<mediaId> --output media.bin
```

### POST /api/upload
Upload photos/videos for a checkpoint. Use `multipart/form-data`.
- fields:
  - `checkpointId` (string, required)
  - `files` (one or more File entries)
```bash
curl -X POST http://localhost:3001/api/upload \
  -F checkpointId=<checkpointId> \
  -F files=@/path/to/photo.jpg \
  -F files=@/path/to/video.mp4
```

Response (abridged):
```json
{ "success": true, "media": [ { "id": "...", "type": "photo", "filename": "photo.jpg" } ] }
```

## Enums & Defaults
- EquipmentType: BOOM_LIFT | SCISSOR_LIFT | TELEHANDLER | FORKLIFT | OTHER
- EquipmentStatus: OPERATIONAL | MAINTENANCE | OUT_OF_SERVICE
- InspectionStatus: IN_PROGRESS | COMPLETED | CANCELLED
- CheckpointStatus: PASS | CORRECTED | ACTION_REQUIRED | NOT_APPLICABLE

Defaults (server-side):
- `type` → OTHER if invalid/missing on create
- `hoursUsed` → 0 if missing

## Errors
- 400 — validation error (missing fields, invalid enum)
- 404 — not found
- 409 — conflict (e.g., duplicate serial)
- 500 — server error

Error shape:
```json
{ "error": "Message..." }
```

## Changelog
- 2025-09-15: `GET /api/equipment` now returns `inspections[].pdfUrl` and `inspections[].media[]` with HTTP URLs for direct retrieval.
