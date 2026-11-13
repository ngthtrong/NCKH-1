import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from './KanbanPage';

describe('KanbanPage utils', () => {
  describe('formatRelativeTime', () => {
    it('formats recent times into friendly Vietnamese relative phrases', () => {
      const now = new Date();
      expect(formatRelativeTime(now.toISOString())).toBe('Vừa xong');

      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      expect(formatRelativeTime(tenMinutesAgo.toISOString())).toBe('10 phút trước');

      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo.toISOString())).toBe('2 giờ trước');

      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeDaysAgo.toISOString())).toBe('3 ngày trước');
    });
  });
});
