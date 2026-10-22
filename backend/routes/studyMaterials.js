// routes/studyMaterials.js — Saved study material recommendations

import express from 'express';
import { findAll, upsertOne } from '../middleware/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// ─── GET /api/study-materials/:subject ────────────────────
router.get('/:subject', authMiddleware, async (req, res) => {
  try {
    const subject = decodeURIComponent(req.params.subject);
    const record = (await findAll('study_materials', { userId: req.user.id, subject }))[0];
    res.json({ materials: record?.materials || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch study materials.' });
  }
});

// ─── POST /api/study-materials ────────────────────────────
// Save recommended study materials directly in MongoDB Atlas
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { subject, materials, weakAreas } = req.body;

    if (!subject || !Array.isArray(materials)) {
      return res.status(400).json({ error: 'Subject and materials array are required.' });
    }

    const record = {
      userId: req.user.id,
      subject,
      weakAreas: weakAreas || '',
      materials,
      savedAt: new Date().toISOString(),
    };

    await upsertOne('study_materials', { userId: req.user.id, subject }, record);

    res.json({ message: 'Study materials saved!', record });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save study materials.' });
  }
});

export default router;
