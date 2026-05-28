import request from 'supertest';
import { app } from '../index';

describe('Payment routes — security', () => {
  it('rejects unauthenticated request to GET /api/payments', async () => {
    const res = await request(app).get('/api/payments');
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated request to POST /api/payments', async () => {
    const res = await request(app)
      .post('/api/payments')
      .send({ amount: 1000, studentId: 'test', type: 'tuition', method: 'cash' });
    expect(res.status).toBe(401);
  });

  it('returns 401 with expired/invalid token', async () => {
    const res = await request(app)
      .get('/api/payments')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});

describe('Student routes — delete protection', () => {
  it('rejects unauthenticated student delete', async () => {
    const res = await request(app).delete('/api/students/some-id');
    expect(res.status).toBe(401);
  });
});

describe('Health check', () => {
  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
