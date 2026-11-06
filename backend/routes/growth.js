import express from 'express';
import { findAll, upsertOne, deleteOne } from '../middleware/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Helper to compute stats from score array
function computeScoreStats(scores) {
  const valid = (scores || [])
    .filter(s => s && s.score !== '' && !isNaN(Number(s.score)))
    .map(s => ({
      label: String(s.label || 'Test').trim(),
      score: Math.max(0, Math.min(100, Math.round(Number(s.score)))),
      date: s.date || new Date().toISOString().split('T')[0],
    }));

  if (valid.length === 0) {
    return { validScores: [], averageScore: 0, highestScore: 0, lowestScore: 0, latestScore: 0, trend: 'stable' };
  }

  const nums = valid.map(s => s.score);
  const avg = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const latest = nums[nums.length - 1];

  let trend = 'stable';
  if (nums.length >= 2) {
    const diff = nums[nums.length - 1] - nums[0];
    if (diff >= 4) trend = 'improving';
    else if (diff <= -4) trend = 'declining';
  } else if (latest >= 80) {
    trend = 'improving';
  }

  return { validScores: valid, averageScore: avg, highestScore: max, lowestScore: min, latestScore: latest, trend };
}

// GET /api/growth — get all growth data for user
router.get('/', authMiddleware, async (req, res) => {
  const records = await findAll('growth', { userId: req.userId });
  res.json({ growth: records });
});

// GET /api/growth/:subject — get growth data for specific subject
router.get('/:subject', authMiddleware, async (req, res) => {
  const subject = decodeURIComponent(req.params.subject);
  const records = await findAll('growth', { userId: req.userId, subject });
  const record = records[0] || null;
  res.json({ growth: record || null });
});

// POST /api/growth — save growth/scores for a subject
router.post('/', authMiddleware, async (req, res) => {
  const { subject, scores, analysis } = req.body;
  if (!subject) return res.status(400).json({ error: 'subject is required.' });

  const { validScores, averageScore, highestScore, lowestScore, latestScore, trend } = computeScoreStats(scores);

  const doc = {
    userId: req.userId,
    subject: subject.trim(),
    scores: validScores,
    analysis: analysis || null,
    stats: {
      testsCount: validScores.length,
      averageScore,
      highestScore,
      lowestScore,
      latestScore,
      trend,
    },
    updatedAt: new Date().toISOString(),
  };

  await upsertOne('growth', { userId: req.userId, subject: doc.subject }, doc);
  res.json({ success: true, growth: doc });
});

// DELETE /api/growth/:subject — reset growth data for specific subject
router.delete('/:subject', authMiddleware, async (req, res) => {
  const subject = decodeURIComponent(req.params.subject);
  await deleteOne('growth', { userId: req.userId, subject });
  res.json({ success: true, message: `Growth data for ${subject} has been reset.` });
});

export default router;
