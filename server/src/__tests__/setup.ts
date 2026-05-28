/**
 * Jest setup — runs before any test file imports app modules.
 * Sets env vars that are validated at module-load time so tests don't crash.
 */
// auth.test.ts hardcodes 'test-secret' for jwt.verify() — match that.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://test_user:test_password@localhost:5432/test_db';
