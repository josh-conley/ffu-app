import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import leagueRoutes from './routes/league.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// CORS configuration
app.use(cors({
  origin: corsOrigin,
  credentials: false,
  methods: ['GET'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/leagues', leagueRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Security headers check endpoint
app.get('/security-check', (_req, res) => {
  res.json({
    cors: corsOrigin,
    rateLimit: isProduction ? '100 req/15min' : '1000 req/15min',
    environment: process.env.NODE_ENV || 'development',
    security: 'enabled'
  });
});

// Default route
app.get('/', (_req, res) => {
  res.json({ 
    message: 'FFU API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      leagues: '/api/leagues',
      standings: '/api/leagues/standings',
      history: '/api/leagues/history',
      leagueStandings: '/api/leagues/:league/:year',
      weekMatchups: '/api/leagues/:league/:year/:week'
    }
  });
});

// Global error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: isProduction ? 'Something went wrong' : err.message
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

app.listen(port, () => {
  console.log(`🚀 FFU API Server running at http://localhost:${port}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS Origin: ${corsOrigin}`);
  console.log(`⚡ Rate Limit: ${isProduction ? '100' : '1000'} req/15min`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET /health - Health check`);
  console.log(`   GET /security-check - Security configuration`);
  console.log(`   GET /api/leagues/standings - All league standings`);
  console.log(`   GET /api/leagues/history - Complete league history`);
  console.log(`   GET /api/leagues/:league/:year - Specific league standings`);
  console.log(`   GET /api/leagues/:league/:year/:week - Week matchups`);
});