import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import passRoutes from './routes/passes';
import staffRoutes from './routes/staff';
import gymRoutes from './routes/gyms';
import adminRoutes from './routes/admin';
import publicRoutes from './routes/public';
import stripeRoutes from './routes/stripe';
import registrationRoutes from './routes/registration';
import { AppError } from './utils/errors';
import { tenantMiddleware } from './middleware/tenant';
import { authenticateToken } from './middleware/auth';
import { getRegistryDb } from './db/registry';
import { env } from './utils/env';

export function createApp() {
  const app = express();

  // Initialize registry DB on startup
  getRegistryDb();

  // CORS configuration - allow dev + prod origins
  const allowedOriginsEnv = env.CORS_ALLOWED_ORIGINS; // Comma-separated list
  const devOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8081',
    'http://localhost:19006',
    /^http:\/\/192\.168\.\d+\.\d+:19006$/,
    /^http:\/\/[a-z0-9-]+\.gympass\.local:5173$/,
    /^http:\/\/[a-z0-9-]+\.gympass\.local:4000$/,
    /^http:\/\/[a-z0-9-]+\.gym\.local:5173$/,
    /^http:\/\/[a-z0-9-]+\.gym\.local:4000$/,
  ];

  let allowedOrigins = devOrigins;
  
  // If production CORS origins specified, parse and add them
  if (allowedOriginsEnv) {
    const prodOrigins = allowedOriginsEnv.split(',').map(o => o.trim());
    allowedOrigins = [...devOrigins, ...prodOrigins];
  } else if (env.NODE_ENV === 'production' && env.TENANT_BASE_DOMAIN) {
    // Auto-add production domains if in production mode
    const baseDomain = env.TENANT_BASE_DOMAIN;
    const protocol = env.TENANT_PROTOCOL || 'https';
    allowedOrigins.push(
      `${protocol}://${baseDomain}`,
      new RegExp(`^${protocol}://[a-z0-9-]+\\.${baseDomain.replace('.', '\\.')}$`)
    );
  }

  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }));

  // Stripe webhook needs raw body for signature verification
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeRoutes);

  app.use(express.json());

  // Serve registration portal static files
  app.use('/register', express.static(path.join(__dirname, '../../registration-portal')));
  
  // Serve registration success/cancel pages
  app.get('/registration/success', (req, res) => {
    res.sendFile(path.join(__dirname, '../../registration-portal/success.html'));
  });
  
  app.get('/registration/cancel', (req, res) => {
    res.sendFile(path.join(__dirname, '../../registration-portal/cancel.html'));
  });

  // Platform admin routes (MUST come before tenant middleware)
  // These routes do NOT use tenant resolution
  // Note: /api/admin/login is public, other routes require auth (handled in adminRoutes)
  app.use('/api/admin', adminRoutes);

  // Public routes (no tenant resolution)
  app.use('/api/gyms', gymRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/stripe', stripeRoutes);
  app.use('/api/registration', registrationRoutes);

  // Tenant-aware routes (all other API routes)
  app.use('/api', tenantMiddleware);
  app.use('/api/auth', authRoutes);
  app.use('/api', passRoutes);
  app.use('/api/staff', staffRoutes);

  // Landing page
  app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GymGo SaaS</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      min-height: 100vh; 
      margin: 0; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container { 
      text-align: center; 
      background: rgba(255,255,255,0.1); 
      padding: 50px; 
      border-radius: 20px;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    h1 { margin-bottom: 20px; font-size: 3em; }
    p { margin-bottom: 30px; font-size: 1.2em; opacity: 0.9; }
    a { 
      display: inline-block;
      padding: 15px 40px; 
      background: white; 
      color: #667eea; 
      text-decoration: none; 
      border-radius: 30px; 
      font-weight: bold; 
      font-size: 1.1em;
      transition: transform 0.2s, box-shadow 0.2s;
      margin: 10px;
    }
    a:hover { 
      transform: translateY(-2px); 
      box-shadow: 0 5px 20px rgba(0,0,0,0.3);
    }
    .links { margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏋️ GymGo SaaS</h1>
    <p>Complete gym management system with multi-tenancy</p>
    <div class="links">
      <a href="/register">Register Your Gym</a>
    </div>
  </div>
</body>
</html>
    `);
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }

    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: err,
        },
      });
    }

    // Handle SQLite database errors
    if (err.name === 'SqliteError' || (err.message && err.message.includes('no such table'))) {
      console.error('Database error (full stack):', err);
      console.error('Stack trace:', err.stack);
      return res.status(500).json({
        error: {
          code: 'DATABASE_NOT_INITIALIZED',
          message: 'Database is not initialized. Please run migrations/seed or check DB path.',
        },
      });
    }

    // Log all unhandled errors with full stack trace
    console.error('Unhandled error (full stack):', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  });

  return app;
}
