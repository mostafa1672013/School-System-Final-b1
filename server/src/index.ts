import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import accountingRouter from './accounting-api';
import { requireAuth, socketAuth } from './middleware/auth';

// Domain routers
import studentsRouter from './routes/students';
import paymentsRouter from './routes/payments';
import usersRouter from './routes/users';
import inventoryRouter from './routes/inventory';
import feesRouter from './routes/fees';
import installmentsRouter from './routes/installments';
import databaseRouter from './routes/database';
import miscRouter from './routes/misc';
import userRolesRouter from './routes/user-roles';
import auditLogRouter from './routes/audit-log';
import purchasingRouter from './routes/purchasing';
import migrationRouter from './routes/migration';
import gradeItemListsRouter from './routes/grade-item-lists';
import deliveryOrdersRouter from './routes/delivery-orders';
import distributionReportRouter from './routes/distribution-report';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

// Parse allowed origins from env
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:8080')
  .split(',')
  .map(s => s.trim());

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow any localhost/127.0.0.1 origin in development
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  // Allow Cloudflare quick tunnels
  if (origin.endsWith('.trycloudflare.com')) return true;
  // Allow LocalTunnel
  if (origin.endsWith('.loca.lt')) return true;
  // Allow localhost.run
  if (origin.endsWith('.lhr.life')) return true;
  // Allow Ngrok
  if (origin.endsWith('.ngrok-free.dev')) return true;
  return false;
};

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, origin);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

// Security middleware
app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Login rate limiter (applied only to login endpoint)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 1000, // 1000 attempts in dev/tunnel
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to login endpoint specifically
app.use('/api/auth/login', loginLimiter);

// Global auth middleware for all protected routes
const PUBLIC_PATHS = ['/api/auth/login', '/health'];
app.use((req, res, next) => {
  if (PUBLIC_PATHS.includes(req.path)) return next();
  requireAuth(req, res, next);
});

// ===== Router Mounts =====

// Students + Admission (same router, different prefix)
app.use('/api/students', studentsRouter);
app.use('/api/admission', studentsRouter);

// Payments + Treasury + Expenses + Accounts (all mounted at /api)
app.use('/api', paymentsRouter);

// Users + Auth (same router, different prefix)
app.use('/api/users', usersRouter);
app.use('/api/auth', usersRouter);

// Inventory
app.use('/api/inventory', inventoryRouter);

// Purchasing
app.use('/api/purchasing', purchasingRouter);

// Stage Fees
app.use('/api/stage-fees', feesRouter);

// Installments
app.use('/api/installments', installmentsRouter);

// Database management
app.use('/api/database', databaseRouter);

// Misc: badges, bus-routes, settings (mounted at /api)
app.use('/api', miscRouter);

// Accounting (fiscal years, periods, cost centers, journal entries, reports)
app.use('/api', accountingRouter);

// User Roles (multi-role management)
app.use('/api/user-roles', userRolesRouter);

// Audit Log (read-only for management roles)
app.use('/api/audit', auditLogRouter);

// Migration (Bulk imports and data balancing)
app.use('/api/migration', migrationRouter);

// Grade Item Lists (per-grade supply lists for purchasing)
app.use('/api/grade-item-lists', gradeItemListsRouter);

// Delivery Orders (create → confirm → deliver → return/cancel)
app.use('/api/delivery-orders', deliveryOrdersRouter);

// Distribution reports (grade-summary + per-student status)
app.use('/api/distribution', distributionReportRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== Socket.IO Real-time User Presence =====

// Apply Socket.IO authentication middleware
io.use(socketAuth);

// Track connected users by socket ID (in-memory store)
const userSockets = new Map<string, { userId: string; socketId: string; connectTime: Date }>();

io.on('connection', (socket) => {
  const userId = socket.data.user.userId;
  console.log(`✅ New socket connection: ${socket.id} (user: ${userId})`);

  // When user logs in or connects
  socket.on('user-login', async () => {
    try {
      // userId comes from socket.data.user (JWT), not from event parameter
      userSockets.set(socket.id, { userId, socketId: socket.id, connectTime: new Date() });
      console.log(`🟢 User online: ${userId}`);

      // Notify all connected clients about this user being online
      io.emit('user-status-changed', {
        userId,
        isOnline: true,
        lastLogoutAt: null
      });
    } catch (error) {
      console.error('❌ user-login error:', error);
    }
  });

  // Heartbeat - User sends signal every 30 seconds to prove they're still online
  socket.on('heartbeat', () => {
    try {
      // userId comes from socket.data.user (JWT)
      // Update the socket entry to keep it fresh
      const existing = userSockets.get(socket.id);
      if (existing) {
        userSockets.set(socket.id, { ...existing, connectTime: new Date() });
      }
    } catch (error) {
      console.error('❌ heartbeat error:', error);
    }
  });

  // When user explicitly logs out
  socket.on('user-logout', async () => {
    try {
      // userId comes from socket.data.user (JWT)
      userSockets.delete(socket.id);
      console.log(`🔴 User offline (explicit logout): ${userId}`);

      // Notify all connected clients
      io.emit('user-status-changed', {
        userId,
        isOnline: false,
        lastLogoutAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ user-logout error:', error);
    }
  });

  // When socket disconnects (network issue, page close, etc.)
  socket.on('disconnect', () => {
    try {
      const user = userSockets.get(socket.id);
      if (user) {
        userSockets.delete(socket.id);
        console.log(`🔴 Socket disconnected, marking user offline: ${user.userId}`);

        // Notify all clients that user is offline
        io.emit('user-status-changed', {
          userId: user.userId,
          isOnline: false,
          lastLogoutAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ disconnect error:', error);
    }
  });
});

export { app };
export { httpServer };

// Start server (only when not in test environment)
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket ready on ws://localhost:${PORT}`);
  });
}
// trigger restart
