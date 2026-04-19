# Intelligence Fusion Dashboard

Problem Statement 1: Multi-Source Intelligence Fusion Dashboard

Submitted by: Farhan Farooq

Live Demo: https://intelligence-fusion-dashboard.onrender.com/
Repository: https://github.com/Farha-n/Intelligence-fusion-dashboard

---

## What This Dashboard Delivers

This dashboard fuses OSINT, HUMINT, and IMINT reports into a single operational map with live filtering, clustering, upload/import workflows, and report-level interaction.

Key outcomes:
- First-run demo is never blank (auto-seed when storage is empty)
- Sample data action is merge-safe (does not wipe user data)
- File upload appends unique records (does not replace existing intelligence)
- Map, feed, and stats remain synchronized through backend APIs

---

## Final Workflow (System Logic)

1. Ingest OSINT, HUMINT, and IMINT records
2. Normalize source-specific fields
3. Store reports in MongoDB
4. Plot records on the map
5. Cluster nearby intelligence points
6. Reveal image and metadata on interaction

---

## Feature Summary

### Ingestion and Storage
- MongoDB-backed report storage with in-memory fallback mode when Mongo is unavailable
- OSINT sync endpoint for external source pull
- Manual HUMINT/IMINT form entry
- Image upload endpoint for report media

### Dataset Handling
- Add Sample Data button merges sample records into existing data
- CSV/JSON/XLS/XLSX dataset upload on backend
- Frontend upload flow appends unique records without deleting existing records
- Duplicate-safe merge by title + coordinates keying

### Map and UX
- Leaflet terrain map with marker clustering
- Hover popup with image, source, priority, and timestamp
- Source filters (ALL, OSINT, HUMINT, IMINT)
- Search by title/source/priority/details
- Feed row click scrolls and flies to marker
- Empty state message when filters return no records

---

## API Endpoints

- GET /api/health
  - Backend health and storage mode
- GET /api/reports
  - Fetch all reports (or by source query)
- POST /api/reports
  - Create or update a single report
- POST /api/reports/bulk
  - Bulk add/merge normalized reports
- DELETE /api/reports/:id
  - Delete report by id
- POST /api/upload/image
  - Upload IMINT image
- POST /api/upload/dataset
  - Upload dataset file and append unique records
- POST /api/sync/osint
  - Sync OSINT from configured sources
- POST /api/admin/deduplicate
  - Remove duplicates
- POST /api/seed
  - Merge sample records into existing records
- GET /api/export
  - Export full dataset as JSON

---

## Data Schema

Each record is normalized to a common structure:

```json
{
  "id": "uuid",
  "title": "Border activity report",
  "latitude": 28.6139,
  "longitude": 77.209,
  "source": "OSINT",
  "priority": "High",
  "details": "Field update",
  "imageUrl": "https://...",
  "timestamp": "2026-04-19T10:30:00.000Z"
}
```

Allowed source values:
- OSINT
- HUMINT
- IMINT

Allowed priority values:
- High
- Medium
- Low

---

## Local Setup

```bash
git clone https://github.com/Farha-n/Intelligence-fusion-dashboard.git
cd Intelligence-fusion-dashboard
npm install
npm start
```

Open: http://localhost:3000

### Environment Variables

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=cyberjoar
MONGODB_COLLECTION=osint
MONGODB_APP_COLLECTION=fusion_records
AWS_REGION=ap-south-1
AWS_S3_BUCKET=
AWS_S3_PREFIX=
```

Note:
- If Mongo is not configured/available, the app runs using fallback memory mode.

---

## Deployment

Render deployment is supported via Dockerfile and render.yaml.

Quick steps:
1. Push repository to GitHub
2. Create Render Web Service
3. Add environment variables
4. Deploy and verify /api/health

---

## Project Structure

```text
model-1-intelligence-fusion/
  public/
    app.js
    index.html
    styles.css
  server/
    index.js
    mongoStore.js
    normalize.js
    osintSync.js
    sampleRecords.js
  data/
  uploads/
  Dockerfile
  render.yaml
  package.json
```

---

## Scope Notes

This version intentionally focuses on practical demo-readiness:
- No login/auth
- No major redesign
- No heavy refactor

---

## Author

Farhan Farooq
GitHub: https://github.com/Farha-n
