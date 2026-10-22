import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

// In-memory cache for ultra-fast, zero-latency synchronous querying
const cache = new Map();
let mongoClient = null;
let mongoDb = null;
let isMongoConnected = false;

// Ensure local data directory exists for fallback
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn(`[DB] Could not create local data directory: ${err.message}`);
  }
}

function getFilePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function loadLocalFile(name) {
  const filePath = getFilePath(name);
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalFile(name, data) {
  try {
    fs.writeFileSync(getFilePath(name), JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[DB] Local file write skipped for ${name}: ${err.message}`);
    }
  }
}

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
 * Initialize Database Connection
 * Connects to MongoDB Atlas, builds indexes, and syncs data.
 */
export async function initDB() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.log(`📁 Database: Local JSON file storage (Data dir: ${DATA_DIR})`);
    console.log(`💡 Tip: Set MONGODB_URI in backend/.env to use MongoDB Atlas.`);
    return false;
  }

  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    mongoClient = new MongoClient(uri, {
      maxPoolSize: 15,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
    await mongoClient.connect();
    const dbName = process.env.MONGODB_DB_NAME || 'stai';
    mongoDb = mongoClient.db(dbName);
    isMongoConnected = true;
    console.log(`✅ Database: Connected to MongoDB Atlas (DB: ${dbName})`);

    // Known collections
    const collections = Object.keys(COLLECTION_KEYS);

    for (const name of collections) {
      try {
        const col = mongoDb.collection(name);
        const remoteDocs = await col.find({}).toArray();
        const cleaned = remoteDocs.map(({ _id, ...rest }) => rest);

        if (cleaned.length > 0) {
          cache.set(name, cleaned);
        } else {
          // If remote collection is empty, check if local file has data to auto-migrate
          const localData = loadLocalFile(name);
          if (localData.length > 0) {
            console.log(`📦 Auto-migrating ${localData.length} records for "${name}" into MongoDB...`);
            await col.insertMany(localData.map(d => ({ ...d })));
            cache.set(name, localData);
          } else {
            cache.set(name, []);
          }
        }
      } catch (colErr) {
        console.warn(`[DB] Error loading collection ${name} from MongoDB:`, colErr.message);
      }
    }

    return true;
  } catch (err) {
    console.error(`❌ MongoDB connection failed: ${err.message}`);
    console.log('⚠️  Falling back to local JSON file storage.');
    isMongoConnected = false;
    return false;
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
// Atomic MongoDB Sync Helpers
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
// Public CRUD Methods (100% backward compatible with all routes)
// ────────────────────────────────────────────────────────────

export function readDB(name) {
  if (cache.has(name)) {
    return cache.get(name);
  }
  const data = loadLocalFile(name);
  cache.set(name, data);
  return data;
}

export function writeDB(name, data) {
  cache.set(name, data);
  saveLocalFile(name, data);
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
  saveLocalFile(collection, data);
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
  saveLocalFile(collection, data);
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
  saveLocalFile(collection, data);
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
  saveLocalFile(collection, data);
  asyncMongoDelete(collection, target);
  return true;
}
