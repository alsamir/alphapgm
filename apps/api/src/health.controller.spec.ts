import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('should return status ok', () => {
      const result = controller.check();

      expect(result.status).toBe('ok');
    });

    it('should return a valid ISO timestamp', () => {
      const result = controller.check();

      expect(result.timestamp).toBeDefined();
      // Verify it is a valid ISO date string
      const parsed = new Date(result.timestamp);
      expect(parsed.toISOString()).toBe(result.timestamp);
    });

    it('should return uptime as a number', () => {
      const result = controller.check();

      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return an object with exactly three properties', () => {
      const result = controller.check();

      const keys = Object.keys(result);
      expect(keys).toHaveLength(3);
      expect(keys).toContain('status');
      expect(keys).toContain('timestamp');
      expect(keys).toContain('uptime');
    });

    it('should return a recent timestamp (within last second)', () => {
      const before = new Date();
      const result = controller.check();
      const after = new Date();

      const resultTime = new Date(result.timestamp).getTime();
      expect(resultTime).toBeGreaterThanOrEqual(before.getTime() - 1);
      expect(resultTime).toBeLessThanOrEqual(after.getTime() + 1);
    });

    it('should return consistent status across multiple calls', () => {
      const result1 = controller.check();
      const result2 = controller.check();

      expect(result1.status).toBe(result2.status);
      expect(result1.status).toBe('ok');
    });
  });
});
