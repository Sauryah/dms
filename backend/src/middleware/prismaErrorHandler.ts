import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export const prismaErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[]) || [];
        const fieldName = target.join(', ') || 'identifier';
        return res.status(400).json({
          error: `A resource with this ${fieldName} already exists.`
        });
      }
      case 'P2003': {
        return res.status(400).json({
          error: 'Database relation validation failed. One of the referenced keys does not exist.'
        });
      }
      case 'P2025': {
        return res.status(404).json({
          error: 'The requested database record was not found or could not be updated.'
        });
      }
      default: {
        return res.status(400).json({
          error: `Database error code ${err.code}: ${err.message}`
        });
      }
    }
  }

  // Pass along if not a known Prisma error
  next(err);
};
