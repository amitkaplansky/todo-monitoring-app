const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../config/database');
const { logUserActivity, logDatabaseChange, logger } = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// User registration
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const db = getDatabase();

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE (username = ? OR email = ?) AND is_active = TRUE',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert user
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password, is_active) VALUES (?, ?, ?, TRUE)',
      [username, email, hashedPassword]
    );

    const userId = result.insertId;

    // Assignment-compliant logging
    logUserActivity(userId, 'register', clientIp, {
      username,
      email
    });

    // Log database change for CDC
    await logDatabaseChange('INSERT', 'users', {
      id: userId,
      username,
      email
    }, userId);

    res.status(201).json({ 
      message: 'User registered successfully',
      userId 
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const db = getDatabase();

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find active user by username or email
    const [users] = await db.execute(
      'SELECT id, username, email, password FROM users WHERE (username = ? OR email = ?) AND is_active = TRUE',
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    // Store token in database
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.execute(
      'INSERT INTO user_tokens (user_id, token, expires_at, is_revoked) VALUES (?, ?, ?, FALSE)',
      [user.id, token, expiresAt]
    );

    // Assignment-compliant user activity logging
    logUserActivity(user.id, 'login', clientIp, {
      userAgent: req.headers['user-agent'],
      username: user.username
    });

    // Log database change for CDC
    await logDatabaseChange('INSERT', 'user_tokens', {
      user_id: user.id,
      expires_at: expiresAt
    }, user.id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const db = getDatabase();

    // Revoke token
    await db.execute('UPDATE user_tokens SET is_revoked = TRUE WHERE token = ?', [token]);

    // Assignment-compliant logging
    logUserActivity(req.user.id, 'logout', clientIp);

    // Log database change
    await logDatabaseChange('UPDATE', 'user_tokens', {
      token: token.substring(0, 20) + '...',
      is_revoked: true
    }, req.user.id);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
