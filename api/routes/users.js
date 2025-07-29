const express = require('express');
const { getDatabase } = require('../config/database');
const { logUserActivity, logDatabaseChange, logger } = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();
    const [users] = await db.execute(
      'SELECT id, username, email, created_at FROM users WHERE id = ? AND is_active = TRUE',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const db = getDatabase();
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if email is already taken
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email = ? AND id != ? AND is_active = TRUE',
      [email, req.user.id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already taken' });
    }

    // Update user
    await db.execute(
      'UPDATE users SET email = ? WHERE id = ?',
      [email, req.user.id]
    );

    // Log user activity
    logUserActivity(req.user.id, 'profile_update', clientIp, { email });

    // Log database change
    await logDatabaseChange('UPDATE', 'users', {
      id: req.user.id,
      email
    }, req.user.id);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
