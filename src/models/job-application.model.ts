import mongoose, { Document, Schema } from 'mongoose';

// Define interfaces
export interface IFollowUpSettings {
  type: 'one_time' | 'periodic_limited' | 'until_response';
  interval_days: number;
  max_count: number;
  follow_up_count: number;
  last_follow_up_date: number | null;
  next_follow_up_date: number;
}

export interface IJobApplication extends Document {
  user: mongoose.Types.ObjectId;
  recipient_email: string;
  company: string;
  position: string;
  subject: string;
  content: string;
  status: 'draft' | 'sent' | 'responded' | 'rejected' | 'accepted' | 'processing' | 'failed';
  attachment_path: string | null;
  follow_up_settings: IFollowUpSettings;
  full_name: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  created_at: number;
  updated_at: number;
  sent_at: number | null;
}

// Define the follow-up settings schema
const FollowUpSettingsSchema = new Schema<IFollowUpSettings>({
  type: { 
    type: String, 
    enum: ['one_time', 'periodic_limited', 'until_response'],
    default: 'one_time' 
  },
  interval_days: { type: Number, default: 3 },
  max_count: { type: Number, default: 1 },
  follow_up_count: { type: Number, default: 0 },
  last_follow_up_date: { type: Number, default: null },
  next_follow_up_date: { 
    type: Number, 
    default: function() {
      return Date.now() + 3 * 24 * 60 * 60 * 1000; // 3 days from now
    }
  }
});

// Define the job application schema
const JobApplicationSchema = new Schema<IJobApplication>({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  recipient_email: { type: String, required: true, index: true },
  company: { type: String, index: true },
  position: { type: String },
  subject: { type: String, required: true },
  content: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'responded', 'rejected', 'accepted', 'processing', 'failed'],
    default: 'sent',
    index: true
  },
  attachment_path: { type: String, default: null },
  follow_up_settings: { 
    type: FollowUpSettingsSchema, 
    default: () => ({}) 
  },
  full_name: { type: String },
  portfolio_url: { type: String },
  linkedin_url: { type: String },
  created_at: { type: Number, default: () => Date.now() },
  updated_at: { type: Number, default: () => Date.now() },
  sent_at: { type: Number, default: null }
}, {
  collection: 'job_applications'
});

// Create indexes for better query performance
JobApplicationSchema.index({ user: 1, created_at: -1 });
JobApplicationSchema.index({ user: 1, updated_at: -1 });
JobApplicationSchema.index({ user: 1, sent_at: -1 });

// Create and export the model
export default mongoose.model<IJobApplication>('JobApplication', JobApplicationSchema); 