import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import JobApplication, { IFollowUpSettings } from '../job-application.model';
import { DateUtils } from '../../utils/date.utils';
import { schedulerConfig } from '../../config/scheduler.config';

jest.setTimeout(30000);

let mongoServer: MongoMemoryServer;

describe('JobApplication Model', () => {
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
  });

  describe('FollowUpSettings', () => {
    it('should create job application with default follow-up settings', async () => {
      const application = await JobApplication.create({
        user: new mongoose.Types.ObjectId(),
        recipient_email: 'test@example.com',
        company: 'Test Company',
        position: 'Test Position',
        subject: 'Test Subject',
        content: 'Test Content'
      });

      expect(application.follow_up_settings).toBeDefined();
      expect(application.follow_up_settings.type).toBe('one_time');
      expect(application.follow_up_settings.interval_days).toBe(3);
      expect(application.follow_up_settings.max_count).toBe(1);
      expect(application.follow_up_settings.follow_up_count).toBe(0);
      expect(application.follow_up_settings.timezone).toBe(schedulerConfig.timezone);
    });

    it('should validate follow-up settings', async () => {
      const invalidSettings: Partial<IFollowUpSettings> = {
        interval_days: 0,
        max_count: 0,
        follow_up_count: -1
      };

      const application = new JobApplication({
        user: new mongoose.Types.ObjectId(),
        recipient_email: 'test@example.com',
        company: 'Test Company',
        position: 'Test Position',
        subject: 'Test Subject',
        content: 'Test Content',
        follow_up_settings: invalidSettings
      });

      await expect(application.validate()).rejects.toThrow();
    });

    it('should validate next follow-up date is in future', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const application = new JobApplication({
        user: new mongoose.Types.ObjectId(),
        recipient_email: 'test@example.com',
        company: 'Test Company',
        position: 'Test Position',
        subject: 'Test Subject',
        content: 'Test Content',
        follow_up_settings: {
          next_follow_up_date: DateUtils.toUTCTimestamp(pastDate)
        }
      });

      await expect(application.validate()).rejects.toThrow('Next follow-up date must be in the future');
    });

    it('should calculate next follow-up date correctly', async () => {
      const application = await JobApplication.create({
        user: new mongoose.Types.ObjectId(),
        recipient_email: 'test@example.com',
        company: 'Test Company',
        position: 'Test Position',
        subject: 'Test Subject',
        content: 'Test Content',
        follow_up_settings: {
          interval_days: 5,
          timezone: 'America/New_York'
        }
      });

      const nextDate = application.follow_up_settings.calculateNextFollowUpDate();
      const expectedDate = DateUtils.calculateNextFollowUpDate(
        new Date(),
        5,
        'America/New_York'
      ).getTime();

      expect(nextDate).toBe(expectedDate);
    });
  });

  describe('Timestamps', () => {
    it('should set created_at and updated_at timestamps', async () => {
      const application = await JobApplication.create({
        user: new mongoose.Types.ObjectId(),
        recipient_email: 'test@example.com',
        company: 'Test Company',
        position: 'Test Position',
        subject: 'Test Subject',
        content: 'Test Content'
      });

      expect(application.created_at).toBeDefined();
      expect(application.updated_at).toBeDefined();
      expect(application.created_at).toBe(application.updated_at);
    });

    it('should update updated_at timestamp on save', async () => {
      const application = await JobApplication.create({
        user: new mongoose.Types.ObjectId(),
        recipient_email: 'test@example.com',
        company: 'Test Company',
        position: 'Test Position',
        subject: 'Test Subject',
        content: 'Test Content'
      });

      const originalUpdatedAt = application.updated_at;
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      application.company = 'Updated Company';
      await application.save();

      expect(application.updated_at).toBeGreaterThan(originalUpdatedAt);
    });
  });

  describe('Indexes', () => {
    it('should create indexes for efficient querying', async () => {
      const indexes = await JobApplication.collection.indexes();
      
      const indexNames = indexes.map(index => index.name);
      expect(indexNames).toContain('user_1_created_at_-1');
      expect(indexNames).toContain('user_1_updated_at_-1');
      expect(indexNames).toContain('user_1_sent_at_-1');
      expect(indexNames).toContain('follow_up_settings.next_follow_up_date_1');
    });
  });
}); 