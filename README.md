# Intelligence Fusion Dashboard

A full-stack geospatial intelligence dashboard built for **Problem Statement 1: Multi-Source Intelligence Fusion Dashboard**.

The system fuses **OSINT**, **HUMINT**, and **IMINT** records into one terrain-based operational map. It supports MongoDB-backed storage, manual field reports, dataset uploads, image evidence, search, source filtering, marker clustering, hover popups, and JSON export.

## Live Demo

**Project Link:** https://intelligence-fusion-dashboard.onrender.com/

**Health Check:** https://intelligence-fusion-dashboard.onrender.com/api/health

## Problem Statement Coverage

| Requirement | Implementation |
|---|---|
| OSINT ingestion | MongoDB OSINT sync endpoint, optional AWS S3 JSON/CSV sync |
| HUMINT ingestion | Manual reports, CSV upload, JSON upload, Excel upload |
| IMINT ingestion | Image upload with report metadata |
| Terrain map | Leaflet with Esri World Topographic Map tiles |
| Geospatial markers | Dynamic markers plotted using latitude and longitude |
| Hover inspection | Marker popups show image, details, source, priority, and timestamp |
| Unified dashboard | Search, filters, clustering, latest report feed, stats, export |

## Features

- Interactive terrain map using Leaflet and Esri World Topographic Map
- OSINT, HUMINT, and IMINT source categories
- MongoDB Atlas persistence
- Temporary in-memory fallback if MongoDB is unavailable
- Manual report creation with title, coordinates, source, priority, details, timestamp, and image
- CSV, JSON, XLS, and XLSX dataset ingestion
- Drag-and-drop upload for datasets and images
- Image upload for IMINT-style evidence
- Search by title, source, priority, and details
- Source filters for OSINT, HUMINT, and IMINT
- Marker clustering for nearby reports
- Hover popups with image and metadata
- Latest reports feed with edit and delete actions
- Duplicate removal
- JSON export of fused intelligence data
- Docker and Render deployment support

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Map | Leaflet, Leaflet MarkerCluster, Esri World Topographic Map |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| File Uploads | Multer |
| Dataset Parsing | CSV parser logic, XLS/XLSX using `xlsx` |
| Optional Cloud Source | AWS S3 SDK |
| Deployment | Render, Docker |

## Project Structure

```txt
.
├── index.html
├── styles.css
├── app.js
├── package.json
├── Dockerfile
├── render.yaml
├── railway.json
├── .env.example
└── server/
    ├── index.js
    ├── mongoStore.js
    ├── normalize.js
    ├── osintSync.js
    └── sampleRecords.js
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check backend and storage status |
| GET | `/api/reports` | Fetch all intelligence records |
| POST | `/api/reports` | Create or update a report |
| DELETE | `/api/reports/:id` | Delete a report |
| POST | `/api/upload/image` | Upload an image file |
| POST | `/api/upload/dataset` | Upload CSV, JSON, XLS, or XLSX dataset |
| POST | `/api/sync/osint` | Sync OSINT data from MongoDB/S3 sources |
| POST | `/api/admin/deduplicate` | Remove duplicate reports |
| POST | `/api/seed` | Load sample reports |
| GET | `/api/export` | Export fused data as JSON |

## Data Format

Uploaded CSV, JSON, or Excel files should contain these fields:

```txt
title, latitude, longitude, source, priority, details, imageUrl, timestamp
```

Required fields:

- `latitude`
- `longitude`

Recommended values:

- `source`: `OSINT`, `HUMINT`, or `IMINT`
- `priority`: `High`, `Medium`, or `Low`

Example JSON record:

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

## Local Setup

1. Clone the repository:

```bash
git clone https://github.com/Farha-n/Intelligence-fusion-dashboard.git
cd Intelligence-fusion-dashboard
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file:

```bash
cp .env.example .env
```

For Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

4. Add your MongoDB connection string:

```env
PORT=3000
MONGODB_URI=your_mongodb_atlas_connection_string
MONGODB_DB=cyberjoar
MONGODB_COLLECTION=osint
MONGODB_APP_COLLECTION=fusion_records
AWS_REGION=ap-south-1
AWS_S3_BUCKET=
AWS_S3_PREFIX=
```

5. Start the server:

```bash
npm start
```

6. Open:

```txt
http://localhost:3000
```

## Deployment

This is a full-stack Node.js project, so it should be deployed as a web service, not as a static site.

### Render Deployment

1. Push the repository to GitHub.
2. Create a new **Web Service** on Render.
3. Connect this repository.
4. Use Docker deployment.
5. Add the environment variables from `.env.example`.
6. Deploy the service.
7. Check `/api/health`.

Expected response:

```json
{
  "ok": true,
  "service": "intelligence-fusion-backend",
  "storageMode": "mongo"
}
```

## System Logic

1. Intelligence data is collected from manual form entries, uploaded files, MongoDB OSINT sources, or optional S3 files.
2. Each record is normalized into a common schema containing title, coordinates, source, priority, details, timestamp, and image URL.
3. Valid records are stored in MongoDB Atlas, with an in-memory fallback for temporary availability.
4. The frontend fetches fused records through REST APIs.
5. Records are plotted as markers on a terrain map using latitude and longitude.
6. Analysts can search, filter, inspect hover popups, edit reports, remove duplicates, and export the fused dataset.

## Assignment Logic Summary

The Intelligence Fusion Dashboard creates a single common operating picture from fragmented OSINT, HUMINT, and IMINT data. It normalizes multiple input formats, stores records in MongoDB, and visualizes each intelligence point on a terrain-based map. Hover-based popups provide instant access to image evidence and metadata, helping analysts inspect reports without leaving the map view.

## Author

**Farhan Farooq**
