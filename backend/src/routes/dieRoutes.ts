import { Router } from 'express';
import multer from 'multer';
import {
  getDies,
  getDieById,
  createDie,
  updateDie,
  deleteDie,
  importDies,
  getImportTemplate,
} from '../controllers/dieController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validationMiddleware';
import { createDieSchema, updateDieSchema } from '../lib/schemas';
import { importLimiter } from '../middleware/rateLimiter';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = new Set([
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]);
    const allowedExtensions = /\.(xlsx|xls)$/i;

    if (allowedMimeTypes.has(file.mimetype) || allowedExtensions.test(file.originalname)) {
      cb(null, true);
      return;
    }

    cb(new Error('Only .xlsx or .xls Excel files are allowed.'));
  },
});

// All die routes require authentication
router.use(authenticate);

router.get('/', getDies);
router.get('/import-template', getImportTemplate);
router.get('/:id', getDieById);

// Modifying routes require ADMIN role
router.post('/', authorize(['ADMIN']), validateBody(createDieSchema), createDie);
router.post('/import', authorize(['ADMIN']), importLimiter, upload.single('file'), importDies);
router.put('/:id', authorize(['ADMIN']), validateBody(updateDieSchema), updateDie);
router.delete('/:id', authorize(['ADMIN']), deleteDie);

export default router;
