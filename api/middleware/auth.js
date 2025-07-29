const jwt = require('jsonwebtoken');
const { getDatabase } = require('../config/database');
const { logger } = require('../utils/logger');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const db = getDatabase();
    
    // Check token in database and user is active
    const [tokenRows] = await db.execute(`
      SELECT ut.*, u.username FROM user_tokens ut 
      JOIN users u ON ut.user_id = u.id 
      WHERE ut.token = ? AND ut.expires_at > NOW() AND ut.is_revoked = FALSE AND u.is_active = TRUE
    `, [token]);

    if (tokenRows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      id: decoded.userId,
      username: tokenRows[0].username
    };
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

module.exports = {
  authenticateToken
};
