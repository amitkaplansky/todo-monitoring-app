const log4js = require('log4js');

// Configure log4js for assignment compliance
log4js.configure({
  appenders: {
    console: { type: 'console' },
    file: { type: 'file', filename: 'app.log' }
  },
  categories: {
    default: { appenders: ['console', 'file'], level: 'info' }
  }
});

const logger = log4js.getLogger();

// Assignment-compliant user activity logging
const logUserActivity = (userId, action, ipAddress, additionalData = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId: userId,
    action: action,
    ipAddress: ipAddress,
    ...additionalData
  };
  
  // Log to console in JSON format as required by assignment
  logger.info('USER_ACTIVITY:', JSON.stringify(logEntry));
  return logEntry;
};

// Database change logging with CDC
const logDatabaseChange = async (operation, table, data, userId = null) => {
  const { getProducer } = require('../config/kafka');
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation,
    table,
    data,
    userId
  };

  // Log database changes to console in structured format
  logger.info('DB_CHANGE:', JSON.stringify(logEntry));

  // Send to Kafka for real-time processing
  const producer = getProducer();
  if (producer) {
    try {
      await producer.send({
        topic: 'database-changes',
        messages: [{
          key: `${table}-${operation}`,
          value: JSON.stringify(logEntry)
        }]
      });
    } catch (error) {
      logger.error('Failed to send CDC message to Kafka:', error);
    }
  }
};

module.exports = {
  logger,
  logUserActivity,
  logDatabaseChange
};
