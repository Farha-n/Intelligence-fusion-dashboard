# Intelligence Fusion Dashboard
### Problem Statement 1 — Multi-Source Intelligence Fusion Dashboard
**Submitted by:** Farhan Farooq

> **Live Demo:** https://intelligence-fusion-dashboard.onrender.com/
> **Repository:** https://github.com/Farha-n/Intelligence-fusion-dashboard

---

## Problem Statement Coverage — Requirement Checklist

Every functional requirement from the problem statement has been implemented and is live.

| # | Requirement | Status | Implementation Detail |
|---|-------------|--------|-----------------------|
| 1 | OSINT ingestion from MongoDB | ✅ Done | `/api/sync/osint` endpoint syncs from MongoDB Atlas collection |
| 2 | OSINT ingestion from AWS S3 | ✅ Done | S3 SDK integrated; JSON/CSV files synced via `osintSync.js` |
| 3 | HUMINT via manual field reports | ✅ Done | Form-based manual entry with full metadata (title, coords, priority, details) |
| 4 | HUMINT via file upload (CSV/JSON/Excel) | ✅ Done | Drag-and-drop ingestion; supports `.csv`, `.json`, `.xls`, `.xlsx` |
| 5 | IMINT via image upload | ✅ Done | Drag-and-drop image upload (`JPG/JPEG`); stored and linked to report |
| 6 | Fixed terrain map | ✅ Done | Leaflet + **Esri World Topographic** tiles (high-fidelity terrain) |
| 7 | Geospatial markers (dots) from lat/lon | ✅ Done | Dynamic Leaflet markers plotted per intelligence record |
| 8 | Hover-activated popup with image/metadata | ✅ Done | Cursor-hover triggers popup showing image, source, priority, timestamp |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Intelligence Sources                      │
│  MongoDB (OSINT)  │  AWS S3 (OSINT)  │  Manual / CSV / Image │
└────────┬─────────────────┬────────────────────┬──────────────┘
         │                 │                    │
         ▼                 ▼                    ▼
┌──────────────────────────────────────────────────────────────┐
│              Node.js / Express Backend                        │
│   osintSync.js → normalize.js → mongoStore.js                │
│   (All sources normalized to a common schema)                 │
└─────────────────────────┬────────────────────────────────────┘
                           │  REST API  (/api/reports, /api/upload, /api/sync)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    MongoDB Atlas                              │
│       (persistent store + in-memory fallback)                │
└─────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│             Frontend — Leaflet Map Interface                  │
│   Terrain map │ Clustered markers │ Hover popups             │
│   Search/filter │ Stats panel │ Latest reports feed          │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Technical Features

### 1. Multi-Source Data Ingestion
- **MongoDB Sync** — connects to Atlas and pulls OSINT records via a dedicated `/api/sync/osint` endpoint
- **AWS S3 Sync** — reads JSON/CSV files stored in S3 buckets using the AWS SDK
- **Manual Entry** — analysts can create reports directly from the dashboard UI
- **Drag-and-Drop Upload** — supports `.csv`, `.json`, `.xls`, `.xlsx` datasets and `.jpg`/`.jpeg` IMINT images
- **Normalization Layer** (`normalize.js`) — all sources are unified into a single common schema before storage

### 2. High-Fidelity Terrain Map
- Built with **Leaflet.js** and **Esri World Topographic Map** tiles
- Renders terrain features (elevation, rivers, roads) matching a real intelligence operational picture
- Markers dynamically plotted using `latitude` / `longitude` from each record

### 3. Hover-and-View Interactivity
- Cursor hover on any map marker triggers an inline popup
- Popup renders the associated IMINT image, metadata (source, priority, details), and timestamp
- No page navigation required — analysts maintain the operational map view throughout inspection

### 4. Analyst Productivity Features
- **Search** — filter by title, source, priority, or details in real-time
- **Source Filters** — toggle OSINT / HUMINT / IMINT layers independently
- **Marker Clustering** — nearby intelligence nodes cluster automatically to prevent map clutter
- **Deduplication** — `/api/admin/deduplicate` endpoint removes overlapping records
- **JSON Export** — full fused dataset downloadable via `/api/export`
- **Edit / Delete** — live record management from the latest reports feed panel

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | HTML, CSS, Vanilla JS | Lightweight; no framework overhead for a map-centric UI |
| Map | Leaflet.js + LeafletMarkerCluster | Open-source, terrain tile support, excellent popup API |
| Tiles | Esri World Topographic | High-fidelity terrain (matches intelligence operational standards) |
| Backend | Node.js + Express.js | Fast REST API, strong ecosystem for file handling |
| Database | MongoDB Atlas | Document store; fits flexible intelligence record schemas |
| File Handling | Multer | Reliable multipart form handling for images and datasets |
| Dataset Parsing | csv-parser, xlsx | Native parsing for all required formats |
| Cloud Source | AWS SDK (S3) | Direct S3 object retrieval for cloud-stored OSINT |
| Deployment | Render + Docker | Containerized, production-ready, live and accessible |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Backend and storage status check |
| `GET` | `/api/reports` | Fetch all fused intelligence records |
| `POST` | `/api/reports` | Create or update a report |
| `DELETE` | `/api/reports/:id` | Delete a specific report |
| `POST` | `/api/upload/image` | Upload IMINT image file |
| `POST` | `/api/upload/dataset` | Ingest CSV, JSON, XLS, or XLSX dataset |
| `POST` | `/api/sync/osint` | Trigger OSINT sync from MongoDB / S3 |
| `POST` | `/api/admin/deduplicate` | Remove duplicate reports |
| `POST` | `/api/seed` | Load sample demo records |
| `GET` | `/api/export` | Export full fused dataset as JSON |

---

## Data Schema

Each intelligence record — regardless of origin — is normalized to:

```json
{
  "title": "Field report near Chandigarh",
  "latitude": 30.7333,
  "longitude": 76.7794,
  "source": "HUMINT",
  "priority": "High",
  "details": "Human source reported unusual vehicle movement after midnight.",
  "imageUrl": "https://example.com/image.jpg",
  "timestamp": "2026-04-18T10:30:00.000Z"
}
```

**Source values:** `OSINT` | `HUMINT` | `IMINT`
**Priority values:** `High` | `Medium` | `Low`
**Required fields:** `latitude`, `longitude`

---

## Local Setup

```bash
# Clone
git clone https://github.com/Farha-n/Intelligence-fusion-dashboard.git
cd Intelligence-fusion-dashboard

# Install
npm install

# Configure environment
cp .env.example .env
# → Add your MONGODB_URI in .env

# Run
npm start
# → Open http://localhost:3000
```

### Environment Variables

```
PORT=3000
MONGODB_URI=your_mongodb_atlas_connection_string
MONGODB_DB=cyberjoar
MONGODB_COLLECTION=osint
MONGODB_APP_COLLECTION=fusion_records
AWS_REGION=ap-south-1
AWS_S3_BUCKET=
AWS_S3_PREFIX=
```

---

## Deployment (Render + Docker)

The application is fully containerized and deployed as a live web service:

1. Push repository to GitHub
2. Create **Web Service** on Render → connect repo → select Docker runtime
3. Add environment variables from `.env.example`
4. Deploy — verify at `/api/health`

Expected health response:
```json
{ "ok": true, "service": "intelligence-fusion-backend", "storageMode": "mongo" }
```

> **Note:** If MongoDB is unavailable, the service automatically falls back to an in-memory store — ensuring zero-downtime operation.

---

## Project Structure

```
.
├── public/
│   ├── index.html        # Main dashboard UI
│   ├── styles.css        # Styling and map layout
│   └── app.js            # Frontend logic, Leaflet map, API calls
├── server/
│   ├── index.js          # Express server, route definitions
│   ├── mongoStore.js     # MongoDB Atlas read/write operations
│   ├── normalize.js      # Common schema normalization for all sources
│   ├── osintSync.js      # MongoDB + S3 OSINT sync logic
│   └── sampleRecords.js  # Demo seed data
├── data/                 # Sample datasets for upload testing
├── Dockerfile            # Container definition
├── render.yaml           # Render deployment config
├── railway.json          # Railway deployment config
└── .env.example          # Environment variable template
```

---

## Author

**Farhan Farooq**
GitHub: [github.com/Farha-n](https://github.com/Farha-n)
Live Demo: [intelligence-fusion-dashboard.onrender.com](https://intelligence-fusion-dashboard.onrender.com/)
