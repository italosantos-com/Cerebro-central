import { NextRequest } from 'next/server';
import { z } from 'zod';
import { sendTemplateEmail } from '@/lib/emails/sendEmail';

// Schema Zod discriminado por "type"
const baseFields = {
  email: z.string().email(),
  displayName: z.string().min(1).optional(),
  link: z.string().url().optional(),
  appName: z.string().min(1).optional(),
  continueUrl: z.string().url().optional(),
  idToken: z.string().min(10).optional()
};

const verifyEmailSchema = z.object({
  type: z.literal('verify-email'),
  ...baseFields
});

const resetPasswordSchema = z.object({
  type: z.literal('reset-password'),
  ...baseFields
});

const recoverEmailSchema = z.object({
  type: z.literal('recover-email'),
  ...baseFields
});

const verifyAndChangeEmailSchema = z.object({
  type: z.literal('verify-and-change-email'),
  ...baseFields,
  newEmail: z.string().email()
});

const emailChangedSchema = z.object({
  type: z.literal('email-changed'),
  ...baseFields,
  newEmail: z.string().email()
});

const mfaEnabledSchema = z.object({
  type: z.literal('mfa-enabled'),
  ...baseFields,
  secondFactor: z.string().min(2)
});

const RequestSchema = z.discriminatedUnion('type', [
  verifyEmailSchema,
  resetPasswordSchema,
  recoverEmailSchema,
  verifyAndChangeEmailSchema,
  emailChangedSchema,
  mfaEnabledSchema
]);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = RequestSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Payload inválido',
          issues: parsed.error.issues.map(i => ({ path: i.path, message: i.message }))
        }),
        { status: 400 }
      );
    }

    const result = await sendTemplateEmail(parsed.data as any);
    return new Response(JSON.stringify({ success: Boolean((result as any)?.success ?? true), ...result }), { status: 200 });
  } catch (e: any) {
    console.error('[API] Erro ao enviar e-mail:', e);
    return new Response(JSON.stringify({ error: e.message || 'Erro interno' }), { status: 500 });
  }
}
