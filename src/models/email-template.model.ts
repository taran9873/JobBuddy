import mongoose, { Document, Schema } from 'mongoose';

export enum EmailTemplateType {
  JOB_APPLICATION = 'job_application',
  FOLLOW_UP = 'follow_up'
}

export interface IEmailTemplate extends Document {
  name: string;
  type: EmailTemplateType;
  subject: string;
  body: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const emailTemplateSchema = new Schema<IEmailTemplate>(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [100, 'Template name cannot exceed 100 characters']
    },
    type: {
      type: String,
      enum: Object.values(EmailTemplateType),
      required: [true, 'Template type is required']
    },
    subject: {
      type: String,
      required: [true, 'Email subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters']
    },
    body: {
      type: String,
      required: [true, 'Email body is required'],
      trim: true
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for faster querying
emailTemplateSchema.index({ type: 1 });
emailTemplateSchema.index({ isDefault: 1 });

// Ensure there's only one default template per type
emailTemplateSchema.pre('save', async function(next) {
  if (this.isDefault) {
    // Find and unset any other default templates of the same type
    await this.model('EmailTemplate').updateMany(
      { type: this.type, _id: { $ne: this._id }, isDefault: true },
      { isDefault: false }
    );
  }
  next();
});

const EmailTemplate = mongoose.model<IEmailTemplate>('EmailTemplate', emailTemplateSchema);

export default EmailTemplate; 