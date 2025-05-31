import mongoose, { Document, Schema } from 'mongoose';
import { DateUtils } from '../utils/date.utils';
import { schedulerConfig } from '../config/scheduler.config';

export interface IFollowUp extends Document {
  user: mongoose.Types.ObjectId;
  recipient_email: string;
  company: string | null;
  position: string | null;
  subject: string;
  content: string;
  original_application_id: mongoose.Types.ObjectId | null;
  status: 'draft' | 'sent' | 'failed' | 'responded';
  follow_up_number: number;
  created_at: number;
  updated_at: number;
  sent_at: number | null;
  timezone: string;
  getFormattedDates(): {
    created_at: string;
    updated_at: string;
    sent_at: string | null;
  };
}

const FollowUpSchema = new Schema<IFollowUp>({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  recipient_email: { type: String, required: true, index: true },
  company: { type: String },
  position: { type: String },
  subject: { type: String, required: true },
  content: { type: String, required: true },
  original_application_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'JobApplication',
    default: null
  },
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'failed', 'responded'],
    default: 'sent',
    index: true
  },
  follow_up_number: { type: Number, default: 1 },
  created_at: { 
    type: Number, 
    default: () => DateUtils.toUTCTimestamp(new Date())
  },
  updated_at: { 
    type: Number, 
    default: () => DateUtils.toUTCTimestamp(new Date())
  },
  sent_at: { type: Number, default: null },
  timezone: { 
    type: String, 
    default: schedulerConfig.timezone 
  }
}, {
  collection: 'follow_ups'
});

// Create indexes for better query performance
FollowUpSchema.index({ user: 1, original_application_id: 1 });
FollowUpSchema.index({ user: 1, created_at: -1 });
FollowUpSchema.index({ user: 1, updated_at: -1 });
FollowUpSchema.index({ user: 1, sent_at: -1 });

// Add validation for dates
FollowUpSchema.pre('validate', function(next) {
  const followUp = this;
  
  // Validate sent_at date if present
  if (followUp.sent_at) {
    try {
      const sentDate = new Date(followUp.sent_at);
      if (!DateUtils.isPastDate(sentDate, followUp.timezone)) {
        this.invalidate('sent_at', 'Sent date must be in the past');
      }
    } catch (error) {
      this.invalidate('sent_at', 'Invalid sent date');
    }
  }
  
  next();
});

// Add method to get formatted dates
FollowUpSchema.methods.getFormattedDates = function() {
  return {
    created_at: DateUtils.toISOString(this.created_at, this.timezone),
    updated_at: DateUtils.toISOString(this.updated_at, this.timezone),
    sent_at: this.sent_at ? DateUtils.toISOString(this.sent_at, this.timezone) : null
  };
};

export default mongoose.model<IFollowUp>('FollowUp', FollowUpSchema); 