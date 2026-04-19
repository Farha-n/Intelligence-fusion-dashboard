const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const xlsx = require("xlsx");
const dotenv = require("dotenv");
const { normalizeRecord, parseCsv } = require("./normalize");
const sampleRecords = require("./sampleRecords");
const { syncOsint } = require("./osintSync");
const {
  listReports,
  upsertReport,
  upsertReports,
  deleteReportById,
  deduplicateReports,
  getStorageMode,
} = require("./mongoStore");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadsDir));
app.use(express.static(path.join(__dirname, "..", "public")));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({ storage });

function recordMergeKey(record) {
  return `${String(record.title || "").toLowerCase()}-${Number(record.latitude).toFixed(6)}-${Number(record.longitude).toFixed(6)}`;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "intelligence-fusion-backend", storageMode: getStorageMode() });
});

app.get("/api/reports", async (req, res) => {
  try {
    const source = String(req.query.source || "ALL").toUpperCase();
    const records = await listReports(source);
    res.json({ records });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/reports", async (req, res) => {
  try {
    const record = normalizeRecord(req.body);
    await upsertReport(record);
    res.status(201).json({ record });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/reports/bulk", async (req, res) => {
  try {
    const input = Array.isArray(req.body) ? req.body : req.body?.records;
    if (!Array.isArray(input)) {
      return res.status(400).json({ error: "Request body must contain an array of records." });
    }

    const normalized = input.map((record) => normalizeRecord(record));
    await upsertReports(normalized);

    const reports = await listReports("ALL");
    return res.json({ added: normalized.length, total: reports.length, records: reports });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete("/api/reports/:id", async (req, res) => {
  try {
    const deleted = await deleteReportById(req.params.id);
    res.json({ deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/upload/image", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Image file is required." });
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  return res.status(201).json({ imageUrl });
});

app.post("/api/upload/dataset", upload.single("dataset"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Dataset file is required." });
  }

  try {
    const ext = path.extname(req.file.originalname || "").toLowerCase();
    const filePath = req.file.path;

    let rows = [];
    if (ext === ".json") {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      rows = Array.isArray(parsed) ? parsed : parsed.records || [];
    } else if (ext === ".csv") {
      const raw = fs.readFileSync(filePath, "utf-8");
      rows = parseCsv(raw);
    } else if (ext === ".xlsx" || ext === ".xls") {
      const workbook = xlsx.readFile(filePath);
      const first = workbook.SheetNames[0];
      rows = xlsx.utils.sheet_to_json(workbook.Sheets[first], { defval: "" });
    } else {
      throw new Error("Only CSV, JSON, XLS, or XLSX files are supported.");
    }

    const normalized = rows.map((row) => normalizeRecord(row));
    const existing = await listReports("ALL");
    const existingKeys = new Set(existing.map((record) => recordMergeKey(record)));

    const dedupedToInsert = normalized.filter((record) => {
      const key = recordMergeKey(record);
      if (existingKeys.has(key)) {
        return false;
      }
      existingKeys.add(key);
      return true;
    });

    if (dedupedToInsert.length) {
      await upsertReports(dedupedToInsert);
    }

    const skippedDuplicates = normalized.length - dedupedToInsert.length;

    const reports = await listReports("ALL");

    res.status(201).json({
      imported: dedupedToInsert.length,
      skippedDuplicates,
      total: reports.length,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

app.post("/api/sync/osint", async (_req, res) => {
  try {
    const synced = await syncOsint();
    await upsertReports(synced.records);
    const reports = await listReports("ALL");

    res.json({
      imported: synced.records.length,
      total: reports.length,
      details: synced.details,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/deduplicate", (_req, res) => {
  deduplicateReports()
    .then((result) => res.json(result))
    .catch((error) => res.status(500).json({ error: error.message }));
});

app.post("/api/seed", async (_req, res) => {
  try {
    const existing = await listReports("ALL");

    const existingKeys = new Set(existing.map((record) => recordMergeKey(record)));

    const seeded = sampleRecords
      .map((record) => normalizeRecord(record))
      .filter((record) => {
        const key = recordMergeKey(record);
        if (existingKeys.has(key)) {
          return false;
        }
        existingKeys.add(key);
        return true;
      });

    if (seeded.length) {
      await upsertReports(seeded);
    }

    const reports = await listReports("ALL");
    res.json({ added: seeded.length, total: reports.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/export", async (_req, res) => {
  try {
    const records = await listReports("ALL");
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=fusion-dashboard-data.json");
    res.send(JSON.stringify(records, null, 2));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

async function start() {
  const existing = await listReports("ALL");
  if (!existing.length) {
    const normalizedSamples = sampleRecords.map((record) => normalizeRecord(record));
    await upsertReports(normalizedSamples);
  }

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Intelligence Fusion Dashboard backend running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start Intelligence Fusion Dashboard backend:", error);
  process.exit(1);
});
