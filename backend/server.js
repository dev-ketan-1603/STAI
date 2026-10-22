import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

import { initDB } from './middleware/db.js';

import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import examsRoutes from './routes/exams.js';
import growthRoutes from './routes/growth.js';
import timetableRoutes from './routes/timetable.js';
import subjectsRoutes from './routes/subjects.js';
import aiRoutes from './routes/ai.js';
import contactRoutes from './routes/contact.js';
import quizRoutes from './routes/quiz.js';
import sessionRoutes from './routes/session.js';
import aiPredictRoutes from './routes/aiPredict.js';
import questionsRoutes from './routes/questions.js';
import studyMaterialsRoutes from './routes/studyMaterials.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// Trust reverse proxy headers (vital for Render, Railway, Vercel, Fly.io, Heroku)
app.set('trust proxy', 1);

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows flexible SPA loading and external CDNs/Google Auth
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Production HTTP request logging
app.use(morgan(isProd ? 'combined' : 'dev'));

// CORS configuration supporting single domain, comma-separated domains, or Vercel/Netlify previews
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(o => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

// In non-production, include standard local Vite ports by default
if (!isProd) {
  if (!allowedOrigins.includes('http://localhost:5173')) allowedOrigins.push('http://localhost:5173');
  if (!allowedOrigins.includes('http://localhost:3000')) allowedOrigins.push('http://localhost:3000');
  if (!allowedOrigins.includes('http://localhost:4173')) allowedOrigins.push('http://localhost:4173');
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin static requests)
      if (!origin) return callback(null, true);

      // Explicit match in allowed origins list
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Support Vercel / Netlify preview deployments (*.vercel.app / *.netlify.app)
      if (/\.vercel\.app$/.test(origin) || /\.netlify\.app$/.test(origin)) {
        return callback(null, true);
      }

      // If in development mode, allow any localhost port
      if (!isProd && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

// ── Rate Limiting (Prevents abuse and quota exhaustion) ──────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again after 15 minutes.' },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit reached. Please wait a few moments before requesting more AI generations.' },
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/google', authLimiter);
app.use('/api/ai', aiLimiter);

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/growth', growthRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/ai-predict', aiPredictRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/study-materials', studyMaterialsRoutes);

// Health check with detailed diagnostic info for uptime monitors & hosting platforms
app.get('/api/health', (_, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    database: process.env.MONGODB_URI ? 'mongodb' : 'json_file_storage',
  });
});

// ── Single-Service Hosting (Serve Frontend if build exists) ────────────────
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
const hasFrontendDist = fs.existsSync(frontendDistPath);

if (hasFrontendDist && (isProd || process.env.SERVE_FRONTEND === 'true')) {
  console.log(`🌐 Serving production frontend static assets from: ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));

  // SPA fallback: send index.html for any non-API route
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 404 handler for unmatched API routes
app.use('/api/*', (_, res) => res.status(404).json({ error: 'API endpoint not found' }));

// Global Error handler
app.use((err, _, res, __) => {
  console.error('[Server Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: isProd ? 'Internal server error' : err.message || 'Internal server error',
  });
});

// ── Startup & Initialization ───────────────────────────────────────────────
async function startServer() {
  // Connect to database (MongoDB Atlas or Local JSON)
  await initDB();

  // Validate critical security variables in production
  if (isProd) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'stai_super_secret_jwt_key_2026') {
      console.warn('⚠️  SECURITY WARNING: Using default or weak JWT_SECRET in production! Please set a strong random 64-char JWT_SECRET in your host environment variables.');
    }
  }

  const server = app.listen(PORT, () => {
    const hasGemini = process.env.GEMINI_API_KEY || process.env.AI_STUDIO_API_KEY || process.env.GOOGLE_API_KEY;
    const hasHf = process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY;
    const aiStatus = hasGemini ? '✅ Google AI Studio (Gemini)' : hasHf ? '✅ Hugging Face' : '⚠️ Offline fallback mode';

    console.log(`\n🚀 STAI Backend running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 AI Provider: ${aiStatus}`);
    console.log(`📧 Mail: ${process.env.MAIL_USER && process.env.MAIL_PASS !== 'your_google_app_password_here' ? '✅ Configured' : 'ℹ️  Mock/Storage Mode'}`);
    console.log(`🛡️  Rate Limiting & Security Headers: Enabled\n`);
  });

  // Graceful shutdown on SIGTERM / SIGINT
  const handleShutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
    server.close(() => {
      console.log('✅ Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer();
