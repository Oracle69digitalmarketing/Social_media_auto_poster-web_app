// tests/routes/auth.test.js
const request = require('supertest');
const app = require('../../server');

describe('Auth Routes', () => {
  it('should return 400 for missing fields on register', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for missing credentials on login', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.statusCode).toBe(400);
  });
});
