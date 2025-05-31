import { DateUtils } from '../date.utils';
import { formatInTimeZone } from 'date-fns-tz';

describe('DateUtils', () => {
  const testTimezone = 'America/New_York';
  const testDate = new Date('2024-03-15T10:00:00Z'); // 10:00 UTC

  describe('fromUTCTimestamp', () => {
    it('should convert UTC timestamp to zoned date (compare local time)', () => {
      const zonedDate = DateUtils.fromUTCTimestamp(testDate.getTime(), testTimezone);
      // In New York, 10:00 UTC is 06:00 EDT (UTC-4)
      const expectedLocalTime = '2024-03-15 06:00:00';
      const actualLocalTime = formatInTimeZone(zonedDate, testTimezone, 'yyyy-MM-dd HH:mm:ss');
      expect(actualLocalTime).toBe(expectedLocalTime);
    });

    it('should throw error for invalid timestamp', () => {
      expect(() => DateUtils.fromUTCTimestamp(NaN, testTimezone)).toThrow('Invalid timestamp');
    });
  });

  describe('toTimezone', () => {
    it('should convert date to specified timezone (compare local time)', () => {
      const zonedDate = DateUtils.toTimezone(testDate, testTimezone);
      // In New York, 10:00 UTC is 06:00 EDT (UTC-4)
      const expectedLocalTime = '2024-03-15 06:00:00';
      const actualLocalTime = formatInTimeZone(zonedDate, testTimezone, 'yyyy-MM-dd HH:mm:ss');
      expect(actualLocalTime).toBe(expectedLocalTime);
    });

    it('should throw error for invalid date', () => {
      expect(() => DateUtils.toTimezone(new Date('invalid'), testTimezone)).toThrow('Invalid date');
    });
  });

  describe('toUTCTimestamp', () => {
    it('should convert date to UTC timestamp', () => {
      const timestamp = DateUtils.toUTCTimestamp(testDate);
      expect(timestamp).toBe(testDate.getTime());
    });

    it('should throw error for invalid date', () => {
      expect(() => DateUtils.toUTCTimestamp(new Date('invalid'))).toThrow('Invalid date');
    });
  });

  describe('toISOString', () => {
    it('should convert date to ISO string in specified timezone', () => {
      const isoString = DateUtils.toISOString(testDate, testTimezone);
      // In New York, 10:00 UTC is 06:00 EDT (UTC-4)
      expect(isoString).toBe('2024-03-15T06:00:00-04:00');
    });

    it('should throw error for invalid date', () => {
      expect(() => DateUtils.toISOString(new Date('invalid'), testTimezone)).toThrow('Invalid date');
    });
  });

  describe('isFutureDate', () => {
    it('should return true for future date', () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      expect(DateUtils.isFutureDate(futureDate, testTimezone)).toBe(true);
    });

    it('should return false for past date', () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      expect(DateUtils.isFutureDate(pastDate, testTimezone)).toBe(false);
    });

    it('should throw error for invalid date', () => {
      expect(() => DateUtils.isFutureDate(new Date('invalid'), testTimezone)).toThrow('Invalid date');
    });
  });

  describe('isPastDate', () => {
    it('should return true for past date', () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      expect(DateUtils.isPastDate(pastDate, testTimezone)).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      expect(DateUtils.isPastDate(futureDate, testTimezone)).toBe(false);
    });

    it('should throw error for invalid date', () => {
      expect(() => DateUtils.isPastDate(new Date('invalid'), testTimezone)).toThrow('Invalid date');
    });
  });

  describe('calculateNextFollowUpDate', () => {
    it('should calculate next follow-up date based on interval', () => {
      const baseDate = new Date('2024-03-15T10:00:00Z');
      const intervalDays = 7;
      const nextDate = DateUtils.calculateNextFollowUpDate(baseDate, intervalDays, testTimezone);
      // In New York, 10:00 UTC is 06:00 EDT (UTC-4)
      const expectedLocalTime = '2024-03-21 20:30:00';
      const actualLocalTime = formatInTimeZone(nextDate, testTimezone, 'yyyy-MM-dd HH:mm:ss');
      expect(actualLocalTime).toBe(expectedLocalTime);
    });

    it('should throw error for invalid date', () => {
      expect(() => DateUtils.calculateNextFollowUpDate(new Date('invalid'), 7, testTimezone)).toThrow('Invalid date');
    });

    it('should throw error for invalid interval', () => {
      expect(() => DateUtils.calculateNextFollowUpDate(testDate, -1, testTimezone)).toThrow('Invalid interval');
    });
  });
}); 