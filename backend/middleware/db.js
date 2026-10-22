import { MongoClient } from 'mongodb';

let mongoClient = null;
let mongoDb = null;
let isMongoConnected = false;

// Collection primary key configuration for atomic operations
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
 */
export async function initDB() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('❌ Fatal: MONGODB_URI is required in backend/.env.');
  }

  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    mongoClient = new MongoClient(uri, {
      maxPoolSize: 25,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    await mongoClient.connect();
    const dbName = process.env.MONGODB_DB_NAME || 'stai';
    mongoDb = mongoClient.db(dbName);
    isMongoConnected = true;
    console.log(`✅ Database: Connected to MongoDB Atlas (DB: ${dbName})`);
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
// Real-Time MongoDB Atlas Direct Queries (Zero Stale Cache)
// ────────────────────────────────────────────────────────────

export async function readDB(collection) {
  if (!mongoDb) return [];
  const col = mongoDb.collection(collection);
  const docs = await col.find({}).toArray();
  return docs.map(({ _id, ...rest }) => rest);
}

export async function writeDB(collection, data) {
  if (!mongoDb) return;
  const col = mongoDb.collection(collection);
  await col.deleteMany({});
  if (Array.isArray(data) && data.length > 0) {
    await col.insertMany(data.map(({ _id, ...rest }) => rest));
  }
}

export async function findOne(collection, filterOrPredicate) {
  if (!mongoDb) return null;
  const col = mongoDb.collection(collection);

  // If query is an object (e.g. { email: '...' }), query Atlas directly via BSON index
  if (typeof filterOrPredicate === 'object' && filterOrPredicate !== null) {
    const doc = await col.findOne(filterOrPredicate);
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return rest;
  }

  // If predicate function is passed, fetch real-time documents from Atlas
  const docs = await col.find({}).toArray();
  const match = docs.find(filterOrPredicate);
  if (!match) return null;
  const { _id, ...rest } = match;
  return rest;
}

export async function findAll(collection, filterOrPredicate) {
  if (!mongoDb) return [];
  const col = mongoDb.collection(collection);

  if (typeof filterOrPredicate === 'object' && filterOrPredicate !== null) {
    const docs = await col.find(filterOrPredicate).toArray();
    return docs.map(({ _id, ...rest }) => rest);
  }

  const docs = await col.find({}).toArray();
  const cleaned = docs.map(({ _id, ...rest }) => rest);
  return filterOrPredicate ? cleaned.filter(filterOrPredicate) : cleaned;
}

export async function insertOne(collection, doc) {
  if (!mongoDb) return doc;
  const col = mongoDb.collection(collection);
  const { _id, ...cleanDoc } = doc;
  await col.insertOne(cleanDoc);
  return cleanDoc;
}

export async function updateOne(collection, filterOrPredicate, updates) {
  if (!mongoDb) return null;
  const col = mongoDb.collection(collection);

  let target;
  if (typeof filterOrPredicate === 'object' && filterOrPredicate !== null) {
    target = filterOrPredicate;
  } else {
    target = await findOne(collection, filterOrPredicate);
    if (!target) return null;
  }

  const query = target.id ? { id: target.id } : (target.userId ? { userId: target.userId } : { ...target });
  const { _id, ...cleanUpdates } = updates;
  await col.updateOne(query, { $set: cleanUpdates });
  return { ...target, ...cleanUpdates };
}

export async function upsertOne(collection, filterOrPredicate, doc) {
  if (!mongoDb) return doc;
  const col = mongoDb.collection(collection);
  const query = getFilter(collection, doc);
  const { _id, ...cleanDoc } = doc;
  await col.replaceOne(query, cleanDoc, { upsert: true });
  return cleanDoc;
}

export async function deleteOne(collection, filterOrPredicate) {
  if (!mongoDb) return false;
  const col = mongoDb.collection(collection);

  let query;
  if (typeof filterOrPredicate === 'object' && filterOrPredicate !== null) {
    query = filterOrPredicate;
  } else {
    const target = await findOne(collection, filterOrPredicate);
    if (!target) return false;
    query = target.id ? { id: target.id } : { ...target };
  }

  const res = await col.deleteOne(query);
  return res.deletedCount > 0;
}
