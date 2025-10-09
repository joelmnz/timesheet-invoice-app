import { Router } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { loginSchema } from '../types/validation.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 100,
  message: 'Too many login attempts, please try again later',
});

// Get credentials from env
const APP_USERNAME = process.env.APP_USERNAME || 'admin';
const APP_PASSWORD = process.env.APP_PASSWORD;
const APP_PASSWORD_HASH = process.env.APP_PASSWORD_HASH;

let passwordHash: string;

// Initialize password hash
if (APP_PASSWORD_HASH) {
  passwordHash = APP_PASSWORD_HASH;
} else if (APP_PASSWORD) {
  passwordHash = await bcrypt.hash(APP_PASSWORD, 12);
} else {
  console.warn('WARNING: No password configured! Using default password "admin"');
  passwordHash = await bcrypt.hash('admin', 12);
}

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    if (username !== APP_USERNAME) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.authenticated = true;
    req.session.username = username;

    res.json({ success: true, username });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  res.json({
    authenticated: !!req.session.authenticated,
    username: req.session.username,
  });
});

export default router;
