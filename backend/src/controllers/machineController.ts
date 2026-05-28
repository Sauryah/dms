import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { logAction } from '../lib/auditLogger';

/**
 * @swagger
 * components:
 *   schemas:
 *     Machine:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         location:
 *           type: string
 *       example:
 *         name: "Machine #101"
 *         location: "Floor A - Zone 1"
 */

/**
 * @swagger
 * tags:
 *   name: Machines
 *   description: Machine management API
 */

/**
 * @swagger
 * /api/machines:
 *   get:
 *     summary: Returns all machines
 *     tags: [Machines]
 *     responses:
 *       200:
 *         description: List of machines
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Machine'
 */
/**
 * @swagger
 * /api/machines/stats:
 *   get:
 *     summary: Returns inventory counts and attention queue aggregates
 *     tags: [Machines]
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 machines:
 *                   type: integer
 *                 sets:
 *                   type: integer
 *                 dies:
 *                   type: integer
 *                 unassignedSets:
 *                   type: integer
 *                 emptySets:
 *                   type: integer
 *                 unassignedDies:
 *                   type: integer
 *                 machinesWithoutSets:
 *                   type: integer
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      machinesCount,
      setsCount,
      diesCount,
      unassignedSetsCount,
      emptySetsCount,
      unassignedDiesCount,
      machinesWithoutSetsCount,
      machinesWithoutSetsPreview,
      unassignedSetsPreview,
      emptySetsPreview,
      unassignedDiesPreview
    ] = await Promise.all([
      prisma.machine.count(),
      prisma.set.count(),
      prisma.die.count(),
      prisma.set.count({ where: { machineId: null } }),
      prisma.set.count({ where: { dies: { none: {} } } }),
      prisma.die.count({ where: { setId: null } }),
      prisma.machine.count({ where: { sets: { none: {} } } }),
      prisma.machine.findMany({
        where: { sets: { none: {} } },
        select: { id: true, name: true },
        take: 5
      }),
      prisma.set.findMany({
        where: { machineId: null },
        select: { id: true, name: true },
        take: 5
      }),
      prisma.set.findMany({
        where: { dies: { none: {} } },
        select: { id: true, name: true },
        take: 5
      }),
      prisma.die.findMany({
        where: { setId: null },
        select: { id: true, dieId: true },
        take: 5
      })
    ]);

    res.json({
      machines: machinesCount,
      sets: setsCount,
      dies: diesCount,
      unassignedSets: unassignedSetsCount,
      emptySets: emptySetsCount,
      unassignedDies: unassignedDiesCount,
      machinesWithoutSets: machinesWithoutSetsCount,
      previews: {
        machinesWithoutSets: machinesWithoutSetsPreview,
        unassignedSets: unassignedSetsPreview,
        emptySets: emptySetsPreview,
        unassignedDies: unassignedDiesPreview
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMachines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const machines = await prisma.machine.findMany({
      include: {
        sets: {
          include: {
            dies: true,
          },
        },
      },
    });
    res.json(machines);
  } catch (error) {
    next(error);
  }
};

export const getMachineById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  try {
    const machine = await prisma.machine.findUnique({
      where: { id },
      include: {
        sets: {
          include: {
            dies: {
              orderBy: {
                sizeValue: 'desc'
              }
            },
          },
        },
      },
    });
    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    res.json(machine);
  } catch (error) {
    next(error);
  }
};

export const createMachine = async (req: Request, res: Response, next: NextFunction) => {
  const { name, location } = req.body;
  try {
    const machine = await prisma.machine.create({
      data: { name, location },
    });
    const user = (req as any).user;
    if (user) {
      await logAction(user.id, user.username, 'CREATE_MACHINE', machine.name, `Registered new machine "${machine.name}" at "${machine.location || 'Unknown'}"`, req);
    }
    res.status(201).json(machine);
  } catch (error) {
    next(error);
  }
};

export const updateMachine = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const { name, location } = req.body;
  try {
    const machine = await prisma.machine.update({
      where: { id },
      data: { name, location },
    });
    const user = (req as any).user;
    if (user) {
      await logAction(user.id, user.username, 'UPDATE_MACHINE', machine.name, `Updated machine "${machine.name}" metadata`, req);
    }
    res.json(machine);
  } catch (error) {
    next(error);
  }
};

export const deleteMachine = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  try {
    const existing = await prisma.machine.findUnique({ where: { id } });
    const machineName = existing ? existing.name : id;

    await prisma.machine.delete({
      where: { id },
    });
    const user = (req as any).user;
    if (user) {
      await logAction(user.id, user.username, 'DELETE_MACHINE', machineName, `Deleted machine "${machineName}"`, req);
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const assignSetToMachine = async (req: Request, res: Response, next: NextFunction) => {
  const { machineId, setId } = req.params as { machineId: string; setId: string };
  try {
    const [machineObj, setObj] = await Promise.all([
      prisma.machine.findUnique({ where: { id: machineId } }),
      prisma.set.findUnique({ where: { id: setId } }),
    ]);
    const machineName = machineObj ? machineObj.name : machineId;
    const setName = setObj ? setObj.name : setId;

    const machine = await prisma.machine.update({
      where: { id: machineId },
      data: {
        sets: {
          connect: { id: setId },
        },
      },
      include: {
        sets: {
          include: {
            dies: {
              orderBy: {
                sizeValue: 'desc'
              }
            },
          },
        },
      },
    });
    const user = (req as any).user;
    if (user) {
      await logAction(user.id, user.username, 'ASSIGN_SET', machineName, `Assigned Set "${setName}" to Machine "${machineName}"`, req);
    }
    res.json(machine);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves dynamic equipment utilization status and historical allocation logs.
 */
export const getMachineTimeline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Fetch active utilization layout: machines, sets, and their dies
    const machines = await prisma.machine.findMany({
      include: {
        sets: {
          include: {
            dies: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // 2. Fetch recent tooling allocation audit logs (mount/dismount/changes)
    const history = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['ASSIGN_SET', 'ASSIGN_DIE', 'CREATE_MACHINE', 'DELETE_MACHINE', 'CREATE_SET', 'DELETE_SET'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 30,
    });

    res.json({
      utilization: machines,
      history,
    });
  } catch (error) {
    next(error);
  }
};
