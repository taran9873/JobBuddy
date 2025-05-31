import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import FollowUp from '../follow-up.model';
import { DateUtils } from '../../utils/date.utils';
import { schedulerConfig } from '../../config/scheduler.config';

jest.setTimeout(30000);

let mongoServer: MongoMemoryServer;

describe('FollowUp Model', () => {
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
    await FollowUp.deleteMany({});
  });

  describe('Creation', () => {
    it('should create follow-up with default values', async () => {
      const followUp = await FollowUp.create({
        user: new mongoose.Types.ObjectId(),
        recipient_email: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test Content'
      });

      expect(followUp.status).toBe('sent');
      expect(followUp.follow_up_number).toBe(1);
      expect(followUp.timezone).toBe(schedulerConfig.timezone);
      expect(followUp.created_at).toBeDefined();
      expect(followUp.updated_at).toBeDefined();
      expect(followUp.sent_at).toBeNull();
    });

    it('should create follow-up with custom values', async () => {
      const userId = new mongoose.Types.ObjectId();
      const applicationId = new mongoose.Types.ObjectId();
      const sentAt = DateUtils.toUTCTimestamp(new Date());

      const followUp = await FollowUp.create({
        user: userId,
        recipient_email: 'test@example.com',
        company: 'Test Company',
        position: 'Test Position',
        subject: 'Test Subject',
        content: 'Test Content',
        original_application_id: applicationId,
        status: 'sent',
        follow_up_number: 2,
        sent_at: sentAt,
        timezone: 'America/New_York'
      });

      expect(followUp.user.toString()).toBe(userId.toString());
      expect(followUp.original_application_id?.toString()).toBe(applicationId.toString());
      expect(followUp.sent_at).toBe(sentAt);
      expect(followUp.timezone).toBe('America/New_York');
    });
  });

  describe('Date Validation', () => {
    it('should validate sent_at is in the past', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const followUp = new FollowUp({
        user: new mongoose.Types.ObjectId(),
        recipient_email: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test Content',
        sent_at: DateUtils.toUTCTimestamp(futureDate)
      });

      await expect(followUp.validate()).rejects.toThrow('Sent date must be in the past');
    });

    it('should accept valid sent_at date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const followUp = await FollowUp.create({
        user: new mongoose.Types.ObjectId(),
        recipient_email: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test Content',
        sent_at: DateUtils.toUTCTimestamp(pastDate)
      });

      expect(followUp.sent_at).toBeDefined();
    });
  });

  describe('getFormattedDates', () => {
    it('should return formatted dates', async () => {
      const followUp = await FollowUp.create({
        user: new mongoose.Types.ObjectId(),
        recipient_email: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test Content',
        sent_at: DateUtils.toUTCTimestamp(new Date())
      });

      const formattedDates = followUp.getFormattedDates();
      
      expect(formattedDates.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(formattedDates.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(formattedDates.sent_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should handle null sent_at', async () => {
      const followUp = await FollowUp.create({
        user: new mongoose.Types.ObjectId(),
        recipient_email: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test Content'
      });

      const formattedDates = followUp.getFormattedDates();
      
      expect(formattedDates.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(formattedDates.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(formattedDates.sent_at).toBeNull();
    });
  });

  describe('Indexes', () => {
    it('should create indexes for efficient querying', async () => {
      const indexes = await FollowUp.collection.indexes();
      
      const indexNames = indexes.map(index => index.name);
      expect(indexNames).toContain('user_1_original_application_id_1');
      expect(indexNames).toContain('user_1_created_at_-1');
      expect(indexNames).toContain('user_1_updated_at_-1');
      expect(indexNames).toContain('user_1_sent_at_-1');
    });
  });
}); 