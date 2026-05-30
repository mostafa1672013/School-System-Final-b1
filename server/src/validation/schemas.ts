import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ---- Auth Schemas ----
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required').max(128, 'Password too long'),
});

// ---- User Schemas ----
const RoleEnum = z.enum([
  'system_admin',
  'school_director',
  'head_accountant',
  'accountant',
  'warehouse_keeper',
  'bus_supervisor',
]);

export const PermissionSchema = z.object({
  resource: z.string(),
  canRead: z.boolean(),
  canWrite: z.boolean(),
  canDelete: z.boolean(),
});

export const CreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long'),
  role: RoleEnum,
  active: z.boolean().default(true),
  discountLimitPercent: z.number().min(0).max(100).default(0),
  permissions: z.array(PermissionSchema).optional(),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar: z.string().optional(),
  password: z.string().min(8).max(128).optional(),
  discountLimitPercent: z.number().min(0).max(100).optional(),
  active: z.boolean().optional(),
  role: RoleEnum.optional(),
  permissions: z.array(PermissionSchema).optional(),
}).strict();

// ---- Payment Schemas ----
export const CreatePaymentSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  amount: z.number().positive('Amount must be greater than 0'),
  type: z.enum(['tuition', 'books', 'uniform', 'bus', 'other']),
  method: z.enum(['cash', 'bank', 'wallet']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  receiptNumber: z.string().optional(),
  collectedBy: z.string().min(1),
  notes: z.string().max(500).optional(),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, 'Invalid academic year format (YYYY-YYYY)'),
  walletPhoneNumber: z.string().optional(),
  // userId is intentionally NOT in this schema — it comes from JWT
});

// ---- Expense Schemas ----
export const CreateExpenseSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  description: z.string().min(3, 'Description must be at least 3 characters').max(500, 'Description too long'),
  accountId: z.string().uuid('Invalid account ID'),
  paymentMethod: z.enum(['cash', 'bank']),
  notes: z.string().max(500).optional(),
  // requestedBy comes from JWT, NOT from body
  // role comes from JWT, NOT from body
});

export const ApproveExpenseSchema = z.object({
  // approvedBy comes from JWT
  notes: z.string().max(500).optional(),
});

// ---- Validation Middleware Factory ----
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten(),
      });
    }
    req.body = result.data; // replace with parsed/stripped data
    next();
  };
}
