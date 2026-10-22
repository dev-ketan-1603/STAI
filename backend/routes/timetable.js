import express from 'express';
import { findAll, upsertOne } from '../middleware/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// GET /api/timetable — get saved timetable directly from MongoDB
router.get('/', authMiddleware, async (req, res) => {
  const record = (await findAll('timetable', { userId: req.userId }))[0] || null;
  res.json({ timetable: record || null });
});

// POST /api/timetable — save timetable
router.post('/', authMiddleware, async (req, res) => {
  const { schedule, hoursPerDay } = req.body;
  if (!Array.isArray(schedule)) return res.status(400).json({ error: 'schedule must be an array.' });

  const doc = {
    userId: req.userId,
    schedule,
    hoursPerDay: hoursPerDay || 3,
    updatedAt: new Date().toISOString(),
  };
  await upsertOne('timetable', { userId: req.userId }, doc);
  res.json({ success: true, timetable: doc });
});

export default router;
