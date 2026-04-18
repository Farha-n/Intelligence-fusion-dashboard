const crypto = require("crypto");

const fallbackImage =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=70";

function normalizeSource(source) {
  const value = String(source || "OSINT").toUpperCase();
  if (["OSINT", "HUMINT", "IMINT"].includes(value)) {
    return value;
  }
  return "OSINT";
}

function normalizePriority(priority) {
  const value = String(priority || "Medium");
  if (["High", "Medium", "Low"].includes(value)) {
    return value;
  }
  return "Medium";
}

function normalizeRecord(input) {
  const latitude = Number(input.latitude ?? input.lat);
  const longitude = Number(input.longitude ?? input.lng ?? input.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Record must include valid latitude and longitude.");
  }

  return {
    id: input.id || crypto.randomUUID(),
    title: input.title || input.name || "Untitled intelligence report",
    latitude,
    longitude,
    source: normalizeSource(input.source),
    priority: normalizePriority(input.priority),
    details: input.details || input.description || "No details provided.",
    imageUrl: input.imageUrl || input.image || fallbackImage,
    timestamp: input.timestamp || new Date().toISOString(),
  };
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) {
    return [];
  }

  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || "";
      return row;
    }, {});
  });
}

module.exports = {
  normalizeRecord,
  parseCsv,
};
