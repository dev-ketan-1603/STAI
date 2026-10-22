import express from 'express';
import nodemailer from 'nodemailer';
import { insertOne } from '../middleware/db.js';

const router = express.Router();

// POST /api/contact — send contact form email (with safe storage fallback)
router.post('/', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }

  const record = {
    id: `msg_${Date.now()}`,
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
    receivedAt: new Date().toISOString(),
  };

  try {
    insertOne('contact_messages', record);
  } catch (err) {
    console.warn('[Contact] Could not save message to DB:', err.message);
  }

  const isMailConfigured =
    process.env.MAIL_USER &&
    process.env.MAIL_PASS &&
    process.env.MAIL_PASS !== 'your_google_app_password_here' &&
    process.env.MAIL_USER !== 'your_gmail@gmail.com';

  if (!isMailConfigured) {
    console.log(`[Contact] Logged message from ${name} (${email}): ${message}`);
    return res.json({
      success: true,
      message: 'Thank you! Your message has been received.',
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.MAIL_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // Email to site owner
    await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME || 'STAI'}" <${process.env.MAIL_USER}>`,
      to: process.env.MAIL_USER,
      subject: `New Contact from ${name} — STAI`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0D0D0D; padding: 20px 28px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #FFFF66; margin: 0; font-size: 20px;">New Contact Message — STAI</h2>
          </div>
          <div style="background: #fff; border: 2px solid #0D0D0D; border-top: none; padding: 28px; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 12px;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 0 0 12px;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p style="margin: 0 0 8px;"><strong>Message:</strong></p>
            <div style="background: #F9F9F9; border-left: 4px solid #FFFF66; padding: 14px 16px; border-radius: 0 8px 8px 0; white-space: pre-wrap;">${message}</div>
          </div>
        </div>
      `,
    });

    res.json({ success: true, message: 'Message sent successfully!' });
  } catch (err) {
    console.warn('[Contact] Mail delivery failed, message stored locally:', err.message);
    res.json({
      success: true,
      message: 'Thank you! Your message has been safely received.',
    });
  }
});

export default router;
