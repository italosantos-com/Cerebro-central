/**
 * Custom error class for API handlers
 * Based on stripe-connect-demo error handling pattern
 */
export class CustomError extends Error {
  public statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Creates a custom error with HTTP status code
 * @param statusCode - HTTP status code
 * @param message - Error message
 * @returns CustomError instance
 */
export const createError = (statusCode: number, message: string): CustomError => {
  return new CustomError(statusCode, message);
};

export default createError;
