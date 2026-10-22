import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const MONGODB_URI = process.env.MONGODB_URI?.trim();
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'stai';

const COLLECTION_CONFIG = {
  users: {
    indexes: [
      { key: { email: 1 }, unique: true, sparse: true },
      { key: { id: 1 }, unique: true, sparse: true },
      { key: { googleId: 1 }, sparse: true },
    ],
    primaryKey: 'id',
    fallbackKey: 'email',
  },
  edu_data: {
    indexes: [
      { key: { userId: 1 }, unique: true },
    ],
    primaryKey: 'userId',
  },
  exams: {
    indexes: [
      { key: { userId: 1 }, unique: true },
    ],
    primaryKey: 'userId',
  },
  growth: {
    indexes: [
      { key: { userId: 1, subject: 1 }, unique: true },
    ],
    primaryKey: (doc) => ({ userId: doc.userId, subject: doc.subject }),
  },
  timetable: {
    indexes: [
      { key: { userId: 1 }, unique: true },
    ],
    primaryKey: 'userId',
  },
  subject_data: {
    indexes: [
      { key: { userId: 1, subject: 1 }, unique: true },
    ],
    primaryKey: (doc) => ({ userId: doc.userId, subject: doc.subject }),
  },
  quiz_attempts: {
    indexes: [
      { key: { userId: 1, subject: 1 } },
      { key: { id: 1 }, unique: true, sparse: true },
      { key: { createdAt: -1 } },
    ],
    primaryKey: 'id',
  },
  sessions: {
    indexes: [
      { key: { userId: 1, date: 1 }, unique: true },
    ],
    primaryKey: (doc) => ({ userId: doc.userId, date: doc.date }),
  },
  questions: {
    indexes: [
      { key: { userId: 1, subject: 1 } },
    ],
    primaryKey: (doc) => ({ userId: doc.userId, subject: doc.subject }),
  },
  study_materials: {
    indexes: [
      { key: { userId: 1, subject: 1 } },
    ],
    primaryKey: (doc) => ({ userId: doc.userId, subject: doc.subject }),
  },
  contact_messages: {
    indexes: [
      { key: { id: 1 }, unique: true, sparse: true },
      { key: { receivedAt: -1 } },
    ],
    primaryKey: 'id',
  },
};

async function migrate() {
  console.log('\n======================================================');
  console.log('🚀 STAI Data Migration to MongoDB Atlas');
  console.log('======================================================\n');

  if (!MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI is not set in backend/.env!');
    console.error('Please configure your MongoDB Atlas connection string in backend/.env:');
    console.error('Example: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority\n');
    process.exit(1);
  }

  console.log(`Connecting to: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  console.log(`Target Database: ${MONGODB_DB_NAME}`);

  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!\n');

    const db = client.db(MONGODB_DB_NAME);
    const summary = [];

    for (const [collectionName, config] of Object.entries(COLLECTION_CONFIG)) {
      const col = db.collection(collectionName);

      // 1. Ensure indexes
      if (config.indexes?.length) {
        for (const idx of config.indexes) {
          try {
            await col.createIndex(idx.key, {
              unique: Boolean(idx.unique),
              sparse: Boolean(idx.sparse),
              background: true,
            });
          } catch (idxErr) {
            console.warn(`[Index Warning] ${collectionName}:`, idxErr.message);
          }
        }
      }

      // 2. Read local JSON data
      const jsonFile = path.join(DATA_DIR, `${collectionName}.json`);
      let records = [];
      if (fs.existsSync(jsonFile)) {
        try {
          const raw = fs.readFileSync(jsonFile, 'utf8');
          const parsed = JSON.parse(raw);
          records = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.warn(`Could not read ${jsonFile}:`, e.message);
        }
      }

      // 3. Upsert records into MongoDB
      let upsertedCount = 0;
      for (const record of records) {
        let filter;
        if (typeof config.primaryKey === 'function') {
          filter = config.primaryKey(record);
        } else if (typeof config.primaryKey === 'string' && record[config.primaryKey]) {
          filter = { [config.primaryKey]: record[config.primaryKey] };
        } else if (config.fallbackKey && record[config.fallbackKey]) {
          filter = { [config.fallbackKey]: record[config.fallbackKey] };
        } else {
          filter = { ...record };
        }

        // Clean out any raw MongoDB internal _id that might be in json
        const { _id, ...cleanDoc } = record;

        await col.replaceOne(filter, cleanDoc, { upsert: true });
        upsertedCount++;
      }

      const totalRemote = await col.countDocuments();
      summary.push({
        Collection: collectionName,
        'Local JSON Records': records.length,
        'Migrated / Synced': upsertedCount,
        'Total in MongoDB': totalRemote,
      });
    }

    console.table(summary);
    console.log('\n🎉 MongoDB Migration Completed Successfully!');
    console.log(`All existing application data is now securely stored in MongoDB Atlas ("${MONGODB_DB_NAME}").\n`);

    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration Failed:', err.message);
    await client.close().catch(() => {});
    process.exit(1);
  }
}

migrate();
