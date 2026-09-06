import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Express middleware to validate request body against a Zod schema.
 * Returns HTTP 400 Bad Request with structured field errors on failure.
 */
export const validateRequestBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const error: ZodError = result.error;
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: formattedErrors,
      });
      return;
    }

    req.body = result.data;
    next();
  };
};
