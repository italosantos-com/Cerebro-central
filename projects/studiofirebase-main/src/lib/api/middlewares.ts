// @ts-nocheck
import { CustomError } from './errors';
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

/**
 * Error handling middleware for Next.js API routes
 * Based on stripe-connect-demo pattern
 * 
 * @param fn - The API handler function to wrap
 * @returns Wrapped handler with error handling
 */
export const handleErrors = (fn: NextApiHandler) => async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  try {
    return await fn(req, res);
  } catch (err) {
    const statusCode = (err as CustomError).statusCode || 500;
    const message = (err as Error).message || 'Oops, something went wrong!';
    
    console.error('API Error:', {
      statusCode,
      message,
      url: req.url,
      method: req.method,
    });
    
    res.status(statusCode).json({ statusCode, message });
  }
};

export default handleErrors;
