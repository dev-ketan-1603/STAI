import express from 'express';
import { findOne, updateOne, upsertOne } from '../middleware/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// GET /api/profile/edu — get education data for logged-in user directly from MongoDB
router.get('/edu', authMiddleware, async (req, res) => {
  const data = await findOne('edu_data', { userId: req.userId });
  res.json({ eduData: data || null });
});

// POST /api/profile/edu — save/update education data
router.post('/edu', authMiddleware, async (req, res) => {
  const { institution, educationLevel, course, semester, specialization, subjects } = req.body;
  if (!institution || !educationLevel || !subjects?.length)
    return res.status(400).json({ error: 'Institution, level and subjects are required.' });

  const doc = {
    userId: req.userId,
    institution,
    educationLevel,
    course: course || '',
    semester: semester || '',
    specialization: specialization || '',
    subjects,
    updatedAt: new Date().toISOString(),
  };

  await upsertOne('edu_data', { userId: req.userId }, doc);

  // Mark user as having completed data collection
  await updateOne('users', { id: req.userId }, { hasCompletedDataCollection: true });

  res.json({ success: true, eduData: doc });
});

// GET /api/profile/user — get user profile directly from MongoDB
router.get('/user', authMiddleware, async (req, res) => {
  const user = await findOne('users', { id: req.userId });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: { id: user.id, name: user.name, email: user.email, hasCompletedDataCollection: user.hasCompletedDataCollection } });
});

export default router;
