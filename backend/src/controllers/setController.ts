import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { logAction } from '../lib/auditLogger';

export const getSets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sets = await prisma.set.findMany({
      include: {
        dies: {
          orderBy: {
            sizeValue: 'desc'
          }
        },
        machine: true,
      },
    });
    res.json(sets);
  } catch (error) {
    next(error);
  }
};

export const getSetById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  try {
    const set = await prisma.set.findUnique({
      where: { id },
      include: {
        dies: {
          orderBy: {
            sizeValue: 'desc'
          }
        },
        machine: true,
      },
    });
    if (!set) {
      return res.status(404).json({ error: 'Set not found' });
    }
    res.json(set);
  } catch (error) {
    next(error);
  }
};

export const createSet = async (req: Request, res: Response, next: NextFunction) => {
  const { name, description } = req.body;
  try {
    const set = await prisma.set.create({
      data: { name, description },
    });
    const user = (req as any).user;
    if (user) {
      await logAction(user.id, user.username, 'CREATE_SET', set.name, `Created new toolset "${set.name}"`, req);
    }
    res.status(201).json(set);
  } catch (error) {
    next(error);
  }
};

export const updateSet = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const { name, description } = req.body;
  try {
    const set = await prisma.set.update({
      where: { id },
      data: { name, description },
    });
    const user = (req as any).user;
    if (user) {
      await logAction(user.id, user.username, 'UPDATE_SET', set.name, `Updated toolset "${set.name}" metadata`, req);
    }
    res.json(set);
  } catch (error) {
    next(error);
  }
};

export const deleteSet = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  try {
    const existing = await prisma.set.findUnique({ where: { id } });
    const setName = existing ? existing.name : id;

    await prisma.set.delete({
      where: { id },
    });
    const user = (req as any).user;
    if (user) {
      await logAction(user.id, user.username, 'DELETE_SET', setName, `Deleted toolset "${setName}"`, req);
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const assignDieToSet = async (req: Request, res: Response, next: NextFunction) => {
  const { setId, dieId } = req.params as { setId: string; dieId: string };
  try {
    const [setObj, dieObj] = await Promise.all([
      prisma.set.findUnique({ where: { id: setId } }),
      prisma.die.findUnique({ where: { id: dieId } }),
    ]);
    const setName = setObj ? setObj.name : setId;
    const dieName = dieObj ? `${dieObj.dieId} (${dieObj.size})` : dieId;

    const set = await prisma.set.update({
      where: { id: setId },
      data: {
        dies: {
          connect: { id: dieId },
        },
      },
      include: {
        dies: {
          orderBy: {
            sizeValue: 'desc'
          }
        }
      },
    });
    const user = (req as any).user;
    if (user) {
      await logAction(user.id, user.username, 'ASSIGN_DIE', setName, `Assigned Die "${dieName}" to Set "${setName}"`, req);
    }
    res.json(set);
  } catch (error) {
    next(error);
  }
};
