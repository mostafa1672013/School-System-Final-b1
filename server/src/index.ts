import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Global error handlers to prevent third-party library crashes
process.on('uncaughtException', (err: any) => {
  if (err && err.message && err.message.includes('subarray')) {
    console.error('⚠️ [ZKTeco Internal Error] Ignored unhandled internal subarray error:', err.message);
    return;
  }
  console.error('❌ Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason: any) => {
  console.error('⚠️ [Unhandled Rejection]:', reason);
});

// Load environment variables
dotenv.config();

import { prisma } from './lib/prisma';
import { getRedis } from './lib/cache';

// Initialize cache
getRedis();

const app = express();
const PORT = process.env.PORT || 3000;

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'server', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Parse allowed origins from env
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:8080')
  .split(',')
  .map(s => s.trim());

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  if (origin.endsWith('.trycloudflare.com')) return true;
  if (origin.endsWith('.loca.lt')) return true;
  if (origin.endsWith('.lhr.life')) return true;
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

// Performance logging
import { perfLogger } from './middleware/perf';
app.use(perfLogger);

// GZIP compression
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const compression = require('compression');
  app.use(compression({ threshold: 1024 }));
} catch {
  console.warn(
    '[perf] `compression` package not installed — skipping.',
  );
}

// Security headers
app.use(helmet());

// CORS Configuration
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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'server', 'uploads')));

// Login rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 1000,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', loginLimiter);

// Global authentication middleware
import { requireAuth, socketAuth } from './middleware/auth';
const PUBLIC_PATHS = ['/api/auth/login', '/health', '/api/upload']; // Allow upload for setup
app.use((req, res, next) => {
  if (PUBLIC_PATHS.includes(req.path)) return next();
  requireAuth(req, res, next);
});

// Upload Endpoint
app.post('/api/upload', (req, res) => {
  try {
    const { file, filename } = req.body;
    if (!file || !filename) return res.status(400).json({ error: 'Missing file data' });
    
    const base64Data = file.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    const uploadDir = path.join(process.cwd(), 'server', 'uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const uniqueName = Date.now() + '-' + filename;
    fs.writeFileSync(path.join(uploadDir, uniqueName), base64Data, 'base64');
    
    res.json({ url: `/uploads/${uniqueName}` });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== Domain Router Mounts =====
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
import reportsRouter from './routes/reports';
import accountingRouter from './accounting-api';

// Custom HR/Employee & Attendance router from HEAD
import employeesRouter from './routes/employees';

app.use('/api/students', studentsRouter);
app.use('/api/admission', studentsRouter);
app.use('/api', paymentsRouter);
app.use('/api/users', usersRouter);
app.use('/api/auth', usersRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/purchasing', purchasingRouter);
app.use('/api/stage-fees', feesRouter);
app.use('/api/installments', installmentsRouter);
app.use('/api/database', databaseRouter);
app.use('/api', miscRouter);
app.use('/api', accountingRouter);
app.use('/api/user-roles', userRolesRouter);
app.use('/api/audit', auditLogRouter);
app.use('/api/migration', migrationRouter);
app.use('/api/grade-item-lists', gradeItemListsRouter);
app.use('/api/delivery-orders', deliveryOrdersRouter);
app.use('/api/distribution', distributionReportRouter);
app.use('/api/reports', reportsRouter);

// Mount HR/Employee Router
app.use('/api', employeesRouter);

// ===== Socket.IO Real-time User Presence =====
io.use(socketAuth);
const userSockets = new Map<string, { userId: string; socketId: string; connectTime: Date }>();

io.on('connection', (socket) => {
  const userId = socket.data.user.userId;
  console.log(`✅ New socket connection: ${socket.id} (user: ${userId})`);

  socket.on('user-login', async () => {
    try {
      userSockets.set(socket.id, { userId, socketId: socket.id, connectTime: new Date() });
      io.emit('user-status-changed', {
        userId,
        isOnline: true,
        lastLogoutAt: null
      });
    } catch (error) {
      console.error('❌ user-login error:', error);
    }
  });

  socket.on('heartbeat', () => {
    try {
      const existing = userSockets.get(socket.id);
      if (existing) {
        userSockets.set(socket.id, { ...existing, connectTime: new Date() });
      }
    } catch (error) {
      console.error('❌ heartbeat error:', error);
    }
  });

  socket.on('user-logout', async () => {
    try {
      userSockets.delete(socket.id);
      io.emit('user-status-changed', {
        userId,
        isOnline: false,
        lastLogoutAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ user-logout error:', error);
    }
  });

  socket.on('disconnect', () => {
    try {
      const user = userSockets.get(socket.id);
      if (user) {
        userSockets.delete(socket.id);
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

if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket ready on ws://localhost:${PORT}`);
    
    // Clean up temporary attendances and settings to match startup behavior in HEAD
    (async () => {
      try {
        console.log('[Database] 🧹 Cleaning attendance table for a fresh start...');
        const result = await prisma.attendance.deleteMany({});
        console.log(`[Database] ✅ Cleared ${result.count} records.`);
        
        console.log('[Database] ⏱️ Resetting device time offsets to 0...');
        const settingsCount = await prisma.deviceSetting.count();
        if (settingsCount > 0) {
          await prisma.deviceSetting.updateMany({
            data: { timeOffsetMinutes: 0 }
          });
        } else {
          await prisma.deviceSetting.create({
            data: { timeOffsetMinutes: 0 }
          });
        }
        console.log('[Database] ✅ Time offset reset successfully.');
      } catch (error: any) {
        console.error('[Database Error] ❌ Failed to clear attendance / settings:', error.message || error);
      }
    })();
  });
}
