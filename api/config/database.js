const mysql = require('mysql2/promise');
const log4js = require('log4js');

const logger = log4js.getLogger();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 4000,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'testdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let db;

const initDatabase = async () => {
  try {
    db = mysql.createPool(dbConfig);
    await db.execute('SELECT 1');
    logger.info('TiDB Database connected successfully');
    return db;
  } catch (error) {
    logger.error('Database connection failed:', error);
    setTimeout(initDatabase, 5000);
    throw error;
  }
};

const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

module.exports = {
  initDatabase,
  getDatabase
};
