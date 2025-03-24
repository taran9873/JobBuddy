import app from './app';
import connectDB from './config/database';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set port
const port = process.env.PORT || 3000;

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
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
