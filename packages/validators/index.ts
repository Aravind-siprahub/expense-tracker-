import { z } from 'zod';

// ── Legacy starter demo schemas (still used by the starter mobile/api-client) ──
export const CreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});
export type CreateUser = z.infer<typeof CreateUserSchema>;

export const CreatePostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional(),
  authorId: z.number().int().positive('Author ID must be a positive integer'),
});
export type CreatePost = z.infer<typeof CreatePostSchema>;

export const UpdatePostSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  published: z.boolean().optional(),
});
export type UpdatePost = z.infer<typeof UpdatePostSchema>;

// ── Family Expense Tracker ──
// Money is always integer paise (₹1 = 100 paise).
const paise = z.number().int().positive().max(2_000_000_000);
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Rent & Housing',
  'Electricity & Bills',
  'Medical & Healthcare',
  'Entertainment',
  'Transport & Fuel',
  'Education',
  'Shopping',
  'Travel',
  'Insurance',
  'EMI & Loans',
  'Personal Expenses',
  'Others',
] as const;

export const PaymentMethodSchema =z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER']);
export const IncomeTypeSchema = z.enum(['SALARY', 'OTHER']);

export const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});
export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(128).optional(),
});

export const ForgotPasswordSchema = z.object({ email: z.string().trim().toLowerCase().email() });
export const ResetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().min(6).max(20),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const CreateFamilySchema = z.object({ name: z.string().trim().min(2).max(80) });
export const InviteSchema = z.object({ email: z.string().trim().toLowerCase().email() });
export const AcceptInviteSchema = z.object({ token: z.string().min(10) });

export const CreateCategorySchema = z.object({ name: z.string().trim().min(2).max(40) });

export const CreateExpenseSchema = z.object({
  amountPaise: paise,
  categoryId: z.string().min(1),
  date: day,
  paymentMethod: PaymentMethodSchema,
  note: z.string().trim().max(200).optional(),
});
export const UpdateExpenseSchema = CreateExpenseSchema.partial();

export const CreateIncomeSchema = z.object({
  // Family member who earned it; defaults to the person recording it.
  userId: z.string().min(1).optional(),
  type: IncomeTypeSchema,
  amountPaise: paise,
  month,
  note: z.string().trim().max(200).optional(),
});
export const UpdateIncomeSchema = CreateIncomeSchema.partial();

export const SaveBudgetSchema = z.object({
  month,
  totalPaise: z.number().int().min(0).max(2_000_000_000).optional(),
  categories: z
    .array(
      z.object({
        categoryId: z.string().min(1),
        amountPaise: z.number().int().min(0).max(2_000_000_000),
      }),
    )
    .max(100)
    .default([]),
});

export const MonthQuerySchema = z.object({ month });
export const ExpenseQuerySchema = z.object({
  month: month.optional(),
  from: day.optional(),
  to: day.optional(),
  categoryId: z.string().optional(),
  userId: z.string().optional(),
});
