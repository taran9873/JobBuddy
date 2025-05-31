import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import cron from 'node-cron';
import schedulerService from '../scheduler.service';
import JobApplication from '../../models/job-application.model';
import FollowUp from '../../models/follow-up.model';
import { DateUtils } from '../../utils/date.utils';
import { schedulerConfig } from '../../config/scheduler.config';

jest.setTimeout(30000);

let mongoServer: MongoMemoryServer;

// Mock email service
jest.mock('../email.service', () => ({
  sendFollowUp: jest.fn().mockResolvedValue(true)
}));

describe('SchedulerService', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await JobApplication.deleteMany({});
    await FollowUp.deleteMany({});
    jest.clearAllMocks();
  });

  describe('start', () => {
    it('should start scheduler successfully', async () => {
      await schedulerService.start();
      const status = schedulerService.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should not start scheduler if already running', async () => {
      await schedulerService.start();
      const firstStatus = schedulerService.getStatus();
      await schedulerService.start();
      const secondStatus = schedulerService.getStatus();
      expect(firstStatus.isRunning).toBe(secondStatus.isRunning);
    });
  });

  describe('stop', () => {
    it('should stop scheduler successfully', async () => {
      await schedulerService.start();
      await schedulerService.stop();
      const status = schedulerService.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should handle stop when scheduler is not running', async () => {
      await schedulerService.stop();
      const status = schedulerService.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('restart', () => {
    it('should restart scheduler successfully', async () => {
      await schedulerService.start();
      const firstStatus = schedulerService.getStatus();
      await schedulerService.restart();
      const secondStatus = schedulerService.getStatus();
      expect(firstStatus.isRunning).toBe(secondStatus.isRunning);
    });
  });

  describe('getStatus', () => {
    it('should return correct status information', async () => {
      await schedulerService.start();
      const status = schedulerService.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('lastRunTime');
      expect(status).toHaveProperty('errorCount');
      expect(status).toHaveProperty('retryCount');
      expect(status).toHaveProperty('startupAttempts');
      expect(status).toHaveProperty('nextRunTime');
      expect(status).toHaveProperty('health');
    });

    it('should calculate next run time correctly', async () => {
      const status = schedulerService.getStatus();
      const [hours, minutes] = schedulerConfig.scheduleTime.split(':').map(Number);
      
      expect(status.nextRunTime).toBeInstanceOf(Date);
      expect(status.nextRunTime?.getHours()).toBe(hours);
      expect(status.nextRunTime?.getMinutes()).toBe(minutes);
    });
  });

  describe('processFollowUps', () => {
    it('should process due follow-ups', async () => {
      // Create a job application due for follow-up
      const application = await JobApplication.create({
        user: new mongoose.Types.ObjectId(),
        recipient_email: 'test@example.com',
        company: 'Test Company',
        position: 'Test Position',
        subject: 'Test Subject',
        content: 'Test Content',
        status: 'sent',
        follow_up_settings: {
          next_follow_up_date: DateUtils.toUTCTimestamp(new Date()),
          follow_up_count: 0,
          max_count: 3
        }
      });

      // Process follow-ups
      await schedulerService.processFollowUps();

      // Verify follow-up was created
      const followUp = await FollowUp.findOne({
        original_application_id: application._id
      });

      expect(followUp).toBeDefined();
      expect(followUp?.status).toBe('sent');
      expect(followUp?.follow_up_number).toBe(1);

      // Verify application was updated
      const updatedApplication = await JobApplication.findById(application._id);
      expect(updatedApplication?.follow_up_settings.follow_up_count).toBe(1);
      expect(updatedApplication?.follow_up_settings.last_follow_up_date).toBeDefined();
      expect(updatedApplication?.follow_up_settings.next_follow_up_date).toBeGreaterThan(
        application.follow_up_settings.next_follow_up_date
      );
    });

    it('should handle errors gracefully', async () => {
      // Create an invalid job application
      const application = await JobApplication.create({
        user: new mongoose.Types.ObjectId(),
        recipient_email: 'invalid-email',
        company: 'Test Company',
        position: 'Test Position',
        subject: 'Test Subject',
        content: 'Test Content',
        status: 'sent',
        follow_up_settings: {
          next_follow_up_date: DateUtils.toUTCTimestamp(new Date()),
          follow_up_count: 0,
          max_count: 3
        }
      });

      // Process follow-ups
      await schedulerService.processFollowUps();

      // Verify error count increased
      const status = schedulerService.getStatus();
      expect(status.errorCount).toBeGreaterThan(0);
    });

    it('should respect batch size limit', async () => {
      // Create multiple job applications
      const applications = await Promise.all(
        Array(schedulerConfig.performance.batchSize + 5)
          .fill(null)
          .map(() => JobApplication.create({
            user: new mongoose.Types.ObjectId(),
            recipient_email: 'test@example.com',
            company: 'Test Company',
            position: 'Test Position',
            subject: 'Test Subject',
            content: 'Test Content',
            status: 'sent',
            follow_up_settings: {
              next_follow_up_date: DateUtils.toUTCTimestamp(new Date()),
              follow_up_count: 0,
              max_count: 3
            }
          }))
      );

      // Process follow-ups
      await schedulerService.processFollowUps();

      // Verify only batch size number of follow-ups were created
      const followUps = await FollowUp.find();
      expect(followUps.length).toBeLessThanOrEqual(schedulerConfig.performance.batchSize);
    });
  });
}); 