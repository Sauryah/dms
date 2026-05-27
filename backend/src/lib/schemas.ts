import { z } from 'zod';

/**
 * Strict Input Validation Schemas for DieManager features using Zod
 */

export const createMachineSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Machine name must be at least 2 characters")
    .max(50, "Machine name cannot exceed 50 characters"),
  location: z
    .string()
    .trim()
    .min(2, "Location must be at least 2 characters")
    .max(100, "Location cannot exceed 100 characters"),
});

export const updateMachineSchema = createMachineSchema;

export const createSetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Set name must be at least 2 characters")
    .max(50, "Set name cannot exceed 50 characters"),
  description: z
    .string()
    .trim()
    .max(200, "Description cannot exceed 200 characters")
    .optional()
    .nullable(),
});

export const updateSetSchema = createSetSchema;

export const createDieSchema = z.object({
  dieId: z
    .string()
    .trim()
    .min(2, "Die ID must be at least 2 characters")
    .max(30, "Die ID cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9-_\s]+$/, "Die ID must only contain letters, numbers, spaces, hyphens, or underscores"),
  size: z
    .string()
    .trim()
    .min(1, "Size is required")
    .max(30, "Size cannot exceed 30 characters"),
  casing: z
    .string()
    .trim()
    .min(2, "Casing must be at least 2 characters")
    .max(50, "Casing cannot exceed 50 characters"),
  details: z
    .string()
    .trim()
    .max(200, "Details cannot exceed 200 characters")
    .optional()
    .nullable(),
});

export const updateDieSchema = createDieSchema;

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username cannot exceed 32 characters")
    .regex(/^[a-zA-Z0-9._-]+$/, "Username must only contain letters, numbers, dots, hyphens, or underscores"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password cannot exceed 128 characters"),
  role: z.enum(['ADMIN', 'OPERATOR', 'VIEWER']).default('VIEWER'),
  confirmPassword: z
    .string()
    .min(1, "Administrator password confirmation is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(128, "New password cannot exceed 128 characters"),
  confirmNewPassword: z
    .string()
    .min(1, "Confirm new password is required"),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords do not match",
  path: ["confirmNewPassword"],
});
