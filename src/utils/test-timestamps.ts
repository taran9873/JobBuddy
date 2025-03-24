import mongoose from 'mongoose';
import dotenv from 'dotenv';
import JobApplication from '../models/job-application.model';

// Load environment variables
dotenv.config();

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/email_automation';

// Connect to MongoDB
const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for testing...');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const testTimestamps = async (): Promise<void> => {
  try {
    // Create test data
    const now = Date.now();
    
    // Create 5 test applications with different timestamps
    const app1 = await JobApplication.create({
      recipient_email: 'test1@example.com',
      subject: 'Test Subject 1',
      content: 'Test Content 1',
      company: 'Test Company',
      position: 'Test Position',
      status: 'sent',
      created_at: now - 500000, // 8.3 minutes ago
      updated_at: now - 400000, // 6.7 minutes ago
      sent_at: now - 450000     // 7.5 minutes ago
    });
    
    const app2 = await JobApplication.create({
      recipient_email: 'test2@example.com',
      subject: 'Test Subject 2',
      content: 'Test Content 2',
      company: 'Test Company',
      position: 'Test Position',
      status: 'sent',
      created_at: now - 300000, // 5 minutes ago
      updated_at: now - 200000, // 3.3 minutes ago
      sent_at: now - 250000     // 4.2 minutes ago
    });
    
    const app3 = await JobApplication.create({
      recipient_email: 'test3@example.com',
      subject: 'Test Subject 3',
      content: 'Test Content 3',
      company: 'Test Company',
      position: 'Test Position',
      status: 'sent',
      created_at: now - 200000, // 3.3 minutes ago
      updated_at: now - 150000, // 2.5 minutes ago
      sent_at: now - 175000     // 2.9 minutes ago
    });
    
    const app4 = await JobApplication.create({
      recipient_email: 'test4@example.com',
      subject: 'Test Subject 4',
      content: 'Test Content 4',
      company: 'Test Company',
      position: 'Test Position',
      status: 'sent',
      created_at: now - 100000, // 1.7 minutes ago
      updated_at: now - 50000,  // 0.8 minutes ago
      sent_at: now - 75000      // 1.25 minutes ago
    });
    
    const app5 = await JobApplication.create({
      recipient_email: 'test5@example.com',
      subject: 'Test Subject 5',
      content: 'Test Content 5',
      company: 'Test Company',
      position: 'Test Position',
      status: 'sent',
      created_at: now - 50000,  // 0.8 minutes ago
      updated_at: now,          // now
      sent_at: now - 25000      // 0.4 minutes ago
    });
    
    console.log('Created test data successfully.');
    
    // Test sorting by updated_at (descending)
    console.log('\nSorting by updated_at (descending):');
    const resultsByUpdatedAt = await JobApplication.find({
      recipient_email: { $regex: /^test\d@example\.com$/ }
    }).sort({ updated_at: -1 });
    
    resultsByUpdatedAt.forEach((app, index) => {
      console.log(`${index + 1}. ${app.recipient_email} - updated ${new Date(app.updated_at).toISOString()}`);
    });
    
    // Test sorting by created_at (descending)
    console.log('\nSorting by created_at (descending):');
    const resultsByCreatedAt = await JobApplication.find({
      recipient_email: { $regex: /^test\d@example\.com$/ }
    }).sort({ created_at: -1 });
    
    resultsByCreatedAt.forEach((app, index) => {
      console.log(`${index + 1}. ${app.recipient_email} - created ${new Date(app.created_at).toISOString()}`);
    });
    
    // Test sorting by sent_at (descending)
    console.log('\nSorting by sent_at (descending):');
    const resultsBySentAt = await JobApplication.find({
      recipient_email: { $regex: /^test\d@example\.com$/ }
    }).sort({ sent_at: -1 });
    
    resultsBySentAt.forEach((app, index) => {
      console.log(`${index + 1}. ${app.recipient_email} - sent ${app.sent_at ? new Date(app.sent_at).toISOString() : 'N/A'}`);
    });
    
    // Clean up test data
    await JobApplication.deleteMany({
      recipient_email: { $regex: /^test\d@example\.com$/ }
    });
    
    console.log('\nTest data cleaned up successfully.');
    
  } catch (error) {
    console.error('Error testing timestamps:', error);
  }
};

const runTest = async (): Promise<void> => {
  try {
    await connectDB();
    await testTimestamps();
    console.log('Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
};

// Start the test
runTest(); 