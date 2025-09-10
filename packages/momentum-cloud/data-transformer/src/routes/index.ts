import { Router } from 'express';
// Note the change to curly braces for a named import
import { templateRoutes } from './templateRoutes.js';
import { transformRoutes } from './transformRoutes.js';

const router = Router();

router.use('/templates', templateRoutes);
router.use('/transform', transformRoutes);

export default router;