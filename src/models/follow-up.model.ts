import mongoose, { Document, Schema } from 'mongoose';

export interface IFollowUp extends Document {
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
}

const FollowUpSchema = new Schema<IFollowUp>({
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
  created_at: { type: Number, default: () => Date.now() },
  updated_at: { type: Number, default: () => Date.now() },
  sent_at: { type: Number, default: null }
}, {
  collection: 'follow_ups'
});

// Create indexes for better query performance
FollowUpSchema.index({ original_application_id: 1 });
FollowUpSchema.index({ created_at: -1 });
FollowUpSchema.index({ updated_at: -1 });
FollowUpSchema.index({ sent_at: -1 });

export default mongoose.model<IFollowUp>('FollowUp', FollowUpSchema); 