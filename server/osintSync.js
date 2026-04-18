const { MongoClient } = require("mongodb");
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");
const { normalizeRecord, parseCsv } = require("./normalize");

async function streamToText(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function fetchFromMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return { records: [], message: "MongoDB URI not configured" };
  }

  const dbName = process.env.MONGODB_DB || "cyberjoar";
  const collectionName = process.env.MONGODB_COLLECTION || "osint";

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const collection = client.db(dbName).collection(collectionName);
    const docs = await collection.find({}).limit(200).toArray();
    const records = docs.map((doc) => normalizeRecord({ ...doc, source: "OSINT" }));
    return { records, message: `MongoDB sync pulled ${records.length} records` };
  } finally {
    await client.close();
  }
}

async function syncOsint() {
  const details = [];
  const records = [];

  try {
    const mongo = await fetchFromMongo();
    details.push(mongo.message);
    records.push(...mongo.records);
  } catch (error) {
    details.push(`MongoDB sync failed: ${error.message}`);
  }

  try {
    const s3 = await fetchFromS3();
    details.push(s3.message);
    records.push(...s3.records);
  } catch (error) {
    details.push(`S3 sync failed: ${error.message}`);
  }

  return {
    records,
    details,
  };
}

module.exports = {
  syncOsint,
};

async function fetchFromS3() {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    return { records: [], message: "S3 bucket not configured (skipped)" };
  }

  const region = process.env.AWS_REGION || "ap-south-1";
  const prefix = process.env.AWS_S3_PREFIX || "";
  const s3 = new S3Client({ region });

  const listed = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 50,
    }),
  );

  const files = (listed.Contents || [])
    .map((item) => item.Key)
    .filter(Boolean)
    .filter((key) => /\.(json|csv)$/i.test(key));

  const all = [];
  for (const key of files) {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    const text = await streamToText(response.Body);
    const rows = key.toLowerCase().endsWith(".json") ? JSON.parse(text) : parseCsv(text);
    const list = Array.isArray(rows) ? rows : rows.records || [];

    for (const row of list) {
      all.push(normalizeRecord({ ...row, source: "OSINT" }));
    }
  }

  return { records: all, message: `S3 sync pulled ${all.length} records from ${files.length} files` };
}
