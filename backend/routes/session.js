import express from 'express';
import { findAll, upsertOne } from '../middleware/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// POST /api/session/heartbeat  — called every 60s by frontend
router.post('/heartbeat', authMiddleware, async (req, res) => {
  const { activeSeconds = 60, isBreak = false } = req.body;
  const today = new Date().toISOString().split('T')[0];

  const existing = (await findAll('sessions', { userId: req.userId, date: today }))[0];

  if (!existing) {
    const newDoc = {
      userId: req.userId,
      date: today,
      totalOnlineMinutes: 1,
      activeMinutes: Math.round(activeSeconds / 60),
      breaks: isBreak ? 1 : 0,
      focusLevel: 10,
      updatedAt: new Date().toISOString(),
    };
    await upsertOne('sessions', { userId: req.userId, date: today }, newDoc);
  } else {
    const totalOnlineMinutes = (existing.totalOnlineMinutes || 0) + 1;
    const activeMinutes = (existing.activeMinutes || 0) + Math.round(activeSeconds / 60);
    const breaks = (existing.breaks || 0) + (isBreak ? 1 : 0);
    const focusLevel = totalOnlineMinutes > 0
      ? Math.max(1, Math.round((activeMinutes / totalOnlineMinutes) * 10))
      : 5;
    const updated = {
      ...existing,
      totalOnlineMinutes,
      activeMinutes,
      breaks,
      focusLevel,
      updatedAt: new Date().toISOString(),
    };
    await upsertOne('sessions', { userId: req.userId, date: today }, updated);
  }

  res.json({ success: true });
});

// GET /api/session/today — today's session stats directly from MongoDB Atlas
router.get('/today', authMiddleware, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const record = (await findAll('sessions', { userId: req.userId, date: today }))[0];
  res.json({
    session: record || {
      date: today,
      totalOnlineMinutes: 0,
      activeMinutes: 0,
      breaks: 0,
      focusLevel: 5,
    }
  });
});

// GET /api/session/recent — last 7 days aggregated from MongoDB Atlas
router.get('/recent', authMiddleware, async (req, res) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const records = await findAll('sessions', { userId: req.userId });
  const recent = records
    .filter(r => new Date(r.date) >= cutoff)
    .sort((a, b) => b.date.localeCompare(a.date));
  res.json({ sessions: recent });
});

export default router;
