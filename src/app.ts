import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { json, urlencoded } from 'express';
import jobApplicationRoutes from './routes/job-application.route';
import followUpRoutes from './routes/follow-up.route';
import emailRoutes from './routes/email.route';
import emailTemplateRoutes from './routes/email-template.routes';
import { errorHandler, notFound } from './middleware/error.middleware';
import mongoose from 'mongoose';
import userRoutes from './routes/user.routes';

// Load environment variables
dotenv.config();

// Initialize express app
const app: Express = express();

// Parse CORS origins from environment variable
const corsOrigins = process.env.CORS_ORIGIN ? 
  process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
  ['*'];

// Explicitly add localhost:8081 if not already in the list
if (!corsOrigins.includes('http://localhost:8081')) {
  corsOrigins.push('http://localhost:8081');
}

// Log CORS configuration for debugging
console.log('CORS Origins:', corsOrigins);

// Middleware
app.use(helmet()); // Secure HTTP headers
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Check if the origin is allowed
    if (corsOrigins.includes('*') || corsOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS policy. Allowed origins:`, corsOrigins);
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(json()); // Parse JSON request body
app.use(urlencoded({ extended: true })); // Parse URL-encoded request body

// Routes
app.use('/api/applications', jobApplicationRoutes);
app.use('/api/followups', followUpRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api', emailRoutes);
app.use('/api/users', userRoutes);

// Health check route
app.get('/api/health', async (req: Request, res: Response) => {
  let dbStatus = 'unknown';
  let isDbConnected = false;
  
  try {
    // Check MongoDB connection status
    const dbState = mongoose.connection.readyState;
    switch (dbState) {
      case 0:
        dbStatus = 'disconnected';
        break;
      case 1:
        dbStatus = 'connected';
        isDbConnected = true;
        break;
      case 2:
        dbStatus = 'connecting';
        break;
      case 3:
        dbStatus = 'disconnecting';
        break;
      default:
        dbStatus = 'unknown';
    }
    
    // If we're still connecting, give it a moment to complete
    if (dbState === 2) {
      // Wait for connection to complete or timeout
      const connectionTimeout = 1000; // 1 second timeout
      await Promise.race([
        new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (mongoose.connection.readyState === 1) {
              clearInterval(checkInterval);
              dbStatus = 'connected';
              isDbConnected = true;
              resolve();
            }
          }, 100);
        }),
        new Promise<void>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Database connection timeout'));
          }, connectionTimeout);
        }).catch(() => {
          // Timeout occurred, but we'll still return what we have
          console.log('Database connection check timed out');
        })
      ]);
    }
    
    // Always return 200 for health check, but include detailed status
    // Frontend will determine if the status is acceptable
    res.status(200).json({
      status: 'success',
      db_status: dbStatus,
      message: 'API is running',
      time: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    // Still return 200 but with warning status
    res.status(200).json({
      status: 'warning',
      db_status: 'error',
      message: 'API is running but database status check failed',
      time: new Date().toISOString()
    });
  }
});

// Extra routes needed by frontend
app.get('/api/due-followups', (req: Request, res: Response, next: NextFunction) => {
  req.url = '/api/followups/due';
  app._router.handle(req, res, next);
});

app.get('/api/drafts', (req: Request, res: Response, next: NextFunction) => {
  req.url = '/api/applications/drafts';
  app._router.handle(req, res, next);
});

// Debug endpoint to list all available routes
app.get('/api/debug/routes', (req: Request, res: Response) => {
  const routes: {path: string, methods: string[]}[] = [];
  
  function print(path: string, layer: any) {
    if (layer.route) {
      layer.route.stack.forEach((item: any) => {
        const methods = Object.keys(item.route.methods).map(m => m.toUpperCase());
        routes.push({
          path: path + layer.route.path,
          methods
        });
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      layer.handle.stack.forEach((item: any) => {
        print(path + item.route?.path || '', item);
      });
    }
  }
  
  app._router.stack.forEach((item: any) => {
    if (item.route) {
      const methods = Object.keys(item.route.methods).map(m => m.toUpperCase());
      routes.push({
        path: item.route.path,
        methods
      });
    } else if (item.name === 'router' && item.handle.stack) {
      item.handle.stack.forEach((routeItem: any) => {
        if (routeItem.route) {
          const methods = Object.keys(routeItem.route.methods).map(m => m.toUpperCase());
          if (item.regexp) {
            const path = item.regexp.toString().replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/').replace(/\^/g, '').replace(/\$/g, '');
            routes.push({
              path: path.replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param') + routeItem.route.path,
              methods
            });
          }
        }
      });
    }
  });
  
  res.status(200).json({
    status: 'success',
    routes: routes.sort((a, b) => a.path.localeCompare(b.path))
  });
});

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

export default app;
