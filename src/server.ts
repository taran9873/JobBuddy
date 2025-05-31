import app from './app';
import connectDB from './config/database';
import dotenv from 'dotenv';
import { initializeDefaultTemplates } from './utils/default-templates';
import schedulerService from './services/scheduler.service';

// Load environment variables
dotenv.config();

// Set port
const port = process.env.PORT || 8081;

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Initialize default email templates
    await initializeDefaultTemplates();
    
    // Start the scheduler service
    try {
      await schedulerService.start();
      console.log('Scheduler service started successfully');
    } catch (error) {
      console.error('Failed to start scheduler service:', error);
      // Don't exit the process, but log the error and set up health check endpoint
      app.get('/health/scheduler', (req, res) => {
        const status = schedulerService.getStatus();
        res.status(status.health === 'unhealthy' ? 503 : 200).json({
          success: status.health !== 'unhealthy',
          data: status
        });
      });
    }
    
    // Start Express server
    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Access the API at http://localhost:${port}`);
    });

    // Handle graceful shutdown
    const gracefulShutdown = async () => {
      console.log('Received shutdown signal. Starting graceful shutdown...');
      
      // Stop accepting new connections
      server.close(() => {
        console.log('HTTP server closed');
      });
      
      // Stop the scheduler
      try {
        await schedulerService.stop();
        console.log('Scheduler service stopped');
      } catch (error) {
        console.error('Error stopping scheduler service:', error);
      }
      
      // Close the process
      process.exit(0);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
