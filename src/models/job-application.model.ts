import mongoose, { Document, Schema } from 'mongoose';
import { DateUtils } from '../utils/date.utils';
import { schedulerConfig } from '../config/scheduler.config';

// Define interfaces
export interface IFollowUpSettings {
  type: 'one_time' | 'periodic_limited' | 'until_response';
  interval_days: number;
  max_count: number;
  follow_up_count: number;
  last_follow_up_date: number | null;
  next_follow_up_date: number;
  timezone: string;
  calculateNextFollowUpDate(): number;
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
    default: null
  },
  timezone: { 
    type: String, 
    default: schedulerConfig.timezone 
  }
});

// Add pre-save middleware to set next_follow_up_date
FollowUpSettingsSchema.pre('save', function(next) {
  if (!this.next_follow_up_date) {
    this.next_follow_up_date = DateUtils.calculateNextFollowUpDate(
      new Date(),
      this.interval_days,
      this.timezone
    ).getTime();
  }
  next();
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
JobApplicationSchema.index({ 'follow_up_settings.next_follow_up_date': 1 });

// Add validation for follow-up settings
FollowUpSettingsSchema.pre('validate', function(next) {
  const settings = this;
  
  // Validate interval days
  if (settings.interval_days < 1) {
    this.invalidate('interval_days', 'Interval days must be at least 1');
  }
  
  // Validate max count
  if (settings.max_count < 1) {
    this.invalidate('max_count', 'Max count must be at least 1');
  }
  
  // Validate follow-up count
  if (settings.follow_up_count < 0) {
    this.invalidate('follow_up_count', 'Follow-up count cannot be negative');
  }
  
  // Validate next follow-up date
  if (settings.next_follow_up_date) {
    try {
      const nextDate = new Date(settings.next_follow_up_date);
      if (!DateUtils.isFutureDate(nextDate, settings.timezone)) {
        this.invalidate('next_follow_up_date', 'Next follow-up date must be in the future');
      }
    } catch (error) {
      this.invalidate('next_follow_up_date', 'Invalid next follow-up date');
    }
  }
  
  next();
});

// Add method to calculate next follow-up date
FollowUpSettingsSchema.methods.calculateNextFollowUpDate = function(): number {
  const now = new Date();
  return DateUtils.calculateNextFollowUpDate(
    now,
    this.interval_days,
    this.timezone
  ).getTime();
};

// Create and export the model
export default mongoose.model<IJobApplication>('JobApplication', JobApplicationSchema); 