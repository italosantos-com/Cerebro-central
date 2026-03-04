import { verifyEmailTemplate, type VerifyEmailParams } from './verify-email';
import { resetPasswordTemplate, type ResetPasswordParams } from './reset-password';
import { emailChangedTemplate, type EmailChangedParams } from './email-changed';
import { mfaEnabledTemplate, type MfaEnabledParams } from './mfa-enabled';

export const emailTemplates = {
  verifyEmail: verifyEmailTemplate,
  resetPassword: resetPasswordTemplate,
  emailChanged: emailChangedTemplate,
  mfaEnabled: mfaEnabledTemplate
} as const;

export type EmailTemplateId = keyof typeof emailTemplates;

// Re-export types
export type {
  VerifyEmailParams,
  ResetPasswordParams,
  EmailChangedParams,
  MfaEnabledParams
};
