const { logger } = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress;
  
  logger.info('REQUEST:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: clientIp,
    userAgent: req.headers['user-agent']
  });
  next();
};

module.exports = {
  requestLogger
};
