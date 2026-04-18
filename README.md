# Model 1: Intelligence Fusion Dashboard

Fullstack geospatial intelligence dashboard that fuses OSINT, HUMINT, and IMINT records into a single common operating picture.

## What Is Implemented

- Frontend map dashboard with interactive intelligence markers
- Search by title, source, priority, and details
- Marker clustering for nearby reports
- Backend REST API for report ingestion, retrieval, and export
- Manual report entry with image upload
- Timestamp field for report create/edit
- CSV/JSON/Excel (XLS/XLSX) ingestion
- Drag-and-drop ingestion for datasets and images
- OSINT sync endpoint integrating MongoDB and AWS S3 sources
- Hover-activated marker popups for image/metadata inspection
- Terrain map rendering using OpenTopoMap tiles in Leaflet
- Automatic fallback to temporary in-memory storage if MongoDB is unavailable

## Project Structure

- `index.html` - Dashboard UI
- `styles.css` - Dashboard styles
- `app.js` - Frontend logic (API-driven)
- `server/index.js` - Express backend
- `server/osintSync.js` - MongoDB and S3 retrieval logic
- `server/normalize.js` - Data normalization and CSV parsing
- `server/mongoStore.js` - MongoDB persistence utilities
- `.env.example` - Environment template for cloud connectors
- `sample-s3-osint.json` - Sample S3 object content for OSINT sync testing

## Functional Coverage vs Statement

- Fragmented Ingestion
	- MongoDB and S3 automated retrieval via `POST /api/sync/osint`
	- Manual CSV/JSON/Excel ingestion via upload endpoint and drag-and-drop
	- IMINT image ingestion via file upload endpoint
- Geospatial Disconnect
	- Unified terrain-based map with all records anchored by latitude/longitude
- Static Visualization
	- Interactive dots with hover popups containing image and metadata

## API Endpoints

- `GET /api/health`
- `GET /api/reports`
- `POST /api/reports`
- `DELETE /api/reports/:id`
- `POST /api/upload/image`
- `POST /api/upload/dataset`
- `POST /api/sync/osint`
- `POST /api/admin/deduplicate`
- `POST /api/seed`
- `GET /api/export`

## Run Locally

1. Install Node.js 18+.
2. Open this folder in terminal.
3. Install dependencies:
	 - `npm install`
4. Copy env template if cloud sync is required:
	 - `copy .env.example .env`
5. Start server:
	 - `npm start`
6. Open `http://localhost:3000`

## Environment Variables

- `PORT=3000`
- `MONGODB_URI=`
- `MONGODB_DB=cyberjoar`
- `MONGODB_COLLECTION=osint` (OSINT source collection for sync)
- `MONGODB_APP_COLLECTION=fusion_records` (primary app data store)
- `AWS_REGION=ap-south-1`
- `AWS_S3_BUCKET=`
- `AWS_S3_PREFIX=`

## Deployment Notes

This model is now backend + frontend, so deploy as a Node.js web service (for example Render, Railway, Fly.io, or Vercel with Node runtime). Static-only deployment is not sufficient for the completed feature set.

## Docker Deployment

Build and run locally with Docker:

1. Build image:
	- `docker build -t intelligence-fusion-dashboard .`
2. Run container:
	- `docker run --name fusion-app -p 3000:3000 --env-file .env intelligence-fusion-dashboard`
3. Open:
	- `http://localhost:3000`

## One-Click Render Deployment

This repository includes `render.yaml` for Render Blueprint deployment.

1. Push this folder to GitHub.
2. Open Render and choose New +, then Blueprint.
3. Select your repository and confirm `render.yaml` is detected.
4. Click Apply.
5. In service environment variables, set secret values:
	- `MONGODB_URI`
	- `AWS_S3_BUCKET`
6. Keep defaults for:
	- `PORT=3000`
	- `MONGODB_DB=cyberjoar`
	- `MONGODB_COLLECTION=osint`
	- `MONGODB_APP_COLLECTION=fusion_records`
	- `AWS_REGION=ap-south-1`
	- `AWS_S3_PREFIX=`
7. Deploy and open your Render URL.

## One-Click Railway Deployment

This repository includes `railway.json` and `Dockerfile` for Railway deployment.

1. Push this folder to GitHub.
2. Open Railway and click New Project, then Deploy from GitHub repo.
3. Select the repository/folder containing this model.
4. Railway detects `railway.json` and uses Docker build automatically.
5. In Variables, configure:
	- `PORT=3000`
	- `MONGODB_URI` (if Mongo sync is needed)
	- `MONGODB_DB=cyberjoar`
	- `MONGODB_COLLECTION=osint`
	- `MONGODB_APP_COLLECTION=fusion_records`
	- `AWS_REGION=ap-south-1`
	- `AWS_S3_BUCKET` (if S3 sync is needed)
	- `AWS_S3_PREFIX=`
6. Click Deploy and open your Railway domain.

## Post-Deploy Validation

1. Visit `/api/health` and confirm `{ "ok": true }` response.
2. Open dashboard root URL.
3. Click Load Sample and verify markers appear.
4. Upload one CSV/JSON/XLSX file and verify ingestion.
5. Optionally click Sync OSINT to test MongoDB/S3 connectors.
