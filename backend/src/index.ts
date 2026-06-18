// MoltBook Backend - Main Entry Point (SQLite version)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import agentRoutes from './routes/agent.routes';
import sessionRoutes from './routes/session.routes';
import taskRoutes from './routes/task.routes';
import experimentRoutes from './routes/experiment.routes';
import analyticsRoutes from './routes/analytics.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middleware/error.middleware';
import { getDB } from './utils/db';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/socket.io',
});

// Middleware
app.use(helmet());
const allowedOrigins = ['https://moltbook-frontend.onrender.com', 'http://localhost:5173'];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/experiments', experimentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const db = await getDB();
    const users = db.exec('SELECT COUNT(*) as count FROM users');
    const agents = db.exec('SELECT COUNT(*) as count FROM agents');
    const sessions = db.exec('SELECT COUNT(*) as count FROM sessions');
    res.json({
      status: 'ok',
      database: 'sqlite',
      connected: true,
      stats: {
        users: (users[0]?.values?.[0]?.[0] as number) || 0,
        agents: (agents[0]?.values?.[0]?.[0] as number) || 0,
        sessions: (sessions[0]?.values?.[0]?.[0] as number) || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// Error handler
app.use(errorHandler);

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'moltbook-dev-secret-change-in-production');
    socket.data.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// Socket.io connection handler
io.of('/agents').on('connection', (socket) => {
  logger.info(`User connected to /agents: ${socket.data.user?.userId}`);

  socket.on('join-session', (sessionId: string) => {
    socket.join(`session-${sessionId}`);
    logger.info(`User joined session room: ${sessionId}`);
  });

  socket.on('leave-session', (sessionId: string) => {
    socket.leave(`session-${sessionId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected from /agents: ${socket.data.user?.userId}`);
  });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await getDB(); // Initialize SQLite database
    logger.info('SQLite database ready');
    
    httpServer.listen(PORT, () => {
      logger.info(`MoltBook server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { app, io };
