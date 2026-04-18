const { MongoClient } = require("mongodb");

let cachedClient;

async function getClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required for MongoDB persistence.");
  }

  const client = new MongoClient(uri);
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

async function listReports(source = "ALL") {
  const collection = await getAppCollection();
  const query = source === "ALL" ? {} : { source };
  const docs = await collection.find(query).toArray();
  return docs.map(fromDocument);
}

async function upsertReport(record) {
  const collection = await getAppCollection();
  const doc = toDocument(record);
  await collection.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
  return record;
}

async function upsertReports(records) {
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
  const insertedOrUpdated = (result.upsertedCount || 0) + (result.modifiedCount || 0) + (result.matchedCount || 0);
  return { insertedOrUpdated };
}

async function deleteReportById(id) {
  const collection = await getAppCollection();
  const result = await collection.deleteOne({ _id: id });
  return result.deletedCount > 0;
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
}

async function replaceAllReports(records) {
  const collection = await getAppCollection();
  await collection.deleteMany({});
  if (records.length) {
    const docs = records.map(toDocument);
    await collection.insertMany(docs);
  }
  return { total: records.length };
}

module.exports = {
  listReports,
  upsertReport,
  upsertReports,
  deleteReportById,
  deduplicateReports,
  replaceAllReports,
};
