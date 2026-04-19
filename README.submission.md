# Intelligence Fusion Dashboard - Submission Summary

Problem Statement 1: Multi-Source Intelligence Fusion Dashboard

Live Demo: https://intelligence-fusion-dashboard.onrender.com/
Repository: https://github.com/Farha-n/Intelligence-fusion-dashboard

## What Evaluators Should See First

- Dashboard loads with records on first run (auto-seed when storage is empty)
- Operational terrain map with clustered intelligence points
- Source filters for OSINT, HUMINT, IMINT
- Marker interaction shows metadata and image
- Feed row click focuses map marker

## Practical Features Implemented

- Multi-source ingestion workflow
  - Manual field report entry
  - CSV/JSON/XLS/XLSX upload
  - OSINT sync endpoint
- Safe data merge behavior
  - Add Sample Data merges only new records
  - Upload appends unique records and preserves existing data
- Backend persistence
  - MongoDB primary mode
  - Automatic in-memory fallback if Mongo is unavailable

## API Endpoints (Key)

- GET /api/health
- GET /api/reports
- POST /api/reports
- POST /api/reports/bulk
- POST /api/upload/image
- POST /api/upload/dataset
- POST /api/sync/osint
- POST /api/seed
- GET /api/export

## System Logic (Displayed In UI)

1. Ingest OSINT, HUMINT, and IMINT records
2. Normalize source-specific fields
3. Store reports in MongoDB
4. Plot records on the map
5. Cluster nearby intelligence points
6. Reveal image and metadata on interaction

## Quick Run

```bash
npm install
npm start
```

Open: http://localhost:3000

## Scope Decision

Kept practical for evaluation:
- No login/auth
- No major refactor
- No unnecessary infrastructure expansion

Submitted by: Farhan Farooq
