import { MongoClient } from 'mongodb';

// In-memory cache for ultra-fast, zero-latency synchronous querying
const cache = new Map();
let mongoClient = null;
let mongoDb = null;
let isMongoConnected = false;

// Collection configuration with primary keys for atomic MongoDB operations
const COLLECTION_KEYS = {
  users: 'id',
  edu_data: 'userId',
  exams: 'userId',
  growth: (doc) => ({ userId: doc.userId, subject: doc.subject }),
  timetable: 'userId',
  subject_data: (doc) => ({ userId: doc.userId, subject: doc.subject }),
  quiz_attempts: 'id',
  sessions: (doc) => ({ userId: doc.userId, date: doc.date }),
  questions: (doc) => ({ userId: doc.userId, subject: doc.subject }),
  study_materials: (doc) => ({ userId: doc.userId, subject: doc.subject }),
  contact_messages: 'id',
};

function getFilter(collection, doc) {
  const keyConfig = COLLECTION_KEYS[collection];
  if (typeof keyConfig === 'function') {
    return keyConfig(doc);
  }
  if (typeof keyConfig === 'string' && doc[keyConfig]) {
    return { [keyConfig]: doc[keyConfig] };
  }
  if (doc.id) return { id: doc.id };
  if (doc.userId) return { userId: doc.userId };
  return { ...doc };
}

/**
 * Initialize MongoDB Atlas Connection
 * Connects directly to MongoDB Atlas and pre-warms collections.
 * Zero local JSON files used.
 */
export async function initDB() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error(
      '❌ Fatal: MONGODB_URI is required. Please set MONGODB_URI in your environment variables.'
    );
  }

  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    mongoClient = new MongoClient(uri, {
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    await mongoClient.connect();
    const dbName = process.env.MONGODB_DB_NAME || 'stai';
    mongoDb = mongoClient.db(dbName);
    isMongoConnected = true;
    console.log(`✅ Database: Connected to MongoDB Atlas (DB: ${dbName})`);

    // Pre-warm known collections into memory from MongoDB Atlas
    const collections = Object.keys(COLLECTION_KEYS);
    for (const name of collections) {
      try {
        const col = mongoDb.collection(name);
        const remoteDocs = await col.find({}).toArray();
        const cleaned = remoteDocs.map(({ _id, ...rest }) => rest);
        cache.set(name, cleaned);
      } catch (colErr) {
        console.warn(`[DB] Warning reading collection "${name}" from MongoDB:`, colErr.message);
        cache.set(name, []);
      }
    }

    return true;
  } catch (err) {
    console.error(`❌ MongoDB connection failed: ${err.message}`);
    isMongoConnected = false;
    throw err;
  }
}

export function getMongoDb() {
  return mongoDb;
}

export function getMongoClient() {
  return mongoClient;
}

export function isDatabaseConnected() {
  return isMongoConnected;
}

// ────────────────────────────────────────────────────────────
// Atomic MongoDB Operations
// ────────────────────────────────────────────────────────────

function asyncMongoInsert(collection, doc) {
  if (!isMongoConnected || !mongoDb) return;
  (async () => {
    try {
      const col = mongoDb.collection(collection);
      const { _id, ...cleanDoc } = doc;
      await col.insertOne(cleanDoc);
    } catch (err) {
      console.warn(`[MongoDB Insert Error] ${collection}:`, err.message);
    }
  })();
}

function asyncMongoUpsert(collection, doc) {
  if (!isMongoConnected || !mongoDb) return;
  (async () => {
    try {
      const col = mongoDb.collection(collection);
      const filter = getFilter(collection, doc);
      const { _id, ...cleanDoc } = doc;
      await col.replaceOne(filter, cleanDoc, { upsert: true });
    } catch (err) {
      console.warn(`[MongoDB Upsert Error] ${collection}:`, err.message);
    }
  })();
}

function asyncMongoUpdate(collection, filterDoc, updates) {
  if (!isMongoConnected || !mongoDb) return;
  (async () => {
    try {
      const col = mongoDb.collection(collection);
      const filter = getFilter(collection, filterDoc);
      const { _id, ...cleanUpdates } = updates;
      await col.updateOne(filter, { $set: cleanUpdates });
    } catch (err) {
      console.warn(`[MongoDB Update Error] ${collection}:`, err.message);
    }
  })();
}

function asyncMongoDelete(collection, filterDoc) {
  if (!isMongoConnected || !mongoDb) return;
  (async () => {
    try {
      const col = mongoDb.collection(collection);
      const filter = getFilter(collection, filterDoc);
      await col.deleteOne(filter);
    } catch (err) {
      console.warn(`[MongoDB Delete Error] ${collection}:`, err.message);
    }
  })();
}

function asyncMongoSyncAll(collection, data) {
  if (!isMongoConnected || !mongoDb) return;
  (async () => {
    try {
      const col = mongoDb.collection(collection);
      await col.deleteMany({});
      if (data && data.length > 0) {
        await col.insertMany(data.map(({ _id, ...rest }) => rest));
      }
    } catch (err) {
      console.warn(`[MongoDB SyncAll Error] ${collection}:`, err.message);
    }
  })();
}

// ────────────────────────────────────────────────────────────
// Public CRUD Methods (Exclusively backed by MongoDB Atlas)
// ────────────────────────────────────────────────────────────

export function readDB(name) {
  if (cache.has(name)) {
    return cache.get(name);
  }
  cache.set(name, []);
  return [];
}

export function writeDB(name, data) {
  cache.set(name, data);
  asyncMongoSyncAll(name, data);
}

export function findOne(collection, predicate) {
  return readDB(collection).find(predicate) || null;
}

export function findAll(collection, predicate) {
  const data = readDB(collection);
  return predicate ? data.filter(predicate) : data;
}

export function insertOne(collection, doc) {
  const data = readDB(collection);
  data.push(doc);
  cache.set(collection, data);
  asyncMongoInsert(collection, doc);
  return doc;
}

export function updateOne(collection, predicate, updates) {
  const data = readDB(collection);
  const idx = data.findIndex(predicate);
  if (idx === -1) return null;
  const original = data[idx];
  const updated = { ...original, ...updates };
  data[idx] = updated;
  cache.set(collection, data);
  asyncMongoUpdate(collection, original, updates);
  return updated;
}

export function upsertOne(collection, predicate, doc) {
  const data = readDB(collection);
  const idx = data.findIndex(predicate);
  if (idx === -1) {
    data.push(doc);
  } else {
    data[idx] = { ...data[idx], ...doc };
  }
  cache.set(collection, data);
  asyncMongoUpsert(collection, doc);
  return idx === -1 ? doc : data[data.findIndex(predicate)];
}

export function deleteOne(collection, predicate) {
  const data = readDB(collection);
  const idx = data.findIndex(predicate);
  if (idx === -1) return false;
  const target = data[idx];
  data.splice(idx, 1);
  cache.set(collection, data);
  asyncMongoDelete(collection, target);
  return true;
}
