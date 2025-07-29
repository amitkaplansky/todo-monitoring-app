const { Kafka } = require('kafkajs');
const log4js = require('log4js');

// Use log4js directly to avoid circular dependency
const logger = log4js.getLogger();

let kafka;
let producer;

const initKafka = async () => {
  try {
    kafka = new Kafka({
      clientId: 'api-service',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    });
    
    producer = kafka.producer();
    await producer.connect();
    logger.info('Kafka producer connected successfully');
    return producer;
  } catch (error) {
    logger.error('Failed to connect to Kafka:', error);
    throw error;
  }
};

const getProducer = () => {
  return producer;
};

module.exports = {
  initKafka,
  getProducer
};
