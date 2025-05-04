import app from './app';
import connectDB from './config/database';
import dotenv from 'dotenv';
import { initializeDefaultTemplates } from './utils/default-templates';

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
    
    // Start Express server
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Access the API at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
