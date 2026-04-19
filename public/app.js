const fallbackImage =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=70";

let records = [];
let activeFilter = "ALL";
let searchQuery = "";
let markers = new Map();
let editingRecordId = null;
let editingImageUrl = "";
let editingTimestamp = "";

const map = L.map("map", { zoomControl: false }).setView([29.8, 76.4], 6);
L.control.zoom({ position: "bottomleft" }).addTo(map);

L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution: "Tiles &copy; Esri | Data &copy; OpenStreetMap contributors",
  },
).addTo(map);

const markerCluster = L.markerClusterGroup({
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  maxClusterRadius: 42,
});
map.addLayer(markerCluster);

const sourceClass = (source) => String(source || "OSINT").toLowerCase();

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body.error) {
        message = body.error;
      }
    } catch {
      // No-op on non-JSON errors.
    }
    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response;
}

function normalizeRecord(row) {
  const latitude = Number(row.latitude ?? row.lat);
  const longitude = Number(row.longitude ?? row.lng ?? row.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Each record must include valid latitude and longitude values.");
  }

  return {
    id: row.id || crypto.randomUUID(),
    title: row.title || row.name || "Untitled intelligence report",
    latitude,
    longitude,
    source: String(row.source || "OSINT").toUpperCase(),
    priority: row.priority || "Medium",
    details: row.details || row.description || "No details provided.",
    imageUrl: row.imageUrl || row.image || fallbackImage,
    timestamp: row.timestamp || new Date().toISOString(),
  };
}

function recordMergeKey(record) {
  return `${String(record.title || "").toLowerCase()}-${Number(record.latitude).toFixed(6)}-${Number(record.longitude).toFixed(6)}`;
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

function markerIcon(record) {
  return L.divIcon({
    className: "",
    html: `<span class="marker-pin ${sourceClass(record.source)}">${record.source.slice(0, 1)}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -12],
  });
}

function popupHtml(record, stackCount = 1) {
  const stackBadge =
    stackCount > 1 ? `<span class="badge stack">${stackCount} reports here</span>` : "";
  const timeLabel = formatTimestamp(record.timestamp);
  return `
    <article class="popup-card">
      <img src="${record.imageUrl || fallbackImage}" alt="${record.title}" />
      <h3>${record.title}</h3>
      <p>${record.details}</p>
      <p><strong>Time:</strong> ${timeLabel}</p>
      <div class="badge-row">
        <span class="badge">${record.source}</span>
        <span class="badge ${record.priority.toLowerCase()}">${record.priority}</span>
        ${stackBadge}
      </div>
    </article>
  `;
}

function visibleRecords() {
  const bySource = activeFilter === "ALL"
    ? records
    : records.filter((record) => record.source === activeFilter);

  const query = searchQuery.trim().toLowerCase();
  if (!query) {
    return bySource;
  }

  return bySource.filter((record) => {
    const haystack = [record.title, record.source, record.priority, record.details]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

function formatTimestamp(timestamp) {
  const value = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(value.getTime())) {
    return "N/A";
  }
  return value.toLocaleString();
}

function toDateTimeLocalValue(timestamp) {
  const value = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(value.getTime())) {
    return "";
  }

  const pad = (num) => String(num).padStart(2, "0");
  const yyyy = value.getFullYear();
  const mm = pad(value.getMonth() + 1);
  const dd = pad(value.getDate());
  const hh = pad(value.getHours());
  const min = pad(value.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function computeMarkerLayout(shownRecords) {
  const grouped = new Map();

  shownRecords.forEach((record) => {
    const key = `${Number(record.latitude).toFixed(6)},${Number(record.longitude).toFixed(6)}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(record);
  });

  const positions = new Map();
  const stackCounts = new Map();
  grouped.forEach((group) => {
    if (group.length === 1) {
      const only = group[0];
      positions.set(only.id, [only.latitude, only.longitude]);
      stackCounts.set(only.id, 1);
      return;
    }

    group.forEach((record, index) => {
      const angle = (2 * Math.PI * index) / group.length;
      const radius = 0.01 + index * 0.0015;
      const lat = Number(record.latitude) + Math.sin(angle) * radius;
      const lng = Number(record.longitude) + Math.cos(angle) * radius;
      positions.set(record.id, [lat, lng]);
      stackCounts.set(record.id, group.length);
    });
  });

  return { positions, stackCounts };
}

function renderMap() {
  markers.forEach((marker) => marker.remove());
  markerCluster.clearLayers();
  markers = new Map();

  const shownRecords = visibleRecords();
  const markerLayout = computeMarkerLayout(shownRecords);
  const markerPositions = markerLayout.positions;
  const stackCounts = markerLayout.stackCounts;

  shownRecords.forEach((record) => {
    const markerLatLng = markerPositions.get(record.id) || [record.latitude, record.longitude];
    const stackCount = stackCounts.get(record.id) || 1;
    const marker = L.marker(markerLatLng, {
      icon: markerIcon(record),
    })
      .bindPopup(popupHtml(record, stackCount));

    markerCluster.addLayer(marker);

    marker.on("mouseover", () => marker.openPopup());
    markers.set(record.id, marker);
  });

  if (shownRecords.length) {
    const bounds = L.latLngBounds(shownRecords.map((record) => [record.latitude, record.longitude]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 8 });
  }
}

function renderStats() {
  document.querySelector("#totalRecords").textContent = records.length;
  document.querySelector("#activeAlerts").textContent = records.filter(
    (record) => record.priority === "High",
  ).length;
  document.querySelector("#imageRecords").textContent = records.filter(
    (record) => Boolean(record.imageUrl),
  ).length;
}

function renderFeed() {
  const feedList = document.querySelector("#feedList");
  feedList.innerHTML = "";

  const shownRecords = visibleRecords();
  if (!shownRecords.length) {
    const empty = document.createElement("p");
    empty.className = "feed-empty";
    empty.textContent = "No intelligence records match current filters.";
    feedList.appendChild(empty);
    return;
  }

  shownRecords
    .slice()
    .reverse()
    .forEach((record) => {
      const item = document.createElement("article");
      item.className = "feed-item";
      item.innerHTML = `
        <img src="${record.imageUrl || fallbackImage}" alt="${record.title}" />
        <div>
          <h3>${record.title}</h3>
          <p>${record.details}</p>
          <p>${formatTimestamp(record.timestamp)}</p>
          <div class="badge-row">
            <span class="badge">${record.source}</span>
            <span class="badge ${record.priority.toLowerCase()}">${record.priority}</span>
          </div>
          <div class="feed-actions">
            <button class="feed-edit" type="button" data-id="${record.id}">Edit</button>
            <button class="feed-delete" type="button" data-id="${record.id}">Delete</button>
          </div>
        </div>
      `;

      item.addEventListener("click", () => {
        const marker = markers.get(record.id);
        if (!marker) return;
        document.querySelector("#map").scrollIntoView({ behavior: "smooth", block: "start" });
        map.flyTo([record.latitude, record.longitude], 10, { duration: 0.7 });
        marker.openPopup();
      });

      const deleteButton = item.querySelector(".feed-delete");
      const editButton = item.querySelector(".feed-edit");

      editButton.addEventListener("click", (event) => {
        event.stopPropagation();
        setEditingRecord(record);
      });

      deleteButton.addEventListener("click", async (event) => {
        event.stopPropagation();

        if (!window.confirm("Delete this report?")) {
          return;
        }

        try {
          await apiRequest(`/api/reports/${record.id}`, { method: "DELETE" });
          await refreshRecords();
        } catch (error) {
          alert(error.message);
        }
      });

      feedList.appendChild(item);
    });
}

function setFormModeEditing(isEditing) {
  const submitButton = document.querySelector('#manualForm button[type="submit"]');
  const cancelButton = document.querySelector("#cancelEdit");

  if (isEditing) {
    submitButton.textContent = "Update Report";
    cancelButton.hidden = false;
  } else {
    submitButton.textContent = "Add to Map";
    cancelButton.hidden = true;
  }
}

function clearEditState() {
  editingRecordId = null;
  editingImageUrl = "";
  editingTimestamp = "";
  document.querySelector("#timestampInput").value = toDateTimeLocalValue(new Date().toISOString());
  setFormModeEditing(false);
}

function setEditingRecord(record) {
  editingRecordId = record.id;
  editingImageUrl = record.imageUrl || fallbackImage;
  editingTimestamp = record.timestamp || "";

  document.querySelector("#titleInput").value = record.title;
  document.querySelector("#latInput").value = record.latitude;
  document.querySelector("#lngInput").value = record.longitude;
  document.querySelector("#sourceInput").value = record.source;
  document.querySelector("#priorityInput").value = record.priority;
  document.querySelector("#detailsInput").value = record.details;
  document.querySelector("#timestampInput").value = toDateTimeLocalValue(record.timestamp);
  document.querySelector("#imageInput").value = "";

  setFormModeEditing(true);
  document.querySelector("#manualForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function render() {
  renderStats();
  renderMap();
  renderFeed();
}

async function refreshRecords() {
  const data = await apiRequest("/api/reports");
  records = (data.records || []).map(normalizeRecord);
  render();
}

async function readImageAndUpload(file) {
  if (!file) {
    return fallbackImage;
  }

  const form = new FormData();
  form.append("image", file);
  const uploaded = await apiRequest("/api/upload/image", {
    method: "POST",
    body: form,
  });

  return uploaded.imageUrl || fallbackImage;
}

async function uploadDataset(file) {
  const isJson = file.name.toLowerCase().endsWith(".json");
  const isCsv = file.name.toLowerCase().endsWith(".csv");
  if (!isJson && !isCsv) {
    throw new Error("Please upload a CSV or JSON file.");
  }

  const text = await file.text();
  const parsed = isJson ? JSON.parse(text) : parseCsv(text);
  const rows = Array.isArray(parsed) ? parsed : parsed.records;
  if (!Array.isArray(rows)) {
    throw new Error("Uploaded file must contain an array of records.");
  }

  const uploadedRecords = rows.map((row) => normalizeRecord(row));
  const existingKeys = new Set(records.map((record) => recordMergeKey(record)));

  const newRecords = uploadedRecords.filter((record) => {
    const key = recordMergeKey(record);
    if (existingKeys.has(key)) {
      return false;
    }
    existingKeys.add(key);
    return true;
  });

  if (newRecords.length) {
    await apiRequest("/api/reports/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: newRecords }),
    });
  }

  const skippedDuplicates = uploadedRecords.length - newRecords.length;

  await refreshRecords();
  if (newRecords.length === 0) {
    alert(`Uploaded records already exist. Skipped duplicates: ${skippedDuplicates}.`);
    return;
  }

  alert(`Added ${newRecords.length} uploaded records. Skipped duplicates: ${skippedDuplicates}.`);
}

async function updateBackendStatus() {
  const pill = document.querySelector("#backendStatus");
  try {
    await apiRequest("/api/health");
    pill.textContent = "Backend: connected";
    pill.classList.remove("offline");
  } catch {
    pill.textContent = "Backend: offline";
    pill.classList.add("offline");
  }
}

document.querySelector("#manualForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const imageFile = document.querySelector("#imageInput").files[0];
    const imageUrl = imageFile
      ? await readImageAndUpload(imageFile)
      : editingImageUrl || fallbackImage;
    const timestampInput = document.querySelector("#timestampInput").value;
    const timestamp = timestampInput
      ? new Date(timestampInput).toISOString()
      : editingTimestamp || new Date().toISOString();

    const payload = normalizeRecord({
      id: editingRecordId || undefined,
      title: document.querySelector("#titleInput").value,
      latitude: document.querySelector("#latInput").value,
      longitude: document.querySelector("#lngInput").value,
      source: document.querySelector("#sourceInput").value,
      priority: document.querySelector("#priorityInput").value,
      details: document.querySelector("#detailsInput").value,
      imageUrl,
      timestamp,
    });

    await apiRequest("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    event.target.reset();
    clearEditState();
    await refreshRecords();
  } catch (error) {
    alert(error.message);
  }
});

document.querySelector("#cancelEdit").addEventListener("click", () => {
  document.querySelector("#manualForm").reset();
  clearEditState();
});

document.querySelector("#dataUpload").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    await uploadDataset(file);
  } catch (error) {
    alert(error.message);
  } finally {
    event.target.value = "";
  }
});

document.querySelector("#loadSample").addEventListener("click", async () => {
  try {
    const result = await apiRequest("/api/seed", { method: "POST" });
    await refreshRecords();
    alert(
      result.added === 0
        ? "Sample records are already loaded."
        : `Added ${result.added} sample records.`,
    );
  } catch (error) {
    alert(error.message);
  }
});

document.querySelector("#syncOsint").addEventListener("click", async () => {
  try {
    const result = await apiRequest("/api/sync/osint", { method: "POST" });
    await refreshRecords();
    alert(`${result.details.join(" | ")} | Imported: ${result.imported}`);
  } catch (error) {
    alert(error.message);
  }
});

document.querySelector("#dedupeData").addEventListener("click", async () => {
  try {
    const result = await apiRequest("/api/admin/deduplicate", { method: "POST" });
    await refreshRecords();
    alert(`Dedup complete. Removed ${result.removed} duplicates. Total now: ${result.after}`);
  } catch (error) {
    alert(error.message);
  }
});

document.querySelector("#exportData").addEventListener("click", async () => {
  try {
    const response = await fetch("/api/export");
    if (!response.ok) {
      throw new Error(`Export failed (${response.status})`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "fusion-dashboard-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message);
  }
});

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    render();
  });
});

const dropzone = document.querySelector("#dropzone");

function activateDropzone(active) {
  dropzone.classList.toggle("active", active);
}

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  activateDropzone(true);
});

dropzone.addEventListener("dragleave", () => {
  activateDropzone(false);
});

dropzone.addEventListener("drop", async (event) => {
  event.preventDefault();
  activateDropzone(false);

  const file = event.dataTransfer.files[0];
  if (!file) return;

  try {
    await uploadDataset(file);
  } catch (error) {
    alert(error.message);
  } finally {
    document.querySelector("#dataUpload").value = "";
  }
});

dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    document.querySelector("#dataUpload").click();
  }
});

document.querySelector("#searchInput").addEventListener("input", (event) => {
  searchQuery = event.target.value || "";
  render();
});

async function init() {
  document.querySelector("#timestampInput").value = toDateTimeLocalValue(new Date().toISOString());
  await updateBackendStatus();
  await refreshRecords();
}

init();
