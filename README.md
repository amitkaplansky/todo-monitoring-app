# Todo Monitoring App

A complete full-stack application with authentication, todo management, database integration, and real-time monitoring capabilities using Change Data Capture (CDC).

## Architecture

- **Frontend**: React application for user interface
- **Backend**: Node.js API with authentication and todo management
- **Database**: TiDB for data storage
- **Message Queue**: Apache Kafka for Change Data Capture (CDC)
- **Consumer**: Real-time todo processing and monitoring
- **Containerization**: Docker & Docker Compose

## Core Tables

1. **users** - User authentication data
2. **user_tokens** - JWT token management
3. **todos** - Todo items and their status

## Quick Start

```bash
# Start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:3001
# TiDB: localhost:4000
```

## Default Credentials

- Username: `admin`
- Password: `admin123`

## Services

- **tidb**: TiDB database server (port 4000)
- **kafka**: Apache Kafka message broker (port 9092)
- **zookeeper**: Kafka dependency (port 2181)
- **api**: Backend Node.js API server (port 3001)
- **client**: React frontend application (port 3000)
- **consumer**: Kafka consumer for todo processing (port 3003)

## Testing the CDC Flow

1. Open http://localhost:3000 and login with default credentials
2. Create, update, or delete todos in the web interface
3. Watch real-time processing logs:
   ```bash
   docker-compose logs -f consumer
   ```

## Assignment Compliance

✅ **Part 1**: React frontend + Node.js API + TiDB database + JWT authentication  
✅ **Part 2**: Docker containerization + Kafka integration + Database initialization  
✅ **Part 3**: User activity logging + Database CDC + Real-time consumer processing  

---

**Ready to run?** → `docker-compose up --build`