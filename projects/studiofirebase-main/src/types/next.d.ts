import { NextApiRequest } from 'next';
import { VerifyRecaptchaResult } from '@/lib/recaptcha-enterprise-server';

declare module 'next' {
  interface NextApiRequest {
    recaptcha?: VerifyRecaptchaResult;
  }
}
