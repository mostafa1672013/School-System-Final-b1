import { getAuditContext } from '../middleware/audit';

describe('AuditLog helpers', () => {
  it('getAuditContext extracts userId and ip from request', () => {
    const mockReq = {
      user: { userId: 'user-123', email: 'test@test.com' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Jest' },
    } as any;

    const ctx = getAuditContext(mockReq);
    expect(ctx.userId).toBe('user-123');
    expect(ctx.ip).toBe('127.0.0.1');
    expect(ctx.userAgent).toBe('Jest');
  });

  it('getAuditContext falls back to system when user missing', () => {
    const mockReq = { headers: {} } as any;
    const ctx = getAuditContext(mockReq);
    expect(ctx.userId).toBe('system');
    expect(ctx.userName).toBe('unknown');
  });

  it('getAuditContext uses email as userName fallback', () => {
    const mockReq = {
      user: { userId: 'u1', email: 'admin@school.eg' },
      headers: {},
    } as any;
    const ctx = getAuditContext(mockReq);
    expect(ctx.userName).toBe('admin@school.eg');
  });
});
