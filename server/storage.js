const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "records.json");

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, "[]", "utf-8");
  }
}

function readRecords() {
  ensureDataFile();
  const raw = fs.readFileSync(dataFile, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records) {
  ensureDataFile();
  fs.writeFileSync(dataFile, JSON.stringify(records, null, 2), "utf-8");
}

module.exports = {
  readRecords,
  writeRecords,
  ensureDataFile,
};
