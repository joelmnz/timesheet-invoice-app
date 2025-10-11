import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('CORS Middleware', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Development Mode', () => {
    it('should allow requests from localhost:5173', async () => {
      process.env.NODE_ENV = 'development';
      const app = createApp();
      
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:5173');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('should allow requests without Origin header when ALLOW_NO_ORIGIN_IN_DEV is true', async () => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOW_NO_ORIGIN_IN_DEV = 'true';
      const app = createApp();
      
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
    });
  });

  describe('Production Mode with ALLOWED_ORIGINS', () => {
    it('should allow requests from allowed origins', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://timesheet.example.com';
      process.env.SESSION_SECRET = 'test-secret-at-least-32-chars-long';
      const app = createApp();
      
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://app.example.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com');
    });

    it('should block requests from non-allowed origins', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.example.com';
      process.env.SESSION_SECRET = 'test-secret-at-least-32-chars-long';
      const app = createApp();
      
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://evil.com');

      expect(response.status).toBe(500);
      expect(response.text).toContain('Not allowed by CORS');
    });

    it('should block requests without Origin header by default', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.example.com';
      process.env.SESSION_SECRET = 'test-secret-at-least-32-chars-long';
      const app = createApp();
      
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(500);
      expect(response.text).toContain('(no origin header)');
    });

    it('should allow requests without Origin when ALLOW_NO_ORIGIN_IN_DEV is true', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.example.com';
      process.env.ALLOW_NO_ORIGIN_IN_DEV = 'true';
      process.env.SESSION_SECRET = 'test-secret-at-least-32-chars-long';
      const app = createApp();
      
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
    });
  });

  describe('Production Mode without ALLOWED_ORIGINS (same-origin)', () => {
    it('should allow all requests when CORS is disabled', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = '';
      process.env.SESSION_SECRET = 'test-secret-at-least-32-chars-long';
      const app = createApp();
      
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
    });
  });
});
