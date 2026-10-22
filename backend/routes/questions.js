// routes/questions.js — Generated practice questions

import express from 'express';
import { findAll, upsertOne } from '../middleware/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// ─── GET /api/questions/:subject ──────────────────────────
router.get('/:subject', authMiddleware, async (req, res) => {
  try {
    const subject = decodeURIComponent(req.params.subject);
    const record = (await findAll('questions', { userId: req.user.id, subject }))[0];
    res.json({ questions: record?.questions || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questions.' });
  }
});

// ─── POST /api/questions ──────────────────────────────────
// Save generated questions for a subject directly in MongoDB Atlas
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { subject, questions, topic } = req.body;

    if (!subject || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Subject and questions array are required.' });
    }

    const record = {
      userId: req.user.id,
      subject,
      topic: topic || '',
      questions,
      savedAt: new Date().toISOString(),
    };

    await upsertOne('questions', { userId: req.user.id, subject }, record);

    res.json({ message: 'Questions saved!', record });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save questions.' });
  }
});

export default router;
