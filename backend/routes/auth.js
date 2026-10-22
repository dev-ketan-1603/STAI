import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import { findOne, insertOne, updateOne } from '../middleware/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required.' });

    const existing = findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
    if (existing)
      return res.status(409).json({ error: 'An account with this email already exists.' });

    const hashed = await bcrypt.hash(password, 10);
    const user = {
      id: uuidv4(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      createdAt: new Date().toISOString(),
      hasCompletedDataCollection: false,
    };
    insertOne('users', user);

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, hasCompletedDataCollection: false },
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const user = findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
    if (!user)
      return res.status(401).json({ error: 'Invalid email or password.' });

    if (!user.password) {
      return res.status(400).json({ error: 'This account was created with Google. Please use Google Sign-In.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || '',
        hasCompletedDataCollection: user.hasCompletedDataCollection,
      },
    });
  } catch {
    res.status(500).json({ error: 'Login failed.' });
  }
});

// POST /api/auth/google — authenticate via Google ID token or access_token + profile
router.post('/google', async (req, res) => {
  try {
    const { credential, accessToken, profile } = req.body;

    let payload;

    // ── Path A: access_token + pre-fetched profile (from useGoogleLogin implicit flow) ──
    if (accessToken && profile?.email) {
      // Verify the access_token is genuine by hitting Google's tokeninfo
      try {
        const infoRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
        );
        // If it returns ok we trust the profile provided by the frontend (already fetched from userinfo)
        if (!infoRes.ok) throw new Error('Access token validation failed.');
        payload = {
          sub: profile.sub,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
        };
      } catch (verifyErr) {
        console.warn('[Google Auth] Access token validation failed:', verifyErr.message);
        return res.status(401).json({ error: 'Invalid or expired Google access token.' });
      }

    // ── Path B: id_token credential (from GoogleLogin button / One Tap) ──────────────
    } else if (credential) {
      const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
      try {
        if (clientId) {
          const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
          payload = ticket.getPayload();
        } else {
          // Fallback: verify via Google tokeninfo endpoint (no client ID required)
          const infoRes = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
          );
          if (!infoRes.ok) throw new Error('Google tokeninfo endpoint returned an error.');
          payload = await infoRes.json();
        }
      } catch (verifyErr) {
        console.warn('[Google Auth] Token verification failed:', verifyErr.message);
        return res.status(401).json({ error: 'Invalid or expired Google credential.' });
      }
    } else {
      return res.status(400).json({ error: 'Either credential or accessToken + profile is required.' });
    }

    if (!payload?.email) {
      return res.status(400).json({ error: 'Google account is missing an email address.' });
    }

    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;
    const name = payload.name || email.split('@')[0];
    const avatar = payload.picture || '';

    // Check if user exists by googleId or email
    let user = findOne('users', u => u.googleId === googleId || u.email.toLowerCase() === email);

    if (user) {
      const updates = {};
      if (!user.googleId) updates.googleId = googleId;
      if (!user.avatar && avatar) updates.avatar = avatar;
      if (Object.keys(updates).length > 0) {
        user = updateOne('users', u => u.id === user.id, updates);
      }
    } else {
      user = {
        id: uuidv4(),
        name,
        email,
        googleId,
        avatar,
        password: null, // Google authenticated user
        createdAt: new Date().toISOString(),
        hasCompletedDataCollection: false,
      };
      insertOne('users', user);
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || avatar,
        hasCompletedDataCollection: Boolean(user.hasCompletedDataCollection),
      },
    });
  } catch (err) {
    console.error('[Google Auth] Error:', err.message);
    res.status(500).json({ error: 'Google authentication failed.' });
  }
});

// POST /api/auth/google-dev — quick test mock login for local development
router.post('/google-dev', async (req, res) => {
  try {
    const { email = 'student.google@example.com', name = 'Google Scholar' } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const googleId = 'dev_google_' + Buffer.from(cleanEmail).toString('hex').slice(0, 16);

    let user = findOne('users', u => u.googleId === googleId || u.email.toLowerCase() === cleanEmail);
    if (!user) {
      user = {
        id: uuidv4(),
        name,
        email: cleanEmail,
        googleId,
        avatar: 'https://lh3.googleusercontent.com/a/default-user',
        password: null,
        createdAt: new Date().toISOString(),
        hasCompletedDataCollection: false,
      };
      insertOne('users', user);
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        hasCompletedDataCollection: Boolean(user.hasCompletedDataCollection),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Google dev test failed.' });
  }
});

// GET /api/auth/me — verify token & return user
router.get('/me', authMiddleware, (req, res) => {
  const user = findOne('users', u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || '',
      hasCompletedDataCollection: user.hasCompletedDataCollection,
    },
  });
});

export default router;
