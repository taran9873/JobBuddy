import EmailTemplate, { EmailTemplateType } from '../models/email-template.model';

// Default job application template
const defaultJobApplicationTemplate = {
  name: 'Default Job Application Template',
  type: EmailTemplateType.JOB_APPLICATION,
  subject: 'Application for {position} at {company}',
  body: `Dear {recipientName},

I am writing to express my interest in the {position} position at {company}. With my background in {skill}, I believe I would be a great fit for this role.

{customMessage}

I have attached my resume for your review. I look forward to the opportunity to discuss how my skills and experiences align with your needs.

Best regards,
{senderName}`,
  isDefault: true
};

// Default follow-up template
const defaultFollowUpTemplate = {
  name: 'Default Follow-up Template',
  type: EmailTemplateType.FOLLOW_UP,
  subject: 'Following up on my {position} application at {company}',
  body: `Dear {recipientName},

I hope this email finds you well. I am writing to follow up on my application for the {position} position that I submitted on {applicationDate}.

I remain very interested in this opportunity and would appreciate any update you can provide regarding the status of my application.

Thank you for your time and consideration.

Best regards,
{senderName}`,
  isDefault: true
};

/**
 * Initialize default email templates if they don't exist
 */
export const initializeDefaultTemplates = async (): Promise<void> => {
  try {
    console.log('Initializing default email templates...');
    
    // Check for default job application template
    const existingJobApplicationTemplate = await EmailTemplate.findOne({
      type: EmailTemplateType.JOB_APPLICATION,
      isDefault: true
    });
    
    if (!existingJobApplicationTemplate) {
      console.log('Creating default job application template...');
      await EmailTemplate.create(defaultJobApplicationTemplate);
    }
    
    // Check for default follow-up template
    const existingFollowUpTemplate = await EmailTemplate.findOne({
      type: EmailTemplateType.FOLLOW_UP,
      isDefault: true
    });
    
    if (!existingFollowUpTemplate) {
      console.log('Creating default follow-up template...');
      await EmailTemplate.create(defaultFollowUpTemplate);
    }
    
    console.log('Default email templates initialization complete.');
  } catch (error) {
    console.error('Error initializing default templates:', error);
  }
}; 