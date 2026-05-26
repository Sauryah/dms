import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

/**
 * Performs a search across Machines, Sets, and Dies.
 * 
 * @concept Universal Search (GEMINI.md section 2)
 * Serves the frontend SearchPage.tsx search requests.
 * Integrates database range queries on dimensions via `sizeValue` fields.
 */
export const universalSearch = async (req: Request, res: Response, next: NextFunction) => {
  const { q, minSize, maxSize } = req.query;

  try {
    const queryStr = typeof q === 'string' ? q : '';
    const min = minSize ? parseFloat(minSize as string) : null;
    const max = maxSize ? parseFloat(maxSize as string) : null;

    // Base filters for machines and sets
    const machineFilter = queryStr ? {
      OR: [
        { name: { contains: queryStr } },
        { location: { contains: queryStr } },
      ],
    } : {};

    const setFilter = queryStr ? {
      OR: [
        { name: { contains: queryStr } },
        { description: { contains: queryStr } },
      ],
    } : {};

    // For dies, we use the query string filter if provided
    const dieFilter: any = queryStr ? {
      OR: [
        { dieId: { contains: queryStr } },
        { size: { contains: queryStr } },
        { casing: { contains: queryStr } },
        { details: { contains: queryStr } },
      ],
    } : {};

    // Fast indexed database-level numeric range boundaries
    if (min !== null || max !== null) {
      dieFilter.sizeValue = {};
      if (min !== null) {
        dieFilter.sizeValue.gte = min;
      }
      if (max !== null) {
        dieFilter.sizeValue.lte = max;
      }
    }

    const [machines, sets, allDies] = await Promise.all([
      prisma.machine.findMany({
        where: machineFilter,
        include: {
          sets: true,
        },
      }),
      prisma.set.findMany({
        where: setFilter,
        include: {
          machine: true,
        },
      }),
      prisma.die.findMany({
        where: dieFilter,
        include: {
          set: {
            include: {
              machine: true,
            },
          },
        },
      }),
    ]);

    res.json({
      machines: queryStr || (min === null && max === null) ? machines : [],
      sets: queryStr || (min === null && max === null) ? sets : [],
      dies: allDies, // Filtered natively by database!
    });
  } catch (error) {
    next(error);
  }
};
