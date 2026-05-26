import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Express middleware that validates the request body against a Zod schema.
 * If validation fails, it intercepts and returns a clean, detailed 400 response.
 */
export const validateBody = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((err) => {
          const field = err.path.join('.');
          return `${field ? field + ': ' : ''}${err.message}`;
        });
        return res.status(400).json({ error: errorMessages.join(', ') });
      }
      next(error);
    }
  };
};
