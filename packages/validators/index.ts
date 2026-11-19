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
// Join a family with EITHER the verification code (typed by the person) OR the long token from the email link.
export const AcceptInviteSchema = z
  .object({
    token: z.string().trim().min(10).max(100).optional(),
    code: z.string().trim().min(6).max(20).optional(),
  })
  .strict()
  .refine((v) => !!v.token !== !!v.code, { message: 'Enter the verification code from your invite email' });

export const CreateCategorySchema = z.object({ name: z.string().trim().min(2).max(40) });

export const CreateExpenseSchema = z.object({
  amountPaise: paise,
  categoryId: z.string().min(1),
  date: day,
  paymentMethod: PaymentMethodSchema,
  // Optional saved card / bank account. Only valid with CARD / BANK_TRANSFER; null clears it.
  paymentMethodId: z.string().min(1).max(64).nullable().optional(),
  note: z.string().trim().max(200).optional(),
});
export const UpdateExpenseSchema = CreateExpenseSchema.partial();

// ── Saved payment methods (cards and bank accounts) ──
// Only the last 4 digits of a card are ever accepted: a full card number, CVV or PIN is rejected
// because unknown fields are not allowed (.strict()).
const lastFour = z.string().trim().regex(/^\d{4}$/, 'Enter exactly the last 4 digits');
// Spaces and hyphens a person may type are removed before checking: 9 to 18 digits.
const accountNumber = z
  .string()
  .transform((s) => s.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^\d{9,18}$/, 'Account number must be 9 to 18 digits'));
const nickname = z.string().trim().min(2, 'Nickname must be at least 2 characters').max(40);

export const CreatePaymentMethodSchema = z
  .object({
    type: z.enum(['CARD', 'BANK']),
    nickname: nickname.optional(),
    cardType: z.enum(['CREDIT', 'DEBIT']).optional(),
    lastFour: lastFour.optional(),
    accountNumber: accountNumber.optional(),
    confirmAccountNumber: accountNumber.optional(),
    isDefault: z.boolean().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const need = (ok: boolean, path: string, message: string) => {
      if (!ok) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    };
    if (v.type === 'CARD') {
      need(!!v.nickname, 'nickname', 'Give the card a nickname, for example "HDFC Credit Card"');
      need(!!v.cardType, 'cardType', 'Choose Credit or Debit');
      need(!!v.lastFour, 'lastFour', 'Enter the last 4 digits');
      need(v.accountNumber === undefined && v.confirmAccountNumber === undefined, 'accountNumber', 'A card has no account number');
    } else {
      need(!!v.accountNumber, 'accountNumber', 'Enter the account number');
      need(!!v.confirmAccountNumber, 'confirmAccountNumber', 'Confirm the account number');
      need(v.accountNumber === v.confirmAccountNumber, 'confirmAccountNumber', 'Account numbers do not match');
      need(v.cardType === undefined && v.lastFour === undefined, 'cardType', 'A bank account has no card details');
    }
  });

export const UpdatePaymentMethodSchema = z
  .object({
    nickname: nickname.optional(),
    cardType: z.enum(['CREDIT', 'DEBIT']).optional(),
    lastFour: lastFour.optional(),
    accountNumber: accountNumber.optional(),
    confirmAccountNumber: accountNumber.optional(),
    isDefault: z.boolean().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.accountNumber !== undefined || v.confirmAccountNumber !== undefined) {
      if (v.accountNumber !== v.confirmAccountNumber) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmAccountNumber'], message: 'Account numbers do not match' });
      }
    }
  });

/** Revealing a stored account number needs the user's password again. */
export const RevealPaymentMethodSchema = z.object({ password: z.string().min(1).max(128) }).strict();

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
  paymentMethod: PaymentMethodSchema.optional(),
  q: z.string().trim().max(100).optional(),
  sortBy: z.enum(['date', 'amount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
