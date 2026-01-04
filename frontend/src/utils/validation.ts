/**
 * Zod Validation Schemas
 * 
 * Form validation schemas using Zod.
 * Provides type-safe validation with French error messages.
 */

import { z } from 'zod';

/**
 * Custom error messages in French
 */
const errorMessages = {
  required: 'Ce champ est requis',
  email: 'Email invalide',
  minLength: (min: number) => `Minimum ${min} caractères`,
  maxLength: (max: number) => `Maximum ${max} caractères`,
  passwordMismatch: 'Les mots de passe ne correspondent pas',
  passwordStrength: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre',
  positiveNumber: 'Le montant doit être positif',
  invalidDate: 'Date invalide',
};

/**
 * Authentication Schemas
 */

// Login schema
export const loginSchema = z.object({
  email: z
    .string({ required_error: errorMessages.required })
    .email(errorMessages.email),
  password: z
    .string({ required_error: errorMessages.required })
    .min(1, errorMessages.required),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Register schema
export const registerSchema = z.object({
  email: z
    .string({ required_error: errorMessages.required })
    .email(errorMessages.email),
  first_name: z
    .string({ required_error: errorMessages.required })
    .min(1, errorMessages.required)
    .max(50, errorMessages.maxLength(50)),
  last_name: z
    .string({ required_error: errorMessages.required })
    .min(1, errorMessages.required)
    .max(50, errorMessages.maxLength(50)),
  password: z
    .string({ required_error: errorMessages.required })
    .min(8, errorMessages.minLength(8))
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      errorMessages.passwordStrength
    ),
  confirm_password: z
    .string({ required_error: errorMessages.required }),
}).refine((data) => data.password === data.confirm_password, {
  message: errorMessages.passwordMismatch,
  path: ['confirm_password'],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// Change password schema
export const changePasswordSchema = z.object({
  current_password: z
    .string({ required_error: errorMessages.required })
    .min(1, errorMessages.required),
  new_password: z
    .string({ required_error: errorMessages.required })
    .min(8, errorMessages.minLength(8))
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      errorMessages.passwordStrength
    ),
  confirm_new_password: z
    .string({ required_error: errorMessages.required }),
}).refine((data) => data.new_password === data.confirm_new_password, {
  message: errorMessages.passwordMismatch,
  path: ['confirm_new_password'],
});

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

/**
 * Transaction Schemas
 */

// Transaction type enum
export const transactionTypeSchema = z.enum(['income', 'expense']);

export const transactionCategorySchema = z.enum([
  'income',
  'salary',
  'gift',
  'rent',
  'utilities',
  'groceries',
  'restaurants',
  'transportation',
  'entertainment',
  'health',
  'education',
  'savings',
  'investments',
  'other',
]);

// Transaction schema
export const transactionSchema = z.object({
  label: z
    .string({ required_error: errorMessages.required })
    .min(1, errorMessages.required)
    .max(100, errorMessages.maxLength(100)),
  amount: z
    .number({ required_error: errorMessages.required })
    .positive(errorMessages.positiveNumber),
  type: transactionTypeSchema,
  category: transactionCategorySchema,
  date: z
    .date({ required_error: errorMessages.required })
    .or(z.string().min(1, errorMessages.required)),
  account_id: z
    .string({ required_error: errorMessages.required })
    .uuid('ID de compte invalide'),
  notes: z
    .string()
    .max(500, errorMessages.maxLength(500))
    .optional(),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;

/**
 * Recurring Transaction Schema
 */

export const frequencySchema = z.enum([
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
]);

export const recurringTransactionSchema = transactionSchema.extend({
  frequency: frequencySchema,
  next_date: z
    .date({ required_error: errorMessages.required })
    .or(z.string().min(1, errorMessages.required)),
  end_date: z
    .date()
    .or(z.string())
    .optional()
    .nullable(),
});

export type RecurringTransactionFormData = z.infer<typeof recurringTransactionSchema>;

/**
 * Profile Schemas
 */

// Update profile schema
export const updateProfileSchema = z.object({
  first_name: z
    .string({ required_error: errorMessages.required })
    .min(1, errorMessages.required)
    .max(50, errorMessages.maxLength(50)),
  last_name: z
    .string({ required_error: errorMessages.required })
    .min(1, errorMessages.required)
    .max(50, errorMessages.maxLength(50)),
  email: z
    .string({ required_error: errorMessages.required })
    .email(errorMessages.email),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

/**
 * Invitation Schema
 */

export const invitationSchema = z.object({
  invitee_email: z
    .string({ required_error: errorMessages.required })
    .email(errorMessages.email),
});

export type InvitationFormData = z.infer<typeof invitationSchema>;

/**
 * Goal Schema
 */

export const goalSchema = z.object({
  name: z
    .string({ required_error: errorMessages.required })
    .min(1, errorMessages.required)
    .max(100, errorMessages.maxLength(100)),
  target_amount: z
    .number({ required_error: errorMessages.required })
    .positive(errorMessages.positiveNumber),
  current_amount: z
    .number()
    .nonnegative('Le montant ne peut pas être négatif')
    .optional()
    .default(0),
  target_date: z
    .date()
    .or(z.string())
    .optional()
    .nullable(),
  description: z
    .string()
    .max(500, errorMessages.maxLength(500))
    .optional(),
});

export type GoalFormData = z.infer<typeof goalSchema>;

/**
 * Helper function to safely parse form data
 */
export function safeParseForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  // Convert Zod errors to { field: [error1, error2] } format
  const errors: Record<string, string[]> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(err.message);
  });
  
  return { success: false, errors };
}
