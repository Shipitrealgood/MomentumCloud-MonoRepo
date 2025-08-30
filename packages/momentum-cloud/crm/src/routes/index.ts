import { Router } from 'express';
import accountRoutes from './accountRoutes.js';
import contactRoutes from './contactRoutes.js';
import carrierRoutes from './carrierRoutes.js';
import policyRoutes from './policyRoutes.js';
import enrollmentRoutes from './enrollmentRoutes.js';

const router = Router();

router.use('/accounts', accountRoutes);
router.use('/contacts', contactRoutes);
router.use('/carriers', carrierRoutes);
router.use('/policies', policyRoutes);
router.use('/enrollments', enrollmentRoutes);

export default router;
