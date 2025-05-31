import { Types } from 'mongoose';
import JobApplication from '../models/job-application.model';
import FollowUp from '../models/follow-up.model';
import emailService from './email.service';
import { schedulerConfig } from '../config/scheduler.config';
import { DateUtils } from '../utils/date.utils';

/**
 * Service for scheduling and sending follow-up emails
 */
class SchedulerService {
  private poller: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastRunTime: Date | null = null;
  private errorCount: number = 0;
  private retryCount: number = 0;
  private startupAttempts: number = 0;
  private readonly maxStartupAttempts: number = 3;
  private readonly startupRetryDelay: number = 5000; // 5 seconds
  
  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    try {
      if (this.isRunning) {
        this.log('warn', 'Scheduler is already running');
        return;
      }

      // Start polling every pollIntervalMs
      this.poller = setInterval(() => {
        this.processFollowUps();
      }, schedulerConfig.pollIntervalMs);
      this.isRunning = true;
      this.startupAttempts = 0;
      this.log('info', `Email scheduler started. Polling every ${schedulerConfig.pollIntervalMs / 1000} seconds`);
    } catch (error) {
      this.startupAttempts++;
      this.log('error', `Failed to start scheduler (Attempt ${this.startupAttempts}/${this.maxStartupAttempts})`, error);
      
      if (this.startupAttempts < this.maxStartupAttempts) {
        this.log('info', `Retrying scheduler startup in ${this.startupRetryDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, this.startupRetryDelay));
        return this.start();
      }
      
      throw new Error(`Failed to start scheduler after ${this.maxStartupAttempts} attempts`);
    }
  }
  
  /**
   * Stop the scheduler
   */
  async stop(): Promise<void> {
    try {
      if (!this.isRunning) {
        this.log('warn', 'Scheduler is not running');
        return;
      }

      if (this.poller) {
        clearInterval(this.poller);
        this.poller = null;
      }
      
      this.isRunning = false;
      this.log('info', 'Email scheduler stopped');
    } catch (error) {
      this.log('error', 'Failed to stop scheduler', error);
      throw error;
    }
  }

  /**
   * Restart the scheduler
   */
  async restart(): Promise<void> {
    try {
      this.log('info', 'Restarting scheduler...');
      await this.stop();
      await this.start();
      this.log('info', 'Scheduler restarted successfully');
    } catch (error) {
      this.log('error', 'Failed to restart scheduler', error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    lastRunTime: Date | null;
    errorCount: number;
    retryCount: number;
    startupAttempts: number;
    nextRunTime: Date | null;
    health: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const now = new Date();
    // Next run time is now + pollIntervalMs
    const nextRunTime = new Date(now.getTime() + schedulerConfig.pollIntervalMs);
    
    // Determine health status
    let health: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (this.errorCount > 0) {
      health = this.errorCount > schedulerConfig.health.unhealthyThreshold 
        ? 'unhealthy' 
        : this.errorCount > schedulerConfig.health.degradedThreshold 
          ? 'degraded' 
          : 'healthy';
    }
    
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      errorCount: this.errorCount,
      retryCount: this.retryCount,
      startupAttempts: this.startupAttempts,
      nextRunTime,
      health
    };
  }
  
  /**
   * Process due follow-ups
   */
  async processFollowUps(): Promise<void> {
    try {
      this.lastRunTime = new Date();
      this.log('info', `Processing follow-ups at ${DateUtils.toISOString(this.lastRunTime, schedulerConfig.timezone)}`);
      
      // Find job applications due for follow-up
      const applications = await JobApplication.find({
        'follow_up_settings.next_follow_up_date': { 
          $lte: DateUtils.toUTCTimestamp(new Date())
        },
        $expr: {
          $lt: [
            '$follow_up_settings.follow_up_count',
            { $ifNull: ['$follow_up_settings.max_count', 1] }
          ]
        },
        status: 'sent' // Only process applications that are sent but not responded
      }).limit(schedulerConfig.performance.batchSize);
      
      this.log('info', `Found ${applications.length} job applications due for follow-up`);
      // Log details of each application due for follow-up
      applications.forEach(app => {
        this.log('info', `Due follow-up: recipient=${app.recipient_email}, company=${app.company}, position=${app.position}, next_follow_up_date=${app.follow_up_settings?.next_follow_up_date}`);
      });
      
      // Process each application
      for (const application of applications) {
        try {
          await this.sendFollowUp(application);
        } catch (error) {
          this.errorCount++;
          this.log('error', `Failed to process follow-up for application ${application._id}`, error);
          
          // Implement retry logic with exponential backoff
          if (this.retryCount < schedulerConfig.retry.maxAttempts) {
            this.retryCount++;
            const delayMinutes = Math.min(
              schedulerConfig.retry.delayMinutes * Math.pow(schedulerConfig.retry.backoffFactor, this.retryCount - 1),
              schedulerConfig.retry.maxDelayMinutes
            );
            
            this.log('info', `Retrying follow-up for application ${application._id} (Attempt ${this.retryCount}, delay: ${delayMinutes} minutes)`);
            await new Promise(resolve => setTimeout(resolve, delayMinutes * 60 * 1000));
            await this.sendFollowUp(application);
          }
        }
      }
      
      // Reset error and retry counts on successful run
      this.errorCount = 0;
      this.retryCount = 0;
    } catch (error) {
      this.errorCount++;
      this.log('error', 'Error processing follow-ups', error);
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
          sentDate: sent_at ? new Date(sent_at) : new Date()
        }
      );
      
      if (result) {
        this.log('info', `Follow-up email sent to ${recipient_email} for application ${_id}`);
        
        // Save follow-up record
        await FollowUp.create({
          user: application.user,
          recipient_email,
          subject: followUpSubject,
          content,
          company,
          position,
          original_application_id: new Types.ObjectId(_id),
          status: 'sent',
          follow_up_number: followUpCount
        });
        
        // Calculate next follow-up date using the application's timezone
        const nextFollowUpDate = DateUtils.calculateNextFollowUpDate(
          new Date(),
          follow_up_settings.interval_days,
          follow_up_settings.timezone
        );
        
        // Update job application
        await JobApplication.findByIdAndUpdate(_id, {
          $inc: { 'follow_up_settings.follow_up_count': 1 },
          $set: {
            'follow_up_settings.last_follow_up_date': DateUtils.toUTCTimestamp(new Date()),
            'follow_up_settings.next_follow_up_date': DateUtils.toUTCTimestamp(nextFollowUpDate),
            updated_at: DateUtils.toUTCTimestamp(new Date())
          }
        });
      } else {
        throw new Error(`Failed to send follow-up email to ${recipient_email}`);
      }
    } catch (error) {
      this.log('error', `Error sending follow-up for application ${application._id}`, error);
      throw error;
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

  /**
   * Log messages with proper formatting
   */
  private log(level: 'info' | 'warn' | 'error', message: string, error?: any): void {
    if (!schedulerConfig.logging.enabled) return;

    const timestamp = DateUtils.toISOString(new Date(), schedulerConfig.timezone);
    const logMessage = `[Scheduler] [${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    switch (level) {
      case 'info':
        console.log(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage, error ? '\n' + error.stack : '');
        break;
    }
  }
}

// Export as singleton
export default new SchedulerService();