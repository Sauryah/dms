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

export const bulkCreateSets = async (req: Request, res: Response, next: NextFunction) => {
  const { machineId, sets } = req.body as {
    machineId?: string | null;
    sets: Array<{ name: string; description?: string | null; dieIds?: string[] }>;
  };

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify target machine exists if machineId is supplied
      let machineName = '';
      if (machineId) {
        const machine = await tx.machine.findUnique({ where: { id: machineId } });
        if (!machine) {
          throw new Error(`Target Machine with ID "${machineId}" does not exist.`);
        }
        machineName = machine.name;
      }

      const createdSets = [];
      for (const setData of sets) {
        // 2. Validate duplicate set names inside transactional loop
        const existing = await tx.set.findUnique({ where: { name: setData.name } });
        if (existing) {
          throw new Error(`Toolset Name "${setData.name}" already exists in the system database.`);
        }

        // 3. Create the Set and connect relations
        const set = await tx.set.create({
          data: {
            name: setData.name,
            description: setData.description || null,
            machineId: machineId || null,
            dies: setData.dieIds ? {
              connect: setData.dieIds.map((id) => ({ id })),
            } : undefined,
          },
          include: {
            dies: true,
          },
        });
        createdSets.push(set);
      }

      return { createdSets, machineName };
    });

    // 4. Record single high-level operational log
    const user = (req as any).user;
    if (user) {
      const details = result.machineName
        ? `Bulk created and mounted ${result.createdSets.length} toolsets onto Machine "${result.machineName}"`
        : `Bulk created ${result.createdSets.length} unassigned toolsets`;
      await logAction(
        user.id,
        user.username,
        'BULK_CREATE_SETS',
        `${result.createdSets.length} Sets`,
        details,
        req
      );
    }

    res.status(201).json({
      success: true,
      count: result.createdSets.length,
      sets: result.createdSets,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Bulk set creation transaction failed.' });
  }
};

