import mongoose from 'mongoose';
import dotenv from 'dotenv';
import JobApplication from '../models/job-application.model';
import FollowUp from '../models/follow-up.model';

// Load environment variables
dotenv.config();

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/email_automation';

// Connect to MongoDB
const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for migration...');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Migrate timestamps for job applications
const migrateJobApplications = async (): Promise<void> => {
  try {
    console.log('Migrating job applications...');

    // Use the MongoDB driver directly for bulk operations
    const jobAppCollection = mongoose.connection.collection('job_applications');
    
    // Fetch all documents
    const allApplications = await jobAppCollection.find({}).toArray();
    console.log(`Found ${allApplications.length} job applications to migrate.`);
    
    let updateCount = 0;
    
    for (const app of allApplications) {
      const updates: any = {};
      const nestedUpdates: any = {};
      
      // Convert created_at to timestamp if it's a Date
      if (app.created_at instanceof Date) {
        updates.created_at = app.created_at.getTime();
      }
      
      // Convert updated_at to timestamp if it's a Date
      if (app.updated_at instanceof Date) {
        updates.updated_at = app.updated_at.getTime();
      }
      
      // Convert sent_at to timestamp if it's a Date
      if (app.sent_at instanceof Date) {
        updates.sent_at = app.sent_at.getTime();
      }
      
      // Convert follow-up settings dates
      if (app.follow_up_settings) {
        if (app.follow_up_settings.last_follow_up_date instanceof Date) {
          nestedUpdates['follow_up_settings.last_follow_up_date'] = app.follow_up_settings.last_follow_up_date.getTime();
        }
        
        if (app.follow_up_settings.next_follow_up_date instanceof Date) {
          nestedUpdates['follow_up_settings.next_follow_up_date'] = app.follow_up_settings.next_follow_up_date.getTime();
        }
      }
      
      // Update main fields if we have changes
      if (Object.keys(updates).length > 0) {
        await jobAppCollection.updateOne({ _id: app._id }, { $set: updates });
        updateCount++;
      }
      
      // Update nested fields in a separate operation
      if (Object.keys(nestedUpdates).length > 0) {
        await jobAppCollection.updateOne({ _id: app._id }, { $set: nestedUpdates });
        // Only increment if we haven't counted this document already
        if (Object.keys(updates).length === 0) {
          updateCount++;
        }
      }
    }
    
    console.log(`Successfully migrated ${updateCount} job applications.`);
  } catch (error) {
    console.error('Error migrating job applications:', error);
  }
};

// Migrate timestamps for follow-ups
const migrateFollowUps = async (): Promise<void> => {
  try {
    console.log('Migrating follow-ups...');

    // Use the MongoDB driver directly for bulk operations
    const followUpsCollection = mongoose.connection.collection('follow_ups');
    
    // Fetch all documents
    const allFollowUps = await followUpsCollection.find({}).toArray();
    console.log(`Found ${allFollowUps.length} follow-ups to migrate.`);
    
    let updateCount = 0;
    
    for (const followUp of allFollowUps) {
      const updates: any = {};
      
      // Convert created_at to timestamp if it's a Date
      if (followUp.created_at instanceof Date) {
        updates.created_at = followUp.created_at.getTime();
      }
      
      // Convert updated_at to timestamp if it's a Date
      if (followUp.updated_at instanceof Date) {
        updates.updated_at = followUp.updated_at.getTime();
      }
      
      // Add sent_at if missing but status is 'sent'
      if (followUp.status === 'sent' && !followUp.sent_at) {
        updates.sent_at = followUp.created_at instanceof Date 
          ? followUp.created_at.getTime() 
          : (typeof followUp.created_at === 'number' ? followUp.created_at : Date.now());
      } else if (followUp.sent_at instanceof Date) {
        updates.sent_at = followUp.sent_at.getTime();
      }
      
      // Update if we have changes
      if (Object.keys(updates).length > 0) {
        await followUpsCollection.updateOne({ _id: followUp._id }, { $set: updates });
        updateCount++;
      }
    }
    
    console.log(`Successfully migrated ${updateCount} follow-ups.`);
  } catch (error) {
    console.error('Error migrating follow-ups:', error);
  }
};

// Run the migration
const runMigration = async (): Promise<void> => {
  try {
    await connectDB();
    await migrateJobApplications();
    await migrateFollowUps();
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Start the migration
runMigration(); 