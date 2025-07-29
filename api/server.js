const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import configurations
const { initDatabase } = require('./config/database');
const { initKafka } = require('./config/kafka');
const { logger } = require('./utils/logger');

// Import middleware
const { requestLogger } = require('./middleware/logging');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const todoRoutes = require('./routes/todos');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Logging middleware
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'todo-api'
  });
});

// API routes
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api/todos', todoRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    await initDatabase();
    await initKafka();
    
    app.listen(PORT, () => {
      logger.info(`Todo API Server running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
