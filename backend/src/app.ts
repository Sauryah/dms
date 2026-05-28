import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './lib/swagger';
import machineRoutes from './routes/machineRoutes';
import setRoutes from './routes/setRoutes';
import dieRoutes from './routes/dieRoutes';
import searchRoutes from './routes/searchRoutes';
import authRoutes from './routes/authRoutes';
import auditRoutes from './routes/auditRoutes';
import devRoutes from './routes/devRoutes';
import { prismaErrorHandler } from './middleware/prismaErrorHandler';
import { apiLimiter } from './middleware/rateLimiter';

dotenv.config();

const app = express();

// Set security headers using Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Restrict CORS origins to support secure HttpOnly credentials sharing
app.use(cors({
  origin: (origin, callback) => {
    if (process.env.NODE_ENV === 'production') {
      const allowed = process.env.FRONTEND_URL || 'http://localhost';
      callback(null, origin === allowed ? true : false);
    } else {
      // Echo the requesting host origin dynamically in dev to allow cookie sharing
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ status: 'ok' });
});

app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/sets', setRoutes);
app.use('/api/dies', dieRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/dev', devRoutes);

// Global Error Handler
app.use(prismaErrorHandler);

export default app;
