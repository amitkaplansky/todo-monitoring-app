require('dotenv').config();

const { Kafka } = require('kafkajs');
const log4js = require('log4js');

// Add immediate debug output
console.log('🔧 DEBUG: Consumer starting...');
console.log('🔧 DEBUG: Environment variables:');
console.log('   KAFKA_BROKER:', process.env.KAFKA_BROKER);
console.log('   NODE_ENV:', process.env.NODE_ENV);

// Configure log4js for assignment compliance
log4js.configure({
  appenders: {
    console: { type: 'console' },
    file: { type: 'file', filename: 'consumer.log' }
  },
  categories: {
    default: { appenders: ['console', 'file'], level: 'info' }
  }
});

const logger = log4js.getLogger();

class TodoDatabaseConsumer {
  constructor() {
    const kafkaBroker = process.env.KAFKA_BROKER || 'kafka:9092';
    console.log(`🔧 DEBUG: Connecting to Kafka broker: ${kafkaBroker}`);
    
    this.kafka = new Kafka({
      clientId: 'todo-consumer-service',
      brokers: [kafkaBroker],
      retry: {
        initialRetryTime: 100,
        retries: 3  // Reduced for faster debugging
      },
      connectionTimeout: 5000,  // Add timeout
      requestTimeout: 5000      // Add timeout
    });
    
    this.consumer = this.kafka.consumer({ 
      groupId: 'database-change-processors',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxWaitTimeInMs: 5000
    });
    
    this.isRunning = false;
    this.messageCount = 0;
  }

  async connect() {
    try {
      console.log('🔧 DEBUG: Starting connection process...');
      logger.info('=== Todo Database Change Consumer Starting ===');
      logger.info(`Kafka Broker: ${process.env.KAFKA_BROKER || 'kafka:9092'}`);
      
      console.log('🔧 DEBUG: Attempting to connect to Kafka...');
      await this.consumer.connect();
      console.log('🔧 DEBUG: Connected! Now subscribing to topic...');
      logger.info('✅ Kafka consumer connected successfully');
      
      await this.consumer.subscribe({ 
        topic: 'database-changes',
        fromBeginning: false 
      });
      
      console.log('🔧 DEBUG: Successfully subscribed to database-changes topic');
      logger.info('✅ Subscribed to "database-changes" topic');
      logger.info('🎯 Ready to process database change events...');
      
    } catch (error) {
      console.log('🔧 DEBUG: Connection failed!');
      logger.error('❌ Failed to connect consumer:', error);
      throw error;
    }
  }

  async startConsuming() {
    this.isRunning = true;
    console.log('🔧 DEBUG: Starting to consume messages...');
    
    try {
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message, heartbeat }) => {
          try {
            this.messageCount++;
            console.log(`🔧 DEBUG: Received message #${this.messageCount}`);
            
            // Parse the incoming message from API
            const messageValue = message.value.toString();
            const changeData = JSON.parse(messageValue);
            
            logger.info(`📨 Message #${this.messageCount} received from topic: ${topic}`);
            
            // Process the database change event
            await this.processChange(changeData);
            
            // Heartbeat to keep the consumer alive
            await heartbeat();
            
          } catch (error) {
            logger.error('❌ Error processing message:', error);
            logger.error('Raw message:', message.value ? message.value.toString() : 'No message value');
          }
        },
      });
      
    } catch (error) {
      console.log('🔧 DEBUG: Error in consumer run:', error);
      logger.error('❌ Error in consumer run:', error);
      throw error;
    }
  }

  async processChange(changeData) {
    try {
      // Create processed log entry with consumer metadata
      const processedEntry = {
        ...changeData,
        processedAt: new Date().toISOString(),
        processorId: 'todo-consumer-service',
        messageType: 'DATABASE_CHANGE_PROCESSED',
        messageNumber: this.messageCount,
        consumerVersion: '1.0.0'
      };

      // Log the processed change in structured format (assignment requirement)
      logger.info('PROCESSED_DB_CHANGE:', JSON.stringify(processedEntry));

      // Route to specific handlers based on table and operation
      await this.routeChangeByTable(changeData);

      // Log processing completion
      logger.info(`✅ Successfully processed ${changeData.operation} on ${changeData.table}`);

    } catch (error) {
      logger.error('❌ Error processing change:', error);
    }
  }

  async routeChangeByTable(changeData) {
    const { table } = changeData;
    
    switch (table) {
      case 'todos':
        await this.processTodoChange(changeData);
        break;
      case 'users':
        await this.processUserChange(changeData);
        break;
      case 'user_tokens':
        await this.processTokenChange(changeData);
        break;
      default:
        await this.processGenericChange(changeData);
    }
  }

  async processTodoChange(changeData) {
    const { operation, data, userId, timestamp } = changeData;
    
    switch (operation) {
      case 'INSERT':
        logger.info('🆕 TODO_CREATED:', JSON.stringify({
          event: 'new_todo_detected',
          todoId: data.id,
          title: data.title,
          priority: data.priority,
          userId: data.user_id,
          status: data.status,
          timestamp,
          processedBy: 'todo-consumer-service'
        }));
        
        // Simulate additional processing
        await this.performTodoAnalytics('create', data);
        break;
        
      case 'UPDATE':
        logger.info('📝 TODO_UPDATED:', JSON.stringify({
          event: 'todo_modification_detected',
          todoId: data.id,
          status: data.status,
          priority: data.priority,
          title: data.title,
          userId,
          timestamp,
          processedBy: 'todo-consumer-service'
        }));
        
        await this.performTodoAnalytics('update', data);
        break;
        
      case 'DELETE':
        logger.info('🗑️ TODO_DELETED:', JSON.stringify({
          event: 'todo_removal_detected',
          todoId: data.id,
          userId,
          timestamp,
          processedBy: 'todo-consumer-service'
        }));
        
        await this.performTodoAnalytics('delete', data);
        break;
    }
  }

  async processUserChange(changeData) {
    const { operation, data, userId, timestamp } = changeData;
    
    switch (operation) {
      case 'INSERT':
        logger.info('👤 USER_REGISTERED:', JSON.stringify({
          event: 'new_user_registration_detected',
          userId: data.id,
          username: data.username,
          email: data.email,
          timestamp,
          processedBy: 'todo-consumer-service'
        }));
        break;
        
      case 'UPDATE':
        logger.info('👤 USER_PROFILE_UPDATED:', JSON.stringify({
          event: 'user_profile_change_detected',
          userId: data.id,
          email: data.email,
          timestamp,
          processedBy: 'todo-consumer-service'
        }));
        break;
    }
  }

  async processTokenChange(changeData) {
    const { operation, data, userId, timestamp } = changeData;
    
    switch (operation) {
      case 'INSERT':
        logger.info('🔐 USER_TOKEN_CREATED:', JSON.stringify({
          event: 'user_login_session_detected',
          userId: data.user_id,
          expiresAt: data.expires_at,
          timestamp,
          processedBy: 'todo-consumer-service'
        }));
        break;
        
      case 'UPDATE':
        logger.info('🔐 USER_TOKEN_REVOKED:', JSON.stringify({
          event: 'user_logout_session_detected',
          isRevoked: data.is_revoked,
          userId,
          timestamp,
          processedBy: 'todo-consumer-service'
        }));
        break;
    }
  }

  async processGenericChange(changeData) {
    const { operation, table, data, userId, timestamp } = changeData;
    
    logger.info('📊 GENERIC_DB_CHANGE:', JSON.stringify({
      event: 'database_change_detected',
      table,
      operation: operation.toLowerCase(),
      recordId: data.id,
      userId,
      timestamp,
      processedBy: 'todo-consumer-service'
    }));
  }

  // Simulate additional processing (analytics, notifications, etc.)
  async performTodoAnalytics(action, todoData) {
    logger.info('📈 ANALYTICS_PROCESSING:', JSON.stringify({
      event: 'todo_analytics_update',
      action,
      todoId: todoData.id,
      priority: todoData.priority,
      status: todoData.status,
      userId: todoData.user_id,
      processedAt: new Date().toISOString()
    }));
  }

  async disconnect() {
    this.isRunning = false;
    try {
      await this.consumer.disconnect();
      logger.info('✅ Todo Consumer Service disconnected successfully');
      logger.info(`📊 Total messages processed: ${this.messageCount}`);
    } catch (error) {
      logger.error('❌ Error disconnecting consumer:', error);
    }
  }

  // Graceful shutdown handling
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info(`🛑 Received ${signal}, shutting down Todo Consumer Service gracefully...`);
      await this.disconnect();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
  }

  // Health check method
  getStatus() {
    return {
      isRunning: this.isRunning,
      messagesProcessed: this.messageCount,
      startTime: new Date().toISOString()
    };
  }
}

// Main execution function
async function main() {
  console.log('🔧 DEBUG: Main function starting...');
  console.log('🔧 DEBUG: Environment variables:');
  console.log('   KAFKA_BROKER:', process.env.KAFKA_BROKER);
  console.log('   NODE_ENV:', process.env.NODE_ENV);
  
  const consumer = new TodoDatabaseConsumer();
  
  try {
    // Set up graceful shutdown
    consumer.setupGracefulShutdown();
    
    console.log('🔧 DEBUG: About to connect...');
    // Connect and start consuming
    await consumer.connect();
    
    console.log('🔧 DEBUG: Connected! Starting to consume...');
    await consumer.startConsuming();
    
    // Log startup success
    logger.info('🚀 Todo Database Change Consumer is running!');
    logger.info('🔄 Waiting for database change events from Kafka...');
    logger.info('⏹️  Press Ctrl+C to stop');
    
    console.log('🔧 DEBUG: Consumer is now running and waiting for messages...');
    
  } catch (error) {
    console.log('🔧 DEBUG: Error in main function:', error.message);
    logger.error('💥 Failed to start Todo Consumer Service:', error);
    
    // Retry connection after delay
    setTimeout(async () => {
      logger.info('🔄 Retrying connection in 5 seconds...');
      await main();
    }, 5000);
  }
}

// Start the consumer if this file is run directly
if (require.main === module) {
  console.log('🔧 DEBUG: File executed directly, starting main...');
  main().catch(error => {
    console.log('🔧 DEBUG: Unhandled error:', error.message);
    logger.error('💥 Unhandled error in Todo Consumer Service:', error);
    process.exit(1);
  });
}

module.exports = TodoDatabaseConsumer;