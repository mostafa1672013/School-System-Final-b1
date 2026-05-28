/**
 * Performance instrumentation middleware.
 *
 * Logs any request taking longer than SLOW_REQUEST_MS so we can find
 * regressions before users notice them. Output is structured to be
 * grep-able and machine-readable.
 *
 * Cite: performance plan section 6.1
 */
import { Request, Response, NextFunction } from 'express';

const SLOW_REQUEST_MS = Number.parseInt(
  process.env.SLOW_REQUEST_MS ?? '1000',
  10,
);

export function perfLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
    if (ms > SLOW_REQUEST_MS) {
      // Skip query strings — they can contain PII or secrets.
      console.warn(
        JSON.stringify({
          level: 'warn',
          kind: 'slow_request',
          method: req.method,
          path: req.path,
          status: res.statusCode,
          ms: Math.round(ms),
          userId: (req as any).user?.userId,
        }),
      );
    }
  });

  next();
}
