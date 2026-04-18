const { MongoClient } = require("mongodb");

let cachedClient;
const memoryStore = [];
let activeMode = "mongo";

function isMongoConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

async function getClient() {
  if (!isMongoConfigured()) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (cachedClient) {
    return cachedClient;
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return cachedClient;
}

async function getDb() {
  const client = await getClient();
  const dbName = process.env.MONGODB_DB || "cyberjoar";
  return client.db(dbName);
}

async function getAppCollection() {
  const db = await getDb();
  const name = process.env.MONGODB_APP_COLLECTION || "fusion_records";
  return db.collection(name);
}

function toDocument(record) {
  const { id, ...rest } = record;
  return {
    _id: id,
    ...rest,
  };
}

function fromDocument(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return {
    id: _id,
    ...rest,
  };
}

function setMode(mode) {
  activeMode = mode;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function withFallback(mongoFn, memoryFn) {
  if (!isMongoConfigured()) {
    setMode("memory");
    return memoryFn();
  }

  try {
    const result = await mongoFn();
    setMode("mongo");
    return result;
  } catch (error) {
    setMode("memory");
    // eslint-disable-next-line no-console
    console.warn(`MongoDB unavailable. Falling back to temporary memory store: ${error.message}`);
    return memoryFn();
  }
}

function memoryFilter(source = "ALL") {
  const reports = source === "ALL"
    ? memoryStore
    : memoryStore.filter((record) => record.source === source);
  return clone(reports);
}

async function listReports(source = "ALL") {
  return withFallback(
    async () => {
      const collection = await getAppCollection();
      const query = source === "ALL" ? {} : { source };
      const docs = await collection.find(query).toArray();
      return docs.map(fromDocument);
    },
    () => memoryFilter(source),
  );
}

async function upsertReport(record) {
  return withFallback(
    async () => {
      const collection = await getAppCollection();
      const doc = toDocument(record);
      await collection.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
      return record;
    },
    () => {
      const index = memoryStore.findIndex((item) => item.id === record.id);
      if (index >= 0) {
        memoryStore[index] = clone(record);
      } else {
        memoryStore.push(clone(record));
      }
      return clone(record);
    },
  );
}

async function upsertReports(records) {
  return withFallback(
    async () => {
      if (!records.length) {
        return { insertedOrUpdated: 0 };
      }

      const collection = await getAppCollection();
      const operations = records.map((record) => {
        const doc = toDocument(record);
        return {
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: doc },
            upsert: true,
          },
        };
      });

      const result = await collection.bulkWrite(operations, { ordered: false });
      const insertedOrUpdated =
        (result.upsertedCount || 0) + (result.modifiedCount || 0) + (result.matchedCount || 0);
      return { insertedOrUpdated };
    },
    () => {
      records.forEach((record) => {
        const index = memoryStore.findIndex((item) => item.id === record.id);
        if (index >= 0) {
          memoryStore[index] = clone(record);
        } else {
          memoryStore.push(clone(record));
        }
      });
      return { insertedOrUpdated: records.length };
    },
  );
}

async function deleteReportById(id) {
  return withFallback(
    async () => {
      const collection = await getAppCollection();
      const result = await collection.deleteOne({ _id: id });
      return result.deletedCount > 0;
    },
    () => {
      const before = memoryStore.length;
      const filtered = memoryStore.filter((record) => record.id !== id);
      memoryStore.length = 0;
      memoryStore.push(...filtered);
      return filtered.length !== before;
    },
  );
}

function recordFingerprint(record) {
  return [
    String(record.title || "").trim().toLowerCase(),
    Number(record.latitude || 0).toFixed(6),
    Number(record.longitude || 0).toFixed(6),
    String(record.source || "").trim().toUpperCase(),
    String(record.priority || "").trim(),
    String(record.details || "").trim().toLowerCase(),
  ].join("|");
}

async function deduplicateReports() {
  return withFallback(
    async () => {
      const collection = await getAppCollection();
      const docs = await collection.find({}).toArray();
      const seen = new Map();
      const duplicateIds = [];

      for (const doc of docs) {
        const record = fromDocument(doc);
        const key = recordFingerprint(record);
        if (seen.has(key)) {
          duplicateIds.push(doc._id);
        } else {
          seen.set(key, doc._id);
        }
      }

      if (duplicateIds.length) {
        await collection.deleteMany({ _id: { $in: duplicateIds } });
      }

      return {
        before: docs.length,
        after: docs.length - duplicateIds.length,
        removed: duplicateIds.length,
      };
    },
    () => {
      const before = memoryStore.length;
      const seen = new Set();
      const deduped = [];

      for (const record of memoryStore) {
        const key = recordFingerprint(record);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(record);
      }

      memoryStore.length = 0;
      memoryStore.push(...clone(deduped));

      return {
        before,
        after: deduped.length,
        removed: before - deduped.length,
      };
    },
  );
}

async function replaceAllReports(records) {
  return withFallback(
    async () => {
      const collection = await getAppCollection();
      await collection.deleteMany({});
      if (records.length) {
        const docs = records.map(toDocument);
        await collection.insertMany(docs);
      }
      return { total: records.length };
    },
    () => {
      memoryStore.length = 0;
      memoryStore.push(...clone(records));
      return { total: records.length };
    },
  );
}

function getStorageMode() {
  return activeMode;
}

module.exports = {
  listReports,
  upsertReport,
  upsertReports,
  deleteReportById,
  deduplicateReports,
  replaceAllReports,
  getStorageMode,
};
