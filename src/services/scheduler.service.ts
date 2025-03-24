import cron from 'node-cron';
import { Types } from 'mongoose';
import JobApplication from '../models/job-application.model';
import FollowUp from '../models/follow-up.model';
import emailService from './email.service';

/**
 * Service for scheduling and sending follow-up emails
 */
class SchedulerService {
  private scheduledTask: cron.ScheduledTask | null = null;
  
  /**
   * Start the scheduler
   */
  start(): void {
    // Run every day at 9 AM
    this.scheduledTask = cron.schedule('0 9 * * *', () => {
      this.processFollowUps().catch(err => {
        console.error('Error processing follow-ups:', err);
      });
    });
    
    console.log('Email scheduler started');
  }
  
  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      console.log('Email scheduler stopped');
    }
  }
  
  /**
   * Process due follow-ups
   */
  async processFollowUps(): Promise<void> {
    try {
      console.log('Processing follow-ups at', new Date().toISOString());
      
      // Find job applications due for follow-up
      const applications = await JobApplication.find({
        'follow_up_settings.next_follow_up_date': { $lte: new Date() },
        'follow_up_settings.follow_up_count': { 
          $lt: { $ifNull: ['$follow_up_settings.max_count', 1] } 
        },
        status: 'sent' // Only process applications that are sent but not responded
      });
      
      console.log(`Found ${applications.length} job applications due for follow-up`);
      
      // Process each application
      for (const application of applications) {
        await this.sendFollowUp(application);
      }
    } catch (error) {
      console.error('Error processing follow-ups:', error);
      throw error;
    }
  }
  
  /**
   * Send a follow-up for a specific application
   */
  private async sendFollowUp(application: any): Promise<void> {
    try {
      const {
        _id,
        recipient_email,
        company,
        position,
        subject,
        sent_at,
        follow_up_settings
      } = application;
      
      const followUpCount = follow_up_settings.follow_up_count + 1;
      
      // Generate follow-up subject
      const followUpSubject = `Re: ${subject}`;
      
      // Generate follow-up content based on template
      const content = this.generateFollowUpContent(
        company, 
        position, 
        followUpCount
      );
      
      // Send the follow-up email
      const result = await emailService.sendFollowUp(
        recipient_email,
        followUpSubject,
        content,
        {
          company: company || '',
          position: position || '',
          sentDate: sent_at || new Date()
        }
      );
      
      if (result) {
        console.log(`Follow-up email sent to ${recipient_email} for application ${_id}`);
        
        // Save follow-up record
        await FollowUp.create({
          recipient_email,
          subject: followUpSubject,
          content,
          company,
          position,
          original_application_id: new Types.ObjectId(_id),
          status: 'sent',
          follow_up_number: followUpCount
        });
        
        // Calculate next follow-up date
        const nextFollowUpDate = new Date();
        nextFollowUpDate.setDate(nextFollowUpDate.getDate() + follow_up_settings.interval_days);
        
        // Update job application
        await JobApplication.findByIdAndUpdate(_id, {
          $inc: { 'follow_up_settings.follow_up_count': 1 },
          $set: {
            'follow_up_settings.last_follow_up_date': new Date(),
            'follow_up_settings.next_follow_up_date': nextFollowUpDate,
            updated_at: new Date()
          }
        });
      } else {
        console.error(`Failed to send follow-up email to ${recipient_email}`);
      }
    } catch (error) {
      console.error('Error sending follow-up:', error);
      // Don't throw to avoid stopping the entire process for one failure
    }
  }
  
  /**
   * Generate follow-up content
   */
  private generateFollowUpContent(
    company: string,
    position: string,
    followUpCount: number
  ): string {
    const companyName = company || 'your company';
    const positionName = position || 'the position';
    
    if (followUpCount === 1) {
      return `
        <p>I hope this email finds you well. I wanted to follow up on my application for the ${positionName} role at ${companyName} that I submitted recently.</p>
        <p>I'm still very interested in the opportunity to join your team and contribute my skills and experience to ${companyName}.</p>
        <p>Please let me know if you need any additional information from me or if there are any updates regarding my application.</p>
        <p>Thank you for your time and consideration.</p>
      `;
    } else {
      return `
        <p>I hope you're doing well. I'm reaching out again regarding my application for the ${positionName} position at ${companyName}.</p>
        <p>I remain very enthusiastic about the opportunity to bring my experience and skills to your team. If there's any additional information I can provide to help with your decision-making process, please don't hesitate to ask.</p>
        <p>I look forward to hearing from you regarding the next steps in the application process.</p>
        <p>Thank you for your consideration.</p>
      `;
    }
  }
}

// Export as singleton
export default new SchedulerService(); 