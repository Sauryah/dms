import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import * as xlsx from 'xlsx';
import { logAction } from '../lib/auditLogger';

/**
 * Helper utility to parse string dimensions (e.g. "12.5mm", "8") into raw floats.
 * 
 * @concept Rationale for Range Search (GEMINI.md section 2)
 * Required to enable native database numeric range filtering (min/max)
 * over string fields as mandated in the system specifications.
 */
export const parseSizeToFloat = (sizeStr: string): number => {
  const numericPart = sizeStr.match(/[\d\.]+/);
  if (numericPart) {
    const val = parseFloat(numericPart[0]);
    if (!isNaN(val)) return val;
  }
  return 0.0;
};

/**
 * Helper utility to format string dimensions to exactly 3 digits after the decimal point
 * (e.g. "1.6" -> "1.600", "10mm" -> "10.000mm", "12.5" -> "12.500")
 */
export const formatSizeString = (sizeStr: string): string => {
  const numericMatch = sizeStr.match(/[\d\.]+/);
  if (numericMatch) {
    const numVal = parseFloat(numericMatch[0]);
    if (!isNaN(numVal)) {
      const formattedNum = numVal.toFixed(3);
      return sizeStr.replace(numericMatch[0], formattedNum);
    }
  }
  return sizeStr;
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Die:
 *       type: object
 *       required:
 *         - dieId
 *         - size
 *         - casing
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the die
 *         dieId:
 *           type: string
 *           description: Unique identifier for the die (e.g. D-001)
 *         size:
 *           type: string
 *           description: Formatted size string (e.g. 10.000mm)
 *         sizeValue:
 *           type: number
 *           description: Numeric value of the size for range searching
 *         casing:
 *           type: string
 *           description: Material or type of casing
 *         details:
 *           type: string
 *           description: Additional notes about the die
 *         setId:
 *           type: string
 *           description: The id of the set this die belongs to
 *       example:
 *         dieId: "D-101"
 *         size: "12.500mm"
 *         sizeValue: 12.5
 *         casing: "Steel"
 *         details: "High precision die"
 */

/**
 * @swagger
 * tags:
 *   name: Dies
 *   description: Die management API
 */

/**
 * @swagger
 * /api/dies:
 *   get:
 *     summary: Returns the list of all dies with pagination, search, and filtering
 *     tags: [Dies]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default is 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records per page (default is 50)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query for dieId, size, casing, or details
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, assigned, unassigned]
 *         description: Filter by assignment status (default is all)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [dieId, size, casing]
 *         description: Sort field (default is dieId)
 *     responses:
 *       200:
 *         description: Paginated list of dies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dies:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Die'
 *                 totalCount:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 */
export const getDies = async (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;
  const search = req.query.search as string;
  const status = req.query.status as string; // 'all', 'assigned', 'unassigned'
  const sortBy = req.query.sortBy as string || 'dieId';

  try {
    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { dieId: { contains: search } },
        { size: { contains: search } },
        { casing: { contains: search } },
        { details: { contains: search } },
      ];
    }

    if (status === 'assigned') {
      whereClause.setId = { not: null };
    } else if (status === 'unassigned') {
      whereClause.setId = null;
    }

    const orderByClause: any = {};
    if (sortBy === 'size') {
      orderByClause.sizeValue = 'asc';
    } else if (sortBy === 'casing') {
      orderByClause.casing = 'asc';
    } else {
      orderByClause.dieId = 'asc';
    }

    const [dies, totalCount] = await Promise.all([
      prisma.die.findMany({
        where: whereClause,
        include: {
          set: {
            include: {
              machine: true,
            },
          },
        },
        orderBy: orderByClause,
        skip,
        take: limit,
      }),
      prisma.die.count({ where: whereClause }),
    ]);

    res.json({
      dies,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    next(error);
  }
};

export const getDieById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  try {
    const die = await prisma.die.findUnique({
      where: { id },
      include: {
        set: true,
      },
    });
    if (!die) {
      return res.status(404).json({ error: 'Die not found' });
    }
    res.json(die);
  } catch (error) {
    next(error);
  }
};

export const createDie = async (req: Request, res: Response, next: NextFunction) => {
  const { dieId, size, casing, details } = req.body;
  try {
    const formattedSize = formatSizeString(size);
    const sizeValue = parseSizeToFloat(formattedSize);
    const die = await prisma.die.create({
      data: { dieId, size: formattedSize, sizeValue, casing, details },
    });
    const user = (req as any).user;
    if (user) {
      await logAction(user.id, user.username, 'CREATE_DIE', die.dieId, `Registered new die "${die.dieId}" (Size: ${die.size}, Casing: ${die.casing})`, req);
    }
    res.status(201).json(die);
  } catch (error) {
    next(error);
  }
};

export const updateDie = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const { dieId, size, casing, details } = req.body;
  try {
    const formattedSize = formatSizeString(size);
    const sizeValue = parseSizeToFloat(formattedSize);
    const die = await prisma.die.update({
      where: { id },
      data: { dieId, size: formattedSize, sizeValue, casing, details },
    });
    const user = (req as any).user;
    if (user) {
      await logAction(user.id, user.username, 'UPDATE_DIE', die.dieId, `Updated die "${die.dieId}" metadata`, req);
    }
    res.json(die);
  } catch (error) {
    next(error);
  }
};

export const deleteDie = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  try {
    const existing = await prisma.die.findUnique({ where: { id } });
    const dieIdStr = existing ? existing.dieId : id;

    await prisma.die.delete({
      where: { id },
    });
    const user = (req as any).user;
    if (user) {
      await logAction(user.id, user.username, 'DELETE_DIE', dieIdStr, `Deleted die "${dieIdStr}"`, req);
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Imports multiple Die records from an uploaded Excel file (.xlsx or .xls).
 * 
 * @concept Excel Bulk Import (GEMINI.md section 2)
 * - Upserts die records matching unique "Die ID".
 * - Maps exact "Set Name" strings to existing database Sets.
 * - Optimized with single-query in-memory caching and prisma transaction batching.
 */
export const importDies = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet) as any[];

    if (data.length > 5000) {
      return res.status(400).json({ error: 'Import file is too large. Please limit imports to 5,000 rows or fewer.' });
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // 1. Pre-fetch all existing Sets to map setName -> id in-memory
    const allSets = await prisma.set.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    const setMap = new Map<string, string>();
    for (const set of allSets) {
      setMap.set(set.name.trim(), set.id);
    }

    const rowsToProcess: Array<{
      dieId: string;
      size: string;
      sizeValue: number;
      casing: string;
      details: string | null;
      setId: string | null;
    }> = [];

    const warnings: Array<{ row: number; dieId: string; reason: string }> = [];

    // 2. Parse and map spreadsheet rows in memory
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2; // Excel headers are row 1, data starts at row 2

      const dieId = row['Die ID']?.toString().trim();
      const size = row['Size']?.toString().trim();
      const casing = row['Casing']?.toString().trim();
      const details = row['Details']?.toString().trim() || null;
      const setName = row['Set Name']?.toString().trim();

      // Completely empty row, can be safely ignored
      if (!dieId && !size && !casing) {
        skipCount++;
        continue;
      }

      if (!dieId) {
        warnings.push({ row: rowIndex, dieId: 'Unknown', reason: 'Missing required "Die ID" column' });
        skipCount++;
        continue;
      }
      if (!size) {
        warnings.push({ row: rowIndex, dieId, reason: 'Missing required "Size" column' });
        skipCount++;
        continue;
      }
      if (!casing) {
        warnings.push({ row: rowIndex, dieId, reason: 'Missing required "Casing" column' });
        skipCount++;
        continue;
      }

      const formattedSize = formatSizeString(size);
      const sizeValue = parseSizeToFloat(formattedSize);
      
      if (sizeValue <= 0) {
        warnings.push({ row: rowIndex, dieId, reason: `Invalid size value "${size}" (could not parse dimensions)` });
        skipCount++;
        continue;
      }

      let setId: string | null = null;
      if (setName) {
        const matchedSetId = setMap.get(setName);
        if (matchedSetId) {
          setId = matchedSetId;
        } else {
          warnings.push({
            row: rowIndex,
            dieId,
            reason: `Set Name "${setName}" does not match any existing database set (imported as Unassigned)`
          });
        }
      }

      rowsToProcess.push({
        dieId,
        size: formattedSize,
        sizeValue,
        casing,
        details,
        setId,
      });
    }

    // 3. Map memory records to Prisma operations
    const operations = rowsToProcess.map(row => {
      const updateData: any = {
        size: row.size,
        sizeValue: row.sizeValue,
        casing: row.casing,
        details: row.details,
      };
      if (row.setId) {
        updateData.setId = row.setId;
      }

      return prisma.die.upsert({
        where: { dieId: row.dieId },
        update: updateData,
        create: {
          dieId: row.dieId,
          size: row.size,
          sizeValue: row.sizeValue,
          casing: row.casing,
          details: row.details,
          setId: row.setId,
        },
      });
    });

    // 4. Execute transaction with safe fallback to individual queries if a conflict occurs
    if (operations.length > 0) {
      try {
        await prisma.$transaction(operations);
        successCount = operations.length;
      } catch (transactionErr) {
        console.warn('Bulk import transaction failed. Falling back to individual processing:', transactionErr);
        for (const row of rowsToProcess) {
          try {
            const updateData: any = {
              size: row.size,
              sizeValue: row.sizeValue,
              casing: row.casing,
              details: row.details,
            };
            if (row.setId) {
              updateData.setId = row.setId;
            }

            await prisma.die.upsert({
              where: { dieId: row.dieId },
              update: updateData,
              create: {
                dieId: row.dieId,
                size: row.size,
                sizeValue: row.sizeValue,
                casing: row.casing,
                details: row.details,
                setId: row.setId,
              },
            });
            successCount++;
          } catch (individualErr) {
            console.error(`Error importing die ${row.dieId}:`, individualErr);
            errorCount++;
          }
        }
      }
    }

    const user = (req as any).user;
    if (user) {
      await logAction(
        user.id,
        user.username,
        'IMPORT_DIES',
        'Excel Ingest',
        `Bulk imported ${successCount} dies (skipped ${skipCount}, errors ${errorCount})`,
        req
      );
    }

    res.json({
      message: warnings.length > 0 ? 'Import completed with warnings' : 'Import completed successfully',
      successCount,
      skipCount,
      errorCount,
      warnings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generates and streams a sample pre-formatted Excel template (.xlsx) on-the-fly.
 * 
 * @concept Excel Bulk Import (GEMINI.md section 2)
 * Helps operators format their spreadsheets correctly to prevent ingest errors.
 */
export const getImportTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const headers = ['Die ID', 'Size', 'Casing', 'Details', 'Set Name'];
    const sampleData = [
      {
        'Die ID': 'D-101',
        'Size': '12.500mm',
        'Casing': 'Stainless Steel',
        'Details': 'High precision master die',
        'Set Name': 'Set A'
      },
      {
        'Die ID': 'D-102',
        'Size': '8.000',
        'Casing': 'Tungsten Carbide',
        'Details': 'Wear resistant die specifications',
        'Set Name': 'Set B'
      }
    ];

    const worksheet = xlsx.utils.json_to_sheet(sampleData, { header: headers });
    
    // Set explicit column widths for operator readability
    worksheet['!cols'] = [
      { wch: 15 }, // Die ID
      { wch: 15 }, // Size
      { wch: 20 }, // Casing
      { wch: 35 }, // Details
      { wch: 15 }  // Set Name
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Dies Import Template');

    // Generate buffer representing binary excel structure
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set Response Headers for binary Excel stream download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=diemanager_dies_import_template.xlsx');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
