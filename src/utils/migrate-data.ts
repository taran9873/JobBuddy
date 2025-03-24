import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import JobApplication from '../models/job-application.model';
import FollowUp from '../models/follow-up.model';
import connectDB from '../config/database';

// Load environment variables
dotenv.config();

/**
 * Script to migrate data from the Python backend to the Node.js backend
 */
async function migrateData(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Connected to MongoDB');
    
    // Temporary: Get data from source database
    // In a real migration, we might connect to both databases
    // For this example, we'll use a JSON export from the Python backend
    
    const pythonDataPath = path.join(__dirname, '..', '..', '..', 'backend', 'utils', 'db_export.json');
    
    // Check if export file exists
    if (!fs.existsSync(pythonDataPath)) {
      console.error('Migration data file not found. Please export data from Python backend first.');
      process.exit(1);
    }
    
    // Read and parse data
    const rawData = fs.readFileSync(pythonDataPath, 'utf8');
    const data = JSON.parse(rawData);
    
    // Migrate job applications
    if (data.job_applications && Array.isArray(data.job_applications)) {
      console.log(`Migrating ${data.job_applications.length} job applications...`);
      
      // Clear existing data if needed
      // await JobApplication.deleteMany({});
      
      const applicationPromises = data.job_applications.map(async (app: any) => {
        // Convert MongoDB ObjectId format
        const _id = new mongoose.Types.ObjectId(app._id?.$oid);
        
        // Convert dates
        const created_at = app.created_at?.$date ? new Date(app.created_at.$date) : new Date();
        const updated_at = app.updated_at?.$date ? new Date(app.updated_at.$date) : new Date();
        const sent_at = app.sent_at?.$date ? new Date(app.sent_at.$date) : null;
        
        // Convert follow-up settings
        const follow_up_settings = {
          type: app.follow_up_settings?.type || 'one_time',
          interval_days: app.follow_up_settings?.interval_days || 3,
          max_count: app.follow_up_settings?.max_count || 1,
          follow_up_count: app.follow_up_settings?.follow_up_count || 0,
          last_follow_up_date: app.follow_up_settings?.last_follow_up_date?.$date 
            ? new Date(app.follow_up_settings.last_follow_up_date.$date) 
            : null,
          next_follow_up_date: app.follow_up_settings?.next_follow_up_date?.$date 
            ? new Date(app.follow_up_settings.next_follow_up_date.$date) 
            : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
        };
        
        // Create new job application document
        return await JobApplication.create({
          _id,
          recipient_email: app.recipient_email,
          company: app.company || null,
          position: app.position || null,
          subject: app.subject,
          content: app.content,
          status: app.status || 'sent',
          attachment: app.attachment || null,
          follow_up_settings,
          full_name: app.full_name || null,
          portfolio_url: app.portfolio_url || null,
          linkedin_url: app.linkedin_url || null,
          created_at,
          updated_at,
          sent_at
        });
      });
      
      await Promise.all(applicationPromises);
      console.log('Job applications migration completed');
    }
    
    // Migrate follow-ups
    if (data.follow_ups && Array.isArray(data.follow_ups)) {
      console.log(`Migrating ${data.follow_ups.length} follow-ups...`);
      
      // Clear existing data if needed
      // await FollowUp.deleteMany({});
      
      const followUpPromises = data.follow_ups.map(async (followUp: any) => {
        // Convert MongoDB ObjectId format
        const _id = new mongoose.Types.ObjectId(followUp._id?.$oid);
        
        // Convert dates
        const sent_at = followUp.sent_at?.$date ? new Date(followUp.sent_at.$date) : new Date();
        const updated_at = followUp.updated_at?.$date ? new Date(followUp.updated_at.$date) : new Date();
        
        // Convert original application ID
        let original_application_id = null;
        if (followUp.original_application_id?.$oid) {
          original_application_id = new mongoose.Types.ObjectId(followUp.original_application_id.$oid);
        }
        
        // Create new follow-up document
        return await FollowUp.create({
          _id,
          recipient_email: followUp.recipient_email,
          company: followUp.company || null,
          position: followUp.position || null,
          subject: followUp.subject,
          content: followUp.content,
          original_application_id,
          status: followUp.status || 'sent',
          follow_up_number: followUp.follow_up_number || 1,
          sent_at,
          updated_at
        });
      });
      
      await Promise.all(followUpPromises);
      console.log('Follow-ups migration completed');
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration script error:', error);
      process.exit(1);
    });
}

export default migrateData; 