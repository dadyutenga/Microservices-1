import { z } from 'zod'

const positiveInt = z.coerce.number().int().min(1)

export const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(6).max(32).optional(),
  password: z.string().min(8),
  name: z.string().max(128).optional()
})

export const loginSchema = z.object({
  emailOrPhone: z.string(),
  password: z.string().min(8)
})

export const otpSendSchema = z.object({
  destination: z.string().min(3),
  purpose: z.enum(['verify_email', 'verify_phone', 'login', 'recovery'])
})

export const otpVerifySchema = otpSendSchema.extend({
  code: z.string().length(6)
})

export const refreshSchema = z.object({
  refreshToken: z.string()
})

export const logoutSchema = z.object({
  refreshToken: z.string().optional()
})

export const mfaVerifySchema = z.object({
  method: z.enum(['totp', 'sms', 'email']),
  code: z.string().min(4)
})

export const recoveryRequestSchema = z.object({
  emailOrPhone: z.string()
})

export const recoveryConfirmSchema = z.object({
  emailOrPhone: z.string(),
  tokenOrOtp: z.string(),
  newPassword: z.string().min(8)
})

export const roleAssignSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'manager', 'user', 'service'])
})

export const roleUserParamsSchema = z.object({
  id: z.string().uuid()
})

export const analyticsSummaryQuerySchema = z.object({
  window: positiveInt.max(90).optional(),
  paymentsWindow: positiveInt.max(180).optional()
})

export const analyticsActivityQuerySchema = z.object({
  days: positiveInt.max(30).optional()
})

export default {
  registerSchema,
  loginSchema,
  otpSendSchema,
  otpVerifySchema,
  refreshSchema,
  logoutSchema,
  mfaVerifySchema,
  recoveryRequestSchema,
  recoveryConfirmSchema,
  roleAssignSchema,
  roleUserParamsSchema,
  analyticsSummaryQuerySchema,
  analyticsActivityQuerySchema
}
